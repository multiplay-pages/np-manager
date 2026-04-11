import type {
  InternalNotificationDeliveryAttemptDto,
  InternalNotificationDeliveryAttemptsResultDto,
} from '@np-manager/shared'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'

const DEFAULT_ATTEMPTS_LIMIT = 50
const HARD_ATTEMPTS_LIMIT = 100

type InternalNotificationAttemptRecord = Awaited<
  ReturnType<typeof findInternalNotificationAttempts>
>[number]

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

function mapAttemptToDto(
  attempt: InternalNotificationAttemptRecord,
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
    createdAt: attempt.createdAt.toISOString(),
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

function normalizeLimit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_ATTEMPTS_LIMIT
  }

  return Math.min(Math.floor(value), HARD_ATTEMPTS_LIMIT)
}
