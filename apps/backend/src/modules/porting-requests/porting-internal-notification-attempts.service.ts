import type {
  Prisma,
} from '@prisma/client'
import type {
  InternalNotificationDeliveryAttemptDto,
  InternalNotificationDeliveryAttemptsResultDto,
  InternalNotificationRetryBlockedReasonCodeDto,
  RetryInternalNotificationAttemptDto,
  RetryInternalNotificationAttemptResultDto,
} from '@np-manager/shared'
import type { PortingNotificationEvent } from './porting-notification-events'
import { prisma } from '../../config/database'
import { logAuditEvent } from '../../shared/audit/audit.service'
import { AppError } from '../../shared/errors/app-error'
import {
  sendInternalEmail,
  sendInternalTeamsWebhook,
  type InternalNotificationDispatchResult,
  type InternalNotificationMode,
  type InternalNotificationOutcome,
} from './internal-notification.adapter'
import { formatInternalNotification } from './internal-notification-formatter'
import { PORTING_NOTIFICATION_EVENT_LABELS } from './porting-notification-events'
import { resolveInternalNotificationRetryEligibility } from './porting-internal-notification-retry-eligibility.helper'

const DEFAULT_ATTEMPTS_LIMIT = 50
const HARD_ATTEMPTS_LIMIT = 100

type RetrySourceAttemptRecord = NonNullable<Awaited<ReturnType<typeof findRetrySourceAttempt>>>

interface MappableAttemptRecord {
  id: string
  requestId: string
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

type RetryAttemptRecord = MappableAttemptRecord

export class InternalNotificationRetryConflictError extends AppError {
  public readonly retryBlockedReasonCode: InternalNotificationRetryBlockedReasonCodeDto

  constructor(retryBlockedReasonCode: InternalNotificationRetryBlockedReasonCodeDto) {
    super(
      'Wybrana proba dostarczenia nie kwalifikuje sie do ponowienia.',
      409,
      'INTERNAL_NOTIFICATION_RETRY_NOT_ELIGIBLE',
    )
    this.retryBlockedReasonCode = retryBlockedReasonCode
  }
}

export async function getPortingRequestInternalNotificationAttempts(
  requestId: string,
  limit: number = DEFAULT_ATTEMPTS_LIMIT,
): Promise<InternalNotificationDeliveryAttemptsResultDto> {
  const request = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: { id: true },
  })

  if (!request) {
    throw AppError.notFound('Sprawa portowania nie zostala znaleziona.')
  }

  const items = (await findInternalNotificationAttempts(requestId, normalizeLimit(limit))).map(
    mapAttemptToDto,
  )

  return {
    requestId,
    items,
  }
}

export async function retryInternalNotificationAttempt(
  requestId: string,
  attemptId: string,
  body: RetryInternalNotificationAttemptDto,
  currentUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<RetryInternalNotificationAttemptResultDto> {
  const sourceAttempt = await findRetrySourceAttempt(requestId, attemptId)

  if (!sourceAttempt) {
    throw AppError.notFound('Sprawa portowania lub proba dostarczenia nie zostala znaleziona.')
  }

  const sourceEligibility = resolveInternalNotificationRetryEligibility(sourceAttempt)
  if (!sourceEligibility.canRetry) {
    throw new InternalNotificationRetryConflictError(
      sourceEligibility.retryBlockedReasonCode ?? 'OUTCOME_NOT_RETRYABLE',
    )
  }

  const dispatchResult = await dispatchRetryTransport(sourceAttempt)

  const retryAttempt = await prisma.$transaction(async (tx) => {
    const latestSourceAttempt = await tx.internalNotificationDeliveryAttempt.findUnique({
      where: { id: sourceAttempt.id },
      select: retrySourceAttemptSelect,
    })

    if (!latestSourceAttempt || latestSourceAttempt.requestId !== requestId) {
      throw AppError.notFound('Sprawa portowania lub proba dostarczenia nie zostala znaleziona.')
    }

    const latestEligibility = resolveInternalNotificationRetryEligibility(latestSourceAttempt)
    if (!latestEligibility.canRetry) {
      throw new InternalNotificationRetryConflictError(
        latestEligibility.retryBlockedReasonCode ?? 'OUTCOME_NOT_RETRYABLE',
      )
    }

    const updateResult = await tx.internalNotificationDeliveryAttempt.updateMany({
      where: {
        id: latestSourceAttempt.id,
        requestId,
        isLatestForChain: true,
      },
      data: { isLatestForChain: false },
    })

    if (updateResult.count !== 1) {
      throw new InternalNotificationRetryConflictError('NOT_LATEST_IN_CHAIN')
    }

    const createdAttempt = await createRetryAttemptInTransaction(
      tx,
      latestSourceAttempt,
      dispatchResult,
      currentUserId,
    )

    await tx.portingRequestEvent.create({
      data: {
        request: { connect: { id: requestId } },
        eventSource: 'INTERNAL',
        eventType: 'NOTE',
        title: `[NotificationRetry] ${latestSourceAttempt.eventLabel}`,
        description: buildNotificationRetryAuditDescription({
          sourceAttempt: latestSourceAttempt,
          retryAttempt: createdAttempt,
          dispatchResult,
          reason: body.reason,
        }),
        createdBy: { connect: { id: currentUserId } },
      },
    })

    return createdAttempt
  })

  await logAuditEvent({
    action: 'UPDATE',
    userId: currentUserId,
    entityType: 'porting_request',
    entityId: requestId,
    requestId,
    fieldName: 'internalNotificationRetry',
    oldValue: sourceAttempt.id,
    newValue: retryAttempt.id,
    ipAddress,
    userAgent,
  })

  const sourceAttemptDto = mapAttemptToDto({
    ...sourceAttempt,
    isLatestForChain: false,
  })
  const retryAttemptDto = mapAttemptToDto(retryAttempt)
  const rootAttemptId = await resolveRetryRootAttemptId(sourceAttempt)

  return {
    sourceAttempt: sourceAttemptDto,
    retryAttempt: retryAttemptDto,
    chain: {
      rootAttemptId,
      latestAttemptId: retryAttempt.id,
      retryCount: retryAttempt.retryCount,
      latestOutcome: retryAttempt.outcome,
      isLatestSuccessful: retryAttempt.outcome === 'SENT' || retryAttempt.outcome === 'STUBBED',
    },
  }
}

function findInternalNotificationAttempts(requestId: string, limit: number) {
  return prisma.internalNotificationDeliveryAttempt.findMany({
    where: { requestId },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    take: limit,
    select: {
      id: true,
      requestId: true,
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
    },
  })
}

const retrySourceAttemptSelect = {
  id: true,
  requestId: true,
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
  request: {
    select: {
      caseNumber: true,
    },
  },
  createdAt: true,
} as const

function findRetrySourceAttempt(requestId: string, attemptId: string) {
  return prisma.internalNotificationDeliveryAttempt.findFirst({
    where: {
      id: attemptId,
      requestId,
    },
    select: retrySourceAttemptSelect,
  })
}

function mapAttemptToDto(
  attempt: MappableAttemptRecord,
): InternalNotificationDeliveryAttemptDto {
  return {
    id: attempt.id,
    requestId: attempt.requestId,
    eventCode: attempt.eventCode,
    eventLabel: attempt.eventLabel,
    attemptOrigin: attempt.attemptOrigin,
    channel: attempt.channel,
    recipient: attempt.recipient,
    mode: attempt.mode,
    outcome: attempt.outcome,
    errorCode: attempt.errorCode,
    errorMessage: attempt.errorMessage,
    failureKind: attempt.failureKind,
    retryOfAttemptId: attempt.retryOfAttemptId,
    retryCount: attempt.retryCount,
    isLatestForChain: attempt.isLatestForChain,
    triggeredByUserId: attempt.triggeredByUserId,
    triggeredByDisplayName: formatTriggeredByDisplayName(attempt.triggeredByUser),
    ...resolveInternalNotificationRetryEligibility(attempt),
    createdAt: attempt.createdAt.toISOString(),
  }
}

async function dispatchRetryTransport(
  sourceAttempt: RetrySourceAttemptRecord,
): Promise<InternalNotificationDispatchResult> {
  const event = parsePortingNotificationEvent(sourceAttempt.eventCode)
  const message = event
    ? formatInternalNotification(event, sourceAttempt.request.caseNumber)
    : {
        subject: `${sourceAttempt.eventLabel} - sprawa ${sourceAttempt.request.caseNumber}`,
        text: `Ponowienie wewnetrznej notyfikacji dla sprawy ${sourceAttempt.request.caseNumber}.`,
      }

  if (sourceAttempt.channel === 'EMAIL') {
    return sendInternalEmail({
      to: splitEmailRecipients(sourceAttempt.recipient),
      subject: message.subject,
      text: message.text,
    })
  }

  return sendInternalTeamsWebhook({
    webhookUrl: sourceAttempt.recipient,
    title: message.subject,
    text: message.text,
  })
}

function splitEmailRecipients(recipient: string): string[] {
  const recipients = recipient
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return recipients.length > 0 ? recipients : [recipient]
}

function parsePortingNotificationEvent(eventCode: string): PortingNotificationEvent | null {
  return Object.prototype.hasOwnProperty.call(PORTING_NOTIFICATION_EVENT_LABELS, eventCode)
    ? (eventCode as PortingNotificationEvent)
    : null
}

async function createRetryAttemptInTransaction(
  tx: Pick<Prisma.TransactionClient, 'internalNotificationDeliveryAttempt'>,
  sourceAttempt: RetrySourceAttemptRecord,
  dispatchResult: InternalNotificationDispatchResult,
  currentUserId: string,
): Promise<MappableAttemptRecord> {
  return tx.internalNotificationDeliveryAttempt.create({
    data: {
      request: { connect: { id: sourceAttempt.requestId } },
      eventCode: sourceAttempt.eventCode,
      eventLabel: sourceAttempt.eventLabel,
      attemptOrigin: 'RETRY',
      channel: dispatchResult.channel,
      recipient: dispatchResult.recipient,
      mode: mapAttemptMode(dispatchResult.mode),
      outcome: mapAttemptOutcome(dispatchResult.outcome),
      errorCode: mapAttemptErrorCode(dispatchResult.outcome),
      errorMessage: dispatchResult.errorMessage,
      failureKind: mapFailureKind(dispatchResult.outcome),
      retryOfAttempt: { connect: { id: sourceAttempt.id } },
      retryCount: sourceAttempt.retryCount + 1,
      isLatestForChain: true,
      triggeredByUser: { connect: { id: currentUserId } },
    },
    select: retryAttemptSelect,
  })
}

const retryAttemptSelect = {
  id: true,
  requestId: true,
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

function mapAttemptMode(mode: InternalNotificationMode): 'REAL' | 'STUB' | 'DISABLED' | 'POLICY' {
  if (mode === 'REAL') return 'REAL'
  if (mode === 'STUB') return 'STUB'
  if (mode === 'DISABLED') return 'DISABLED'
  return 'POLICY'
}

function mapAttemptOutcome(
  outcome: InternalNotificationOutcome,
): 'SENT' | 'STUBBED' | 'DISABLED' | 'MISCONFIGURED' | 'FAILED' | 'SKIPPED' {
  if (outcome === 'SENT') return 'SENT'
  if (outcome === 'STUBBED') return 'STUBBED'
  if (outcome === 'DISABLED') return 'DISABLED'
  if (outcome === 'MISCONFIGURED') return 'MISCONFIGURED'
  if (outcome === 'FAILED') return 'FAILED'
  return 'SKIPPED'
}

function mapFailureKind(
  outcome: InternalNotificationOutcome,
): 'DELIVERY' | 'CONFIGURATION' | 'POLICY' | null {
  if (outcome === 'FAILED') return 'DELIVERY'
  if (outcome === 'MISCONFIGURED') return 'CONFIGURATION'
  return null
}

function mapAttemptErrorCode(outcome: InternalNotificationOutcome): string | null {
  if (outcome === 'FAILED') return 'DELIVERY_FAILED'
  if (outcome === 'MISCONFIGURED') return 'TRANSPORT_MISCONFIGURED'
  return null
}

function buildNotificationRetryAuditDescription(params: {
  sourceAttempt: RetrySourceAttemptRecord
  retryAttempt: RetryAttemptRecord
  dispatchResult: InternalNotificationDispatchResult
  reason?: string
}): string {
  const base = `${params.dispatchResult.channel} -> ${params.dispatchResult.recipient}: ${params.dispatchResult.outcome} (tryb: ${params.dispatchResult.mode})`
  const retryContext = `sourceAttemptId=${params.sourceAttempt.id}; retryAttemptId=${params.retryAttempt.id}; retryCount=${params.retryAttempt.retryCount}`
  const reason = params.reason ? `; reason=${params.reason}` : ''

  if (params.dispatchResult.errorMessage) {
    return `${base} - blad: ${params.dispatchResult.errorMessage}; ${retryContext}${reason}`
  }

  if ('messageId' in params.dispatchResult && params.dispatchResult.messageId) {
    return `${base}, msgId: ${params.dispatchResult.messageId} - ${retryContext}${reason}`
  }

  return `${base} - ${retryContext}${reason}`
}

async function resolveRetryRootAttemptId(sourceAttempt: RetrySourceAttemptRecord): Promise<string> {
  let rootAttemptId = sourceAttempt.id
  let parentAttemptId = sourceAttempt.retryOfAttemptId
  const visitedAttemptIds = new Set<string>([sourceAttempt.id])

  while (parentAttemptId && !visitedAttemptIds.has(parentAttemptId)) {
    visitedAttemptIds.add(parentAttemptId)
    rootAttemptId = parentAttemptId

    const parent = await prisma.internalNotificationDeliveryAttempt.findUnique({
      where: { id: parentAttemptId },
      select: {
        id: true,
        retryOfAttemptId: true,
      },
    })

    parentAttemptId = parent?.retryOfAttemptId ?? null
  }

  return rootAttemptId
}

function formatTriggeredByDisplayName(
  user: { firstName: string; lastName: string; email: string } | null,
): string | null {
  if (!user) {
    return null
  }

  return `${user.firstName} ${user.lastName} (${user.email})`
}

function normalizeLimit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_ATTEMPTS_LIMIT
  }

  return Math.min(Math.floor(value), HARD_ATTEMPTS_LIMIT)
}
