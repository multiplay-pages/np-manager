import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import type {
  PliCbdIntegrationEventDto,
  PliCbdIntegrationEventsResultDto,
  PliCbdTransportMode,
  PliCbdTransportOutcome,
} from '@np-manager/shared'
import type {
  PliCbdTriggerRow,
  PortingRequestPliCbdAdapterResult,
} from './pli-cbd.adapter'

type IntegrationOperationType = 'EXPORT' | 'SYNC'
const PLI_CBD_TRANSPORT_MODES = new Set<PliCbdTransportMode>(['DISABLED', 'STUB', 'REAL_SOAP'])
const PLI_CBD_TRANSPORT_OUTCOMES = new Set<PliCbdTransportOutcome>([
  'ACCEPTED',
  'REJECTED',
  'TRANSPORT_ERROR',
  'STUBBED',
  'DISABLED',
  'NOT_IMPLEMENTED',
])

function isRecord(value: unknown): value is Record<string, Prisma.JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function extractTransportMode(value: Prisma.JsonValue | null): PliCbdTransportMode | null {
  if (!isRecord(value)) return null

  const transportMode = value.transportMode
  if (typeof transportMode === 'string' && PLI_CBD_TRANSPORT_MODES.has(transportMode as PliCbdTransportMode)) {
    return transportMode as PliCbdTransportMode
  }

  return null
}

function extractTransportMetadata(value: Prisma.JsonValue | null): {
  adapterName: string | null
  outcome: PliCbdTransportOutcome | null
} {
  if (!isRecord(value)) {
    return { adapterName: null, outcome: null }
  }

  const transport = value.transport
  if (!isRecord(transport)) {
    return { adapterName: null, outcome: null }
  }

  const adapterName = typeof transport.adapterName === 'string' ? transport.adapterName : null
  const outcome =
    typeof transport.outcome === 'string' &&
    PLI_CBD_TRANSPORT_OUTCOMES.has(transport.outcome as PliCbdTransportOutcome)
      ? (transport.outcome as PliCbdTransportOutcome)
      : null

  return { adapterName, outcome }
}

function toSerializableJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  return JSON.parse(
    JSON.stringify(value, (_key, nestedValue: unknown) => {
      if (nestedValue instanceof Date) {
        return nestedValue.toISOString()
      }

      return nestedValue
    }),
  ) as Prisma.InputJsonValue
}

function toIntegrationEventDto(row: {
  id: string
  portingRequestId: string
  operationType: 'EXPORT' | 'SYNC'
  operationStatus: 'PENDING' | 'SUCCESS' | 'ERROR'
  actionName: string | null
  requestPayloadJson: Prisma.JsonValue | null
  responsePayloadJson: Prisma.JsonValue | null
  errorMessage: string | null
  triggeredByUserId: string | null
  createdAt: Date
  completedAt: Date | null
  triggeredBy: { firstName: string; lastName: string } | null
}): PliCbdIntegrationEventDto {
  const transportMode = extractTransportMode(row.requestPayloadJson)
  const transportMetadata = extractTransportMetadata(row.responsePayloadJson)

  return {
    id: row.id,
    portingRequestId: row.portingRequestId,
    operationType: row.operationType,
    operationStatus: row.operationStatus,
    actionName: row.actionName,
    transportMode,
    transportAdapterName: transportMetadata.adapterName,
    transportOutcome: transportMetadata.outcome,
    requestPayloadJson: row.requestPayloadJson,
    responsePayloadJson: row.responsePayloadJson,
    errorMessage: row.errorMessage,
    triggeredByUserId: row.triggeredByUserId,
    triggeredByDisplayName: row.triggeredBy
      ? `${row.triggeredBy.firstName} ${row.triggeredBy.lastName}`
      : null,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  }
}

export async function withPliCbdIntegrationTracking(
  portingRequestId: string,
  triggeredByUserId: string | null,
  operationType: IntegrationOperationType,
  requestPayload: PliCbdTriggerRow,
  actionName: string,
  run: () => Promise<PortingRequestPliCbdAdapterResult>,
): Promise<PortingRequestPliCbdAdapterResult> {
  const integrationEvent = await prisma.pliCbdIntegrationEvent.create({
    data: {
      portingRequestId,
      operationType,
      operationStatus: 'PENDING',
      actionName,
      requestPayloadJson: toSerializableJsonValue(requestPayload),
      triggeredByUserId,
    },
    select: { id: true, createdAt: true },
  })

  try {
    const result = await run()

    await prisma.pliCbdIntegrationEvent.update({
      where: { id: integrationEvent.id },
      data: {
        operationStatus: 'SUCCESS',
        responsePayloadJson: toSerializableJsonValue(result),
        completedAt: new Date(),
      },
    })

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nieznany blad integracji PLI CBD.'

    await prisma.pliCbdIntegrationEvent.update({
      where: { id: integrationEvent.id },
      data: {
        operationStatus: 'ERROR',
        errorMessage: message,
        completedAt: new Date(),
      },
    })

    throw error
  }
}

export async function createFailedIntegrationAttempt(
  portingRequestId: string,
  triggeredByUserId: string | null,
  operationType: IntegrationOperationType,
  requestPayload: PliCbdTriggerRow,
  actionName: string,
  errorMessage: string,
): Promise<void> {
  await prisma.pliCbdIntegrationEvent.create({
    data: {
      portingRequestId,
      operationType,
      operationStatus: 'ERROR',
      actionName,
      requestPayloadJson: toSerializableJsonValue(requestPayload),
      errorMessage,
      triggeredByUserId,
      completedAt: new Date(),
    },
  })
}

export async function getPliCbdIntegrationEvents(
  portingRequestId: string,
): Promise<PliCbdIntegrationEventsResultDto> {
  const rows = await prisma.pliCbdIntegrationEvent.findMany({
    where: { portingRequestId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      portingRequestId: true,
      operationType: true,
      operationStatus: true,
      actionName: true,
      requestPayloadJson: true,
      responsePayloadJson: true,
      errorMessage: true,
      triggeredByUserId: true,
      createdAt: true,
      completedAt: true,
      triggeredBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  return {
    items: rows.map(toIntegrationEventDto),
  }
}
