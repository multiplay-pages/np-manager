import type { GlobalNotificationFailureQueueItemDto, GlobalNotificationFailureQueueResultDto } from '@np-manager/shared'
import { prisma } from '../../config/database'
import { resolveInternalNotificationRetryEligibility } from './porting-internal-notification-retry-eligibility.helper'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export type GlobalFailureQueueOutcomeFilter = 'FAILED' | 'MISCONFIGURED'
export type GlobalFailureQueueSort = 'newest' | 'retryAvailable'
export type GlobalFailureQueueOperationalStatusFilter = 'MANUAL_INTERVENTION_REQUIRED'

export interface GlobalNotificationFailureQueueParams {
  outcomes?: GlobalFailureQueueOutcomeFilter[]
  canRetry?: boolean
  operationalStatus?: GlobalFailureQueueOperationalStatusFilter
  sort?: GlobalFailureQueueSort
  limit?: number
  offset?: number
}

type FailureAttemptRecord = {
  id: string
  requestId: string
  eventCode: string
  eventLabel: string
  attemptOrigin: 'PRIMARY' | 'ERROR_FALLBACK' | 'RETRY'
  channel: 'EMAIL' | 'TEAMS'
  recipient: string
  outcome: 'SENT' | 'STUBBED' | 'DISABLED' | 'MISCONFIGURED' | 'FAILED' | 'SKIPPED'
  failureKind: 'DELIVERY' | 'CONFIGURATION' | 'POLICY' | null
  retryCount: number
  isLatestForChain: boolean
  createdAt: Date
}

export async function getGlobalNotificationFailureQueue(
  params: GlobalNotificationFailureQueueParams = {},
): Promise<GlobalNotificationFailureQueueResultDto> {
  const outcomes = params.outcomes ?? ['FAILED', 'MISCONFIGURED']
  const sort = params.sort ?? 'newest'
  const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
  const offset = params.offset ?? 0

  const baseWhere = buildWhereClause(outcomes, params.canRetry, params.operationalStatus)
  const dbSelect = {
    id: true,
    requestId: true,
    eventCode: true,
    eventLabel: true,
    attemptOrigin: true,
    channel: true,
    recipient: true,
    outcome: true,
    failureKind: true,
    retryCount: true,
    isLatestForChain: true,
    createdAt: true,
  }

  if (sort === 'retryAvailable') {
    // canRetry is a computed field — sort in-memory after mapping to DTO
    const [allRecords, total] = await Promise.all([
      prisma.internalNotificationDeliveryAttempt.findMany({
        where: baseWhere,
        orderBy: [{ createdAt: 'desc' }],
        select: dbSelect,
      }),
      prisma.internalNotificationDeliveryAttempt.count({ where: baseWhere }),
    ])

    const items = allRecords
      .map(mapToDto)
      .sort((a, b) => {
        if (a.canRetry === b.canRetry) return 0
        return a.canRetry ? -1 : 1
      })
      .slice(offset, offset + limit)

    return { items, total }
  }

  const [records, total] = await Promise.all([
    prisma.internalNotificationDeliveryAttempt.findMany({
      where: baseWhere,
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      skip: offset,
      select: dbSelect,
    }),
    prisma.internalNotificationDeliveryAttempt.count({ where: baseWhere }),
  ])

  return {
    items: records.map(mapToDto),
    total,
  }
}

function buildWhereClause(
  outcomes: GlobalFailureQueueOutcomeFilter[],
  canRetry?: boolean,
  operationalStatus?: GlobalFailureQueueOperationalStatusFilter,
) {
  if (operationalStatus === 'MANUAL_INTERVENTION_REQUIRED') {
    // Returns records matching the v1 operational heuristic for manual intervention:
    // MISCONFIGURED outcome, or CONFIGURATION/POLICY failureKind.
    // Combination with canRetry not supported in v1 (these items are non-retryable by definition).
    return {
      isLatestForChain: true,
      OR: [
        { outcome: 'MISCONFIGURED' as const },
        { failureKind: { in: ['CONFIGURATION', 'POLICY'] as ('CONFIGURATION' | 'POLICY')[] } },
      ],
    }
  }

  const base = {
    isLatestForChain: true,
    outcome: { in: outcomes as ('FAILED' | 'MISCONFIGURED')[] },
  }

  if (canRetry === true) {
    return {
      ...base,
      attemptOrigin: { in: ['PRIMARY', 'RETRY'] as ('PRIMARY' | 'RETRY')[] },
      retryCount: { lt: 3 },
    }
  }

  if (canRetry === false) {
    return {
      ...base,
      OR: [
        { attemptOrigin: 'ERROR_FALLBACK' as const },
        { retryCount: { gte: 3 } },
      ],
    }
  }

  return base
}

function mapToDto(record: FailureAttemptRecord): GlobalNotificationFailureQueueItemDto {
  const { canRetry, retryBlockedReasonCode } = resolveInternalNotificationRetryEligibility(record)
  return {
    attemptId: record.id,
    requestId: record.requestId,
    eventCode: record.eventCode,
    eventLabel: record.eventLabel,
    attemptOrigin: record.attemptOrigin,
    channel: record.channel,
    recipient: record.recipient,
    outcome: record.outcome,
    failureKind: record.failureKind,
    retryCount: record.retryCount,
    canRetry,
    retryBlockedReasonCode,
    createdAt: record.createdAt.toISOString(),
  }
}
