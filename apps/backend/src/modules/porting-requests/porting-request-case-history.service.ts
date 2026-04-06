import type { Prisma, PrismaClient, UserRole } from '@prisma/client'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import type {
  PortingCaseStatus,
  PortingRequestCaseHistoryItemDto,
  PortingRequestCaseHistoryResultDto,
} from '@np-manager/shared'

type CaseHistoryDbClient = PrismaClient | Prisma.TransactionClient

interface CreateCaseHistoryEntryParams {
  requestId: string
  eventType: 'REQUEST_CREATED' | 'STATUS_CHANGED'
  statusBefore?: PortingCaseStatus | null
  statusAfter?: PortingCaseStatus | null
  reason?: string | null
  comment?: string | null
  actorUserId?: string | null
  metadata?: Prisma.InputJsonValue | null
}

const CASE_HISTORY_SELECT = {
  id: true,
  eventType: true,
  statusBefore: true,
  statusAfter: true,
  reason: true,
  comment: true,
  metadata: true,
  occurredAt: true,
  actor: {
    select: {
      firstName: true,
      lastName: true,
      role: true,
    },
  },
} as const

function formatActorDisplayName(actor: { firstName: string; lastName: string } | null): string | null {
  if (!actor) return null
  return `${actor.firstName} ${actor.lastName}`.trim()
}

function mapMetadata(
  metadata: Prisma.JsonValue | null,
): Record<string, string | number | boolean | null> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null
  }

  const entries = Object.entries(metadata as Record<string, Prisma.JsonValue>)
  const safeEntries = entries.filter(([, value]) => {
    return (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    )
  })

  return Object.fromEntries(safeEntries) as Record<string, string | number | boolean | null>
}

export function buildCaseHistoryCreateData(params: CreateCaseHistoryEntryParams): Prisma.PortingRequestCaseHistoryCreateInput {
  return {
    request: { connect: { id: params.requestId } },
    eventType: params.eventType,
    statusBefore: params.statusBefore ?? null,
    statusAfter: params.statusAfter ?? null,
    reason: params.reason ?? null,
    comment: params.comment ?? null,
    metadata: params.metadata ?? undefined,
    occurredAt: new Date(),
    actor: params.actorUserId ? { connect: { id: params.actorUserId } } : undefined,
  }
}

export async function createCaseHistoryEntry(
  db: CaseHistoryDbClient,
  params: CreateCaseHistoryEntryParams,
) {
  return db.portingRequestCaseHistory.create({
    data: buildCaseHistoryCreateData(params),
  })
}

export function mapCaseHistoryToDto(row: {
  id: string
  eventType: 'REQUEST_CREATED' | 'STATUS_CHANGED'
  statusBefore: PortingCaseStatus | null
  statusAfter: PortingCaseStatus | null
  reason: string | null
  comment: string | null
  metadata: Prisma.JsonValue | null
  occurredAt: Date
  actor: { firstName: string; lastName: string; role: UserRole } | null
}): PortingRequestCaseHistoryItemDto {
  return {
    id: row.id,
    eventType: row.eventType,
    timestamp: row.occurredAt.toISOString(),
    statusBefore: row.statusBefore,
    statusAfter: row.statusAfter,
    actorDisplayName: formatActorDisplayName(row.actor),
    actorRole: row.actor?.role ?? null,
    reason: row.reason,
    comment: row.comment,
    metadata: mapMetadata(row.metadata),
  }
}

export async function getPortingRequestCaseHistory(
  requestId: string,
): Promise<PortingRequestCaseHistoryResultDto> {
  const exists = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: { id: true },
  })

  if (!exists) {
    throw AppError.notFound('Sprawa portowania nie zostala znaleziona.')
  }

  const items = await prisma.portingRequestCaseHistory.findMany({
    where: { requestId },
    select: CASE_HISTORY_SELECT,
    orderBy: { occurredAt: 'desc' },
  })

  return {
    items: items.map((item) =>
      mapCaseHistoryToDto({
        ...item,
        eventType: item.eventType,
        statusBefore: item.statusBefore,
        statusAfter: item.statusAfter,
      }),
    ),
  }
}
