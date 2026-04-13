import type { GlobalNotificationFailureQueueItemDto, GlobalNotificationFailureQueueResultDto } from '@np-manager/shared'
import { prisma } from '../../config/database'
import { resolveInternalNotificationRetryEligibility } from './porting-internal-notification-retry-eligibility.helper'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export type GlobalFailureQueueOutcomeFilter = 'FAILED' | 'MISCONFIGURED'
export type GlobalFailureQueueSort = 'newest' | 'retryAvailable'
export type GlobalFailureQueueOperationalStatus =
  | 'RETRY_AVAILABLE'
  | 'RETRY_BLOCKED_EXHAUSTED'
  | 'RETRY_BLOCKED_OTHER'
  | 'MANUAL_INTERVENTION_REQUIRED'

export interface GlobalNotificationFailureQueueParams {
  outcomes?: GlobalFailureQueueOutcomeFilter[]
  canRetry?: boolean
  operationalStatus?: GlobalFailureQueueOperationalStatus
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

  const baseWhere = buildWhereClause(outcomes, params.operationalStatus ? undefined : params.canRetry)
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

  if (params.operationalStatus) {
    const records = await prisma.internalNotificationDeliveryAttempt.findMany({
      where: baseWhere,
      orderBy: [{ createdAt: 'desc' }],
      select: dbSelect,
    })

    const filteredItems = records
      .map((record) => {
        const item = mapToDto(record)
        return {
          item,
          operationalStatus: resolveOperationalStatus(record, item),
        }
      })
      .filter((entry) => entry.operationalStatus === params.operationalStatus)
      .filter((entry) => params.canRetry === undefined || entry.item.canRetry === params.canRetry)

    return {
      items: filteredItems.slice(offset, offset + limit).map((entry) => entry.item),
      total: filteredItems.length,
    }
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
) {
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

function resolveOperationalStatus(
  record: FailureAttemptRecord,
  item: GlobalNotificationFailureQueueItemDto,
): GlobalFailureQueueOperationalStatus {
  if (
    record.outcome === 'MISCONFIGURED' ||
    record.failureKind === 'CONFIGURATION' ||
    record.failureKind === 'POLICY'
  ) {
    return 'MANUAL_INTERVENTION_REQUIRED'
  }

  if (item.canRetry) {
    return 'RETRY_AVAILABLE'
  }

  if (item.retryBlockedReasonCode === 'RETRY_LIMIT_REACHED') {
    return 'RETRY_BLOCKED_EXHAUSTED'
  }

  return 'RETRY_BLOCKED_OTHER'
}
