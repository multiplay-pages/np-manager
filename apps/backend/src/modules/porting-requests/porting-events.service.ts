import type { Prisma, PortingEventSource, PortingEventType } from '@prisma/client'
import { prisma } from '../../config/database'
import type {
  PortingTimelineItemDto,
  PortingTimelineItemKind,
  PortingTimelineResultDto,
} from '@np-manager/shared'
import { PORTING_CASE_STATUS_LABELS } from '@np-manager/shared'

// ============================================================
// LOW-LEVEL CREATE
// ============================================================

interface CreatePortingEventParams {
  requestId: string
  eventSource: PortingEventSource
  eventType: PortingEventType
  title: string
  description?: string | null
  exxType?: string | null
  statusBefore?: string | null
  statusAfter?: string | null
  statusCode?: string | null
  technicalCode?: string | null
  payloadSummary?: string | null
  createdByUserId?: string | null
  occurredAt?: Date
}

export function createPortingEventData(params: CreatePortingEventParams): Prisma.PortingRequestEventCreateInput {
  return {
    request: { connect: { id: params.requestId } },
    eventSource: params.eventSource,
    eventType: params.eventType,
    title: params.title,
    description: params.description ?? null,
    exxType: params.exxType ?? null,
    statusBefore: params.statusBefore ?? null,
    statusAfter: params.statusAfter ?? null,
    statusCode: params.statusCode ?? null,
    technicalCode: params.technicalCode ?? null,
    payloadSummary: params.payloadSummary ?? null,
    createdBy: params.createdByUserId ? { connect: { id: params.createdByUserId } } : undefined,
    occurredAt: params.occurredAt ?? new Date(),
  }
}

export async function createPortingEvent(params: CreatePortingEventParams) {
  return prisma.portingRequestEvent.create({
    data: createPortingEventData(params),
  })
}

// ============================================================
// NAMED FACADE
// ============================================================

export const PortingEvents = {
  async requestCreated(requestId: string, caseNumber: string, userId: string) {
    return createPortingEvent({
      requestId,
      eventSource: 'INTERNAL',
      eventType: 'REQUEST_CREATED',
      title: `Utworzono sprawe ${caseNumber}`,
      description: 'Sprawa portowania zostala utworzona w systemie.',
      createdByUserId: userId,
    })
  },

  async exportTriggered(requestId: string, userId: string) {
    return createPortingEvent({
      requestId,
      eventSource: 'INTERNAL',
      eventType: 'PLI_EXPORT_TRIGGERED',
      title: 'Wyzwolono manualny eksport do PLI CBD',
      description: 'Uzytkownik zainicjowal eksport sprawy do PLI CBD (foundation adapter).',
      createdByUserId: userId,
    })
  },

  async exportStateUpdated(
    requestId: string,
    userId: string,
    exportStatus: string,
  ) {
    return createPortingEvent({
      requestId,
      eventSource: 'SYSTEM',
      eventType: 'PLI_EXPORT_STATE_UPDATED',
      title: 'Zaktualizowano stan eksportu PLI CBD',
      description: `Status eksportu: ${exportStatus}`,
      payloadSummary: `exportStatus=${exportStatus}`,
      createdByUserId: userId,
    })
  },

  async syncTriggered(requestId: string, userId: string) {
    return createPortingEvent({
      requestId,
      eventSource: 'INTERNAL',
      eventType: 'PLI_SYNC_TRIGGERED',
      title: 'Wyzwolono manualna synchronizacje z PLI CBD',
      description: 'Uzytkownik zainicjowal synchronizacje sprawy z PLI CBD (foundation adapter).',
      createdByUserId: userId,
    })
  },

  async syncStateUpdated(
    requestId: string,
    userId: string,
    syncAt: string,
  ) {
    return createPortingEvent({
      requestId,
      eventSource: 'SYSTEM',
      eventType: 'PLI_SYNC_STATE_UPDATED',
      title: 'Zaktualizowano stan synchronizacji PLI CBD',
      description: `Ostatnia synchronizacja: ${syncAt}`,
      payloadSummary: `pliCbdLastSyncAt=${syncAt}`,
      createdByUserId: userId,
    })
  },
}

// ============================================================
// TIMELINE QUERY & MAPPING
// ============================================================

const EVENT_SELECT = {
  id: true,
  eventSource: true,
  eventType: true,
  exxType: true,
  title: true,
  description: true,
  statusBefore: true,
  statusAfter: true,
  statusCode: true,
  occurredAt: true,
  createdBy: {
    select: { firstName: true, lastName: true },
  },
} as const

const CASE_HISTORY_SELECT = {
  id: true,
  eventType: true,
  occurredAt: true,
  reason: true,
  comment: true,
  statusBefore: true,
  statusAfter: true,
  actor: {
    select: { firstName: true, lastName: true },
  },
} as const

type EventRow = Awaited<ReturnType<typeof prisma.portingRequestEvent.findFirst>> & {
  createdBy: { firstName: string; lastName: string } | null
}

type CaseHistoryRow = {
  id: string
  eventType: 'REQUEST_CREATED' | 'STATUS_CHANGED'
  occurredAt: Date
  reason: string | null
  comment: string | null
  statusBefore: string | null
  statusAfter: string | null
  actor: { firstName: string; lastName: string } | null
}

function mapEventToTimelineItem(event: NonNullable<EventRow>): PortingTimelineItemDto {
  const kind: PortingTimelineItemKind =
    event.eventSource === 'PLI_CBD' ? 'PLI_EVENT' : 'SYSTEM_EVENT'
  const statusBefore =
    event.statusBefore
      ? ((PORTING_CASE_STATUS_LABELS as Record<string, string>)[event.statusBefore] ?? event.statusBefore)
      : null
  const statusAfter =
    event.statusAfter
      ? ((PORTING_CASE_STATUS_LABELS as Record<string, string>)[event.statusAfter] ?? event.statusAfter)
      : null

  return {
    id: event.id,
    kind,
    timestamp: event.occurredAt.toISOString(),
    title: event.title,
    description: event.description,
    badge: event.eventType === 'STATUS_CHANGED' ? event.statusAfter : event.eventType,
    statusBefore,
    statusAfter,
    exxType: event.exxType,
    statusCode: event.statusCode,
    authorDisplayName: event.createdBy
      ? `${event.createdBy.firstName} ${event.createdBy.lastName}`
      : null,
  }
}

function mapStatusHistoryToTimelineItem(
  entry: CaseHistoryRow,
): PortingTimelineItemDto {
  const statusBefore = entry.statusBefore
    ? ((PORTING_CASE_STATUS_LABELS as Record<string, string>)[entry.statusBefore] ?? entry.statusBefore)
    : null
  const statusAfter = entry.statusAfter
    ? ((PORTING_CASE_STATUS_LABELS as Record<string, string>)[entry.statusAfter] ?? entry.statusAfter)
    : null
  const descriptionParts = [entry.reason, entry.comment].filter(Boolean)

  return {
    id: entry.id,
    kind: 'STATUS',
    timestamp: entry.occurredAt.toISOString(),
    title:
      entry.eventType === 'REQUEST_CREATED'
        ? 'Utworzono sprawe'
        : `Zmiana statusu na: ${statusAfter ?? '-'}`,
    description: descriptionParts.length > 0 ? descriptionParts.join('\n') : null,
    badge: entry.statusAfter,
    statusBefore,
    statusAfter,
    exxType: null,
    statusCode: null,
    authorDisplayName: entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : null,
  }
}

export async function getPortingRequestTimeline(
  requestId: string,
): Promise<PortingTimelineResultDto> {
  const [events, caseHistory] = await Promise.all([
    prisma.portingRequestEvent.findMany({
      where: { requestId },
      select: EVENT_SELECT,
      orderBy: { occurredAt: 'asc' },
    }),
    prisma.portingRequestCaseHistory.findMany({
      where: { requestId },
      select: CASE_HISTORY_SELECT,
      orderBy: { occurredAt: 'asc' },
    }),
  ])

  const eventItems = events.map((e) => mapEventToTimelineItem(e as unknown as NonNullable<EventRow>))

  const statusItems: PortingTimelineItemDto[] = caseHistory.map((entry) =>
    mapStatusHistoryToTimelineItem(entry),
  )

  const allItems = [...eventItems, ...statusItems]
  allItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return { items: allItems }
}

// Exported for tests
export { mapEventToTimelineItem, mapStatusHistoryToTimelineItem }
