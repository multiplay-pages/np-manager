import type { Prisma } from '@prisma/client'
import type {
  GlobalInternalNotificationAttemptItemDto,
  GlobalInternalNotificationAttemptsQueryDto,
  GlobalInternalNotificationAttemptsResultDto,
  InternalNotificationAttemptOutcomeDto,
} from '@np-manager/shared'
import { prisma } from '../../config/database'
import { resolveInternalNotificationRetryEligibility } from './porting-internal-notification-retry-eligibility.helper'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export type GlobalInternalNotificationAttemptsParams = GlobalInternalNotificationAttemptsQueryDto

type GlobalAttemptRecord = {
  id: string
  requestId: string
  request: { caseNumber: string }
  eventCode: string
  eventLabel: string
  attemptOrigin: 'PRIMARY' | 'ERROR_FALLBACK' | 'RETRY'
  channel: 'EMAIL' | 'TEAMS'
  recipient: string
  mode: 'REAL' | 'STUB' | 'DISABLED' | 'POLICY'
  outcome: 'SENT' | 'STUBBED' | 'DISABLED' | 'MISCONFIGURED' | 'FAILED' | 'SKIPPED'
  errorCode: string | null
  errorMessage: string | null
  failureKind: 'DELIVERY' | 'CONFIGURATION' | 'POLICY' | null
  retryOfAttemptId: string | null
  retryCount: number
  isLatestForChain: boolean
  triggeredByUserId: string | null
  triggeredByUser: { firstName: string; lastName: string; email: string } | null
  createdAt: Date
}

const globalAttemptSelect = {
  id: true,
  requestId: true,
  request: {
    select: {
      caseNumber: true,
    },
  },
  eventCode: true,
  eventLabel: true,
  attemptOrigin: true,
  channel: true,
  recipient: true,
  mode: true,
  outcome: true,
  errorCode: true,
  errorMessage: true,
  failureKind: true,
  retryOfAttemptId: true,
  retryCount: true,
  isLatestForChain: true,
  triggeredByUserId: true,
  triggeredByUser: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  createdAt: true,
} as const

export async function getGlobalInternalNotificationAttempts(
  params: GlobalInternalNotificationAttemptsParams = {},
): Promise<GlobalInternalNotificationAttemptsResultDto> {
  const limit = normalizeLimit(params.limit)
  const offset = normalizeOffset(params.offset)
  const where = buildWhereClause(params)

  const [records, total] = await Promise.all([
    prisma.internalNotificationDeliveryAttempt.findMany({
      ...(where ? { where } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
      skip: offset,
      select: globalAttemptSelect,
    }),
    where
      ? prisma.internalNotificationDeliveryAttempt.count({ where })
      : prisma.internalNotificationDeliveryAttempt.count(),
  ])

  return {
    items: records.map(mapToDto),
    total,
  }
}

function buildWhereClause(
  params: GlobalInternalNotificationAttemptsParams,
): Prisma.InternalNotificationDeliveryAttemptWhereInput | undefined {
  const base: Prisma.InternalNotificationDeliveryAttemptWhereInput = {}

  if (params.outcome) {
    base.outcome = params.outcome
  }

  if (params.channel) {
    base.channel = params.channel
  }

  if (params.retryableOnly !== true) {
    return Object.keys(base).length > 0 ? base : undefined
  }

  const retryableWhere: Prisma.InternalNotificationDeliveryAttemptWhereInput = {
    attemptOrigin: { in: ['PRIMARY', 'RETRY'] },
    outcome: {
      in: ['FAILED', 'MISCONFIGURED'] satisfies InternalNotificationAttemptOutcomeDto[],
    },
    isLatestForChain: true,
    retryCount: { lt: 3 },
  }

  if (Object.keys(base).length === 0) {
    return retryableWhere
  }

  return {
    AND: [base, retryableWhere],
  }
}

function mapToDto(record: GlobalAttemptRecord): GlobalInternalNotificationAttemptItemDto {
  const { canRetry, retryBlockedReasonCode } = resolveInternalNotificationRetryEligibility(record)

  return {
    attemptId: record.id,
    requestId: record.requestId,
    caseNumber: record.request.caseNumber,
    eventCode: record.eventCode,
    eventLabel: record.eventLabel,
    attemptOrigin: record.attemptOrigin,
    channel: record.channel,
    recipient: record.recipient,
    mode: record.mode,
    outcome: record.outcome,
    errorCode: record.errorCode,
    errorMessage: record.errorMessage,
    failureKind: record.failureKind,
    retryOfAttemptId: record.retryOfAttemptId,
    retryCount: record.retryCount,
    isLatestForChain: record.isLatestForChain,
    triggeredByUserId: record.triggeredByUserId,
    triggeredByDisplayName: formatTriggeredByDisplayName(record.triggeredByUser),
    canRetry,
    retryBlockedReasonCode,
    createdAt: record.createdAt.toISOString(),
  }
}

function formatTriggeredByDisplayName(
  user: { firstName: string; lastName: string; email: string } | null,
): string | null {
  if (!user) {
    return null
  }

  return `${user.firstName} ${user.lastName} (${user.email})`
}

function normalizeLimit(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_LIMIT
  }

  return Math.min(Math.floor(value), MAX_LIMIT)
}

function normalizeOffset(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value < 0) {
    return 0
  }

  return Math.floor(value)
}
