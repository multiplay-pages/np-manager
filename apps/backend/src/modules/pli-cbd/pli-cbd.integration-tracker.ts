import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import type {
  PliCbdIntegrationEventDto,
  PliCbdIntegrationEventsResultDto,
} from '@np-manager/shared'
import type {
  PliCbdTriggerRow,
  PortingRequestPliCbdAdapterResult,
} from './pli-cbd.adapter'

type IntegrationOperationType = 'EXPORT' | 'SYNC'

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
  return {
    id: row.id,
    portingRequestId: row.portingRequestId,
    operationType: row.operationType,
    operationStatus: row.operationStatus,
    actionName: row.actionName,
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
