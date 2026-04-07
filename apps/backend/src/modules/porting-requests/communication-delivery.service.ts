import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import { logAuditEvent } from '../../shared/audit/audit.service'
import type {
  CommunicationDeliveryAttemptDto,
  CommunicationDeliveryAttemptsResultDto,
  PortingCommunicationDto,
  SendPortingCommunicationResultDto,
} from '@np-manager/shared'
import {
  resolveCommunicationDeliveryAdapter,
  type CommunicationDeliveryAdapter,
} from './communication-delivery.adapter'
import { mapCommunicationToDto } from './porting-request-communication.service'

// ============================================================
// SELECTS
// ============================================================

const DELIVERY_ATTEMPT_SELECT = {
  id: true,
  communicationId: true,
  attemptedAt: true,
  attemptedByUserId: true,
  channel: true,
  recipient: true,
  subjectSnapshot: true,
  bodySnapshot: true,
  outcome: true,
  transportMessageId: true,
  transportReference: true,
  errorCode: true,
  errorMessage: true,
  responsePayloadJson: true,
  adapterName: true,
  createdAt: true,
  attemptedBy: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} as const

type DeliveryAttemptRow = Prisma.CommunicationDeliveryAttemptGetPayload<{
  select: typeof DELIVERY_ATTEMPT_SELECT
}>

const COMMUNICATION_FULL_SELECT = {
  id: true,
  portingRequestId: true,
  type: true,
  status: true,
  triggerType: true,
  recipient: true,
  subject: true,
  body: true,
  templateKey: true,
  createdByUserId: true,
  sentAt: true,
  errorMessage: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      firstName: true,
      lastName: true,
      role: true,
    },
  },
} as const

// ============================================================
// MAPPERS
// ============================================================

function mapDeliveryAttemptToDto(row: DeliveryAttemptRow): CommunicationDeliveryAttemptDto {
  const displayName = row.attemptedBy
    ? [row.attemptedBy.firstName, row.attemptedBy.lastName].filter(Boolean).join(' ').trim()
    : null

  let responsePayloadJson: Record<string, unknown> | null = null

  if (row.responsePayloadJson && typeof row.responsePayloadJson === 'object' && !Array.isArray(row.responsePayloadJson)) {
    responsePayloadJson = row.responsePayloadJson as Record<string, unknown>
  }

  return {
    id: row.id,
    communicationId: row.communicationId,
    attemptedAt: row.attemptedAt.toISOString(),
    attemptedByUserId: row.attemptedByUserId,
    attemptedByDisplayName: displayName || null,
    channel: row.channel,
    recipient: row.recipient,
    subjectSnapshot: row.subjectSnapshot,
    bodySnapshot: row.bodySnapshot,
    outcome: row.outcome,
    transportMessageId: row.transportMessageId,
    transportReference: row.transportReference,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    responsePayloadJson,
    adapterName: row.adapterName,
  }
}

// ============================================================
// HELPERS
// ============================================================

async function getCommunicationForDeliveryOrThrow(params: {
  communicationId: string
  requestId: string
}) {
  const existing = await prisma.portingCommunication.findFirst({
    where: {
      id: params.communicationId,
      portingRequestId: params.requestId,
    },
    select: COMMUNICATION_FULL_SELECT,
  })

  if (!existing) {
    throw AppError.notFound('Komunikat nie zostal znaleziony dla wskazanej sprawy.')
  }

  return existing
}

// ============================================================
// SEND — wysylka komunikacji (DRAFT/READY_TO_SEND -> SENT/FAILED)
// ============================================================

export async function sendPortingCommunication(
  requestId: string,
  communicationId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  adapter?: CommunicationDeliveryAdapter,
): Promise<SendPortingCommunicationResultDto> {
  const existing = await getCommunicationForDeliveryOrThrow({ communicationId, requestId })

  if (existing.status === 'SENT') {
    throw AppError.conflict(
      'Ten komunikat jest juz oznaczony jako wyslany.',
      'PORTING_COMMUNICATION_ALREADY_SENT',
    )
  }

  if (existing.status === 'CANCELLED') {
    throw AppError.badRequest(
      'Nie mozna wyslac anulowanego komunikatu.',
      'PORTING_COMMUNICATION_CANCELLED',
    )
  }

  if (existing.status === 'SENDING') {
    throw AppError.conflict(
      'Wysylka tego komunikatu jest juz w toku.',
      'PORTING_COMMUNICATION_SENDING_IN_PROGRESS',
    )
  }

  if (existing.status !== 'DRAFT' && existing.status !== 'READY_TO_SEND') {
    throw AppError.badRequest(
      `Nie mozna wyslac komunikatu o statusie "${existing.status}". Wymagany status: DRAFT lub READY_TO_SEND.`,
      'PORTING_COMMUNICATION_INVALID_STATUS_FOR_SEND',
    )
  }

  // Przejscie do SENDING
  await prisma.portingCommunication.update({
    where: { id: communicationId },
    data: { status: 'SENDING', errorMessage: null },
  })

  const resolvedAdapter = adapter ?? resolveCommunicationDeliveryAdapter()

  let deliveryResult: Awaited<ReturnType<typeof resolvedAdapter.send>>

  try {
    deliveryResult = await resolvedAdapter.send({
      communicationId,
      channel: existing.type,
      recipient: existing.recipient,
      subject: existing.subject,
      body: existing.body,
    })
  } catch (err) {
    // Nieoczekiwany blad adaptera — zapis jako FAILED
    deliveryResult = {
      outcome: 'FAILED',
      adapterName: resolvedAdapter.name,
      transportMessageId: null,
      transportReference: null,
      errorCode: 'ADAPTER_EXCEPTION',
      errorMessage: err instanceof Error ? err.message : String(err),
      responsePayloadJson: null,
      respondedAt: new Date(),
    }
  }

  const isSuccess = deliveryResult.outcome === 'SUCCESS' || deliveryResult.outcome === 'STUBBED'
  const newStatus = isSuccess ? 'SENT' : 'FAILED'
  const sentAt = isSuccess ? deliveryResult.respondedAt : null

  // Transakcja: zaktualizuj status komunikacji + zapisz probe doreczenia
  const [updatedCommunication, deliveryAttempt] = await prisma.$transaction(async (tx) => {
    const comm = await tx.portingCommunication.update({
      where: { id: communicationId },
      data: {
        status: newStatus,
        sentAt,
        errorMessage: isSuccess ? null : deliveryResult.errorMessage,
      },
      select: COMMUNICATION_FULL_SELECT,
    })

    const attempt = await tx.communicationDeliveryAttempt.create({
      data: {
        communication: { connect: { id: communicationId } },
        attemptedBy: { connect: { id: userId } },
        channel: existing.type,
        recipient: existing.recipient,
        subjectSnapshot: existing.subject,
        bodySnapshot: existing.body,
        outcome: deliveryResult.outcome,
        transportMessageId: deliveryResult.transportMessageId,
        transportReference: deliveryResult.transportReference,
        errorCode: deliveryResult.errorCode,
        errorMessage: deliveryResult.errorMessage,
        responsePayloadJson:
          deliveryResult.responsePayloadJson !== null
            ? (deliveryResult.responsePayloadJson as unknown as Prisma.InputJsonObject)
            : undefined,
        adapterName: deliveryResult.adapterName,
      },
      select: DELIVERY_ATTEMPT_SELECT,
    })

    return [comm, attempt] as const
  })

  await logAuditEvent({
    action: 'UPDATE',
    userId,
    entityType: 'porting_communication',
    entityId: communicationId,
    requestId,
    oldValue: existing.status,
    newValue: newStatus,
    ipAddress,
    userAgent,
  })

  return {
    communication: mapCommunicationToDto(updatedCommunication),
    attempt: mapDeliveryAttemptToDto(deliveryAttempt),
  }
}

// ============================================================
// RETRY — ponow wysylke FAILED komunikatu
// ============================================================

export async function retryPortingCommunication(
  requestId: string,
  communicationId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  adapter?: CommunicationDeliveryAdapter,
): Promise<SendPortingCommunicationResultDto> {
  const existing = await getCommunicationForDeliveryOrThrow({ communicationId, requestId })

  if (existing.status !== 'FAILED') {
    throw AppError.badRequest(
      `Mozna ponowic tylko komunikaty ze statusem FAILED. Aktualny status: "${existing.status}".`,
      'PORTING_COMMUNICATION_RETRY_INVALID_STATUS',
    )
  }

  // Retry traktuje komunikat jak DRAFT przed wysylka
  await prisma.portingCommunication.update({
    where: { id: communicationId },
    data: { status: 'READY_TO_SEND', errorMessage: null },
  })

  return sendPortingCommunication(requestId, communicationId, userId, ipAddress, userAgent, adapter)
}

// ============================================================
// CANCEL — anuluj komunikat (DRAFT lub READY_TO_SEND)
// ============================================================

export async function cancelPortingCommunication(
  requestId: string,
  communicationId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<PortingCommunicationDto> {
  const existing = await getCommunicationForDeliveryOrThrow({ communicationId, requestId })

  if (existing.status === 'SENT') {
    throw AppError.conflict(
      'Nie mozna anulowac juz wyslanych komunikatow.',
      'PORTING_COMMUNICATION_ALREADY_SENT',
    )
  }

  if (existing.status === 'CANCELLED') {
    throw AppError.conflict(
      'Ten komunikat jest juz anulowany.',
      'PORTING_COMMUNICATION_ALREADY_CANCELLED',
    )
  }

  if (existing.status === 'SENDING') {
    throw AppError.conflict(
      'Nie mozna anulowac komunikatu w trakcie wysylki.',
      'PORTING_COMMUNICATION_SENDING_IN_PROGRESS',
    )
  }

  if (existing.status !== 'DRAFT' && existing.status !== 'READY_TO_SEND') {
    throw AppError.badRequest(
      `Nie mozna anulowac komunikatu o statusie "${existing.status}".`,
      'PORTING_COMMUNICATION_CANCEL_INVALID_STATUS',
    )
  }

  const updated = await prisma.portingCommunication.update({
    where: { id: communicationId },
    data: { status: 'CANCELLED' },
    select: COMMUNICATION_FULL_SELECT,
  })

  await logAuditEvent({
    action: 'UPDATE',
    userId,
    entityType: 'porting_communication',
    entityId: communicationId,
    requestId,
    oldValue: existing.status,
    newValue: 'CANCELLED',
    ipAddress,
    userAgent,
  })

  return mapCommunicationToDto(updated)
}

// ============================================================
// GET DELIVERY ATTEMPTS — historia prob doreczenia
// ============================================================

export async function getPortingCommunicationDeliveryAttempts(
  requestId: string,
  communicationId: string,
): Promise<CommunicationDeliveryAttemptsResultDto> {
  // Weryfikacja, ze komunikat nalezy do sprawy
  const communication = await prisma.portingCommunication.findFirst({
    where: {
      id: communicationId,
      portingRequestId: requestId,
    },
    select: { id: true },
  })

  if (!communication) {
    throw AppError.notFound('Komunikat nie zostal znaleziony dla wskazanej sprawy.')
  }

  const attempts = await prisma.communicationDeliveryAttempt.findMany({
    where: { communicationId },
    select: DELIVERY_ATTEMPT_SELECT,
    orderBy: [{ attemptedAt: 'desc' }, { id: 'desc' }],
  })

  return {
    communicationId,
    attempts: attempts.map(mapDeliveryAttemptToDto),
  }
}
