import {
  type PortingInternalNotificationHistoryItemDto,
  type PortingInternalNotificationHistoryResultDto,
} from '@np-manager/shared'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import {
  PORTING_NOTIFICATION_EVENT_LABELS,
  type PortingNotificationEvent,
} from './porting-notification-events'

const TEAM_ROUTING_TITLE_PREFIX = 'Powiadomienie zespolowe:'
const DISPATCH_TITLE_PREFIX = '[Dispatch] '
const ERROR_FALLBACK_TITLE_PREFIX = '[ErrorFallback] '

const INTERNAL_NOTIFICATION_ENTRY_TYPES = {
  USER_NOTIFICATION: 'USER_NOTIFICATION',
  TEAM_ROUTING: 'TEAM_ROUTING',
  TRANSPORT_AUDIT: 'TRANSPORT_AUDIT',
} as const satisfies Record<string, PortingInternalNotificationHistoryItemDto['entryType']>

const INTERNAL_NOTIFICATION_CHANNELS = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  TEAMS: 'TEAMS',
  UNKNOWN: 'UNKNOWN',
} as const satisfies Record<string, PortingInternalNotificationHistoryItemDto['channel']>

const EVENT_LABEL_TO_CODE = Object.entries(PORTING_NOTIFICATION_EVENT_LABELS).reduce<
  Record<string, PortingNotificationEvent>
>((acc, [eventCode, eventLabel]) => {
  acc[eventLabel] = eventCode as PortingNotificationEvent
  return acc
}, {})

interface DispatchLineMapping {
  channel: PortingInternalNotificationHistoryItemDto['channel']
  recipient: string | null
  outcome: string | null
  mode: string | null
  errorMessage: string | null
}

export async function getPortingRequestInternalNotifications(
  requestId: string,
): Promise<PortingInternalNotificationHistoryResultDto> {
  const request = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: { id: true },
  })

  if (!request) {
    throw AppError.notFound('Sprawa portowania nie zostala znaleziona.')
  }

  const [userNotifications, noteEvents] = await Promise.all([
    prisma.notification.findMany({
      where: {
        relatedEntityType: 'porting_request',
        relatedEntityId: requestId,
      },
      orderBy: { sentAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        sentAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.portingRequestEvent.findMany({
      where: {
        requestId,
        eventSource: 'INTERNAL',
        eventType: 'NOTE',
        OR: [
          { title: { startsWith: TEAM_ROUTING_TITLE_PREFIX } },
          { title: { startsWith: DISPATCH_TITLE_PREFIX } },
          { title: { startsWith: ERROR_FALLBACK_TITLE_PREFIX } },
        ],
      },
      orderBy: { occurredAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        occurredAt: true,
      },
    }),
  ])

  const items = [
    ...mapUserNotifications(userNotifications),
    ...mapNoteEvents(noteEvents),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return { items }
}

function mapUserNotifications(
  notifications: Array<{
    id: string
    type: string
    title: string
    body: string
    sentAt: Date
    user: { id: string; email: string; firstName: string; lastName: string }
  }>,
): PortingInternalNotificationHistoryItemDto[] {
  return notifications.map((row) => {
    const eventCode = toEventCode(row.type)

    return {
      id: row.id,
      entryType: INTERNAL_NOTIFICATION_ENTRY_TYPES.USER_NOTIFICATION,
      eventCode,
      eventLabel: toEventLabel(eventCode),
      channel: INTERNAL_NOTIFICATION_CHANNELS.IN_APP,
      recipient: formatRecipientDisplayName(row.user),
      outcome: 'CREATED',
      mode: null,
      message: row.body || row.title,
      errorMessage: null,
      createdAt: row.sentAt.toISOString(),
    }
  })
}

function mapNoteEvents(
  notes: Array<{
    id: string
    title: string
    description: string | null
    occurredAt: Date
  }>,
): PortingInternalNotificationHistoryItemDto[] {
  const items: PortingInternalNotificationHistoryItemDto[] = []

  for (const note of notes) {
    if (note.title.startsWith(TEAM_ROUTING_TITLE_PREFIX)) {
      items.push(mapTeamRoutingNote(note))
      continue
    }

    if (note.title.startsWith(DISPATCH_TITLE_PREFIX)) {
      items.push(...mapTransportAuditNote(note, DISPATCH_TITLE_PREFIX))
      continue
    }

    if (note.title.startsWith(ERROR_FALLBACK_TITLE_PREFIX)) {
      items.push(...mapTransportAuditNote(note, ERROR_FALLBACK_TITLE_PREFIX))
    }
  }

  return items
}

function mapTeamRoutingNote(note: {
  id: string
  title: string
  description: string | null
  occurredAt: Date
}): PortingInternalNotificationHistoryItemDto {
  const eventLabel = note.title.slice(TEAM_ROUTING_TITLE_PREFIX.length).trim() || 'Powiadomienie wewnetrzne'
  const eventCode = EVENT_LABEL_TO_CODE[eventLabel] ?? null
  const description = note.description ?? ''

  let channel: PortingInternalNotificationHistoryItemDto['channel'] =
    INTERNAL_NOTIFICATION_CHANNELS.UNKNOWN
  let recipient: string | null = null

  const emailMatch = /Routing do e-mail:\s*([^\n]+)/i.exec(description)
  if (emailMatch?.[1]) {
    channel = INTERNAL_NOTIFICATION_CHANNELS.EMAIL
    recipient = normalizeRoutingRecipient(emailMatch[1])
  }

  const teamsMatch = /Routing do Teams webhook:\s*([^\n]+)/i.exec(description)
  if (teamsMatch?.[1]) {
    channel = INTERNAL_NOTIFICATION_CHANNELS.TEAMS
    recipient = normalizeRoutingRecipient(teamsMatch[1])
  }

  return {
    id: note.id,
    entryType: INTERNAL_NOTIFICATION_ENTRY_TYPES.TEAM_ROUTING,
    eventCode,
    eventLabel,
    channel,
    recipient,
    outcome: 'ROUTED',
    mode: null,
    message: note.description ?? note.title,
    errorMessage: null,
    createdAt: note.occurredAt.toISOString(),
  }
}

function mapTransportAuditNote(
  note: {
    id: string
    title: string
    description: string | null
    occurredAt: Date
  },
  titlePrefix: string,
): PortingInternalNotificationHistoryItemDto[] {
  const eventLabel = note.title.slice(titlePrefix.length).trim() || 'Powiadomienie wewnetrzne'
  const eventCode = EVENT_LABEL_TO_CODE[eventLabel] ?? null
  const lines = (note.description ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return [
      {
        id: note.id,
        entryType: INTERNAL_NOTIFICATION_ENTRY_TYPES.TRANSPORT_AUDIT,
        eventCode,
        eventLabel,
        channel: INTERNAL_NOTIFICATION_CHANNELS.UNKNOWN,
        recipient: null,
        outcome: null,
        mode: null,
        message: note.title,
        errorMessage: null,
        createdAt: note.occurredAt.toISOString(),
      },
    ]
  }

  return lines.map((line, index) => {
    const parsed = parseDispatchLine(line)

    return {
      id: `${note.id}-${index + 1}`,
      entryType: INTERNAL_NOTIFICATION_ENTRY_TYPES.TRANSPORT_AUDIT,
      eventCode,
      eventLabel,
      channel: parsed.channel,
      recipient: parsed.recipient,
      outcome: parsed.outcome,
      mode: parsed.mode,
      message: line,
      errorMessage: parsed.errorMessage,
      createdAt: note.occurredAt.toISOString(),
    }
  })
}

function parseDispatchLine(line: string): DispatchLineMapping {
  const baseMatch =
    /^([A-Z]+)\s*(?:->|[^\w\s]{1,4})\s*(.+?):\s*([A-Z_]+)\s*\(tryb:\s*([A-Z_]+)\)(.*)$/i.exec(
      line,
    ) ?? /^([A-Z]+)\s+(.+?):\s*([A-Z_]+)\s*\(tryb:\s*([A-Z_]+)\)(.*)$/i.exec(line)

  if (!baseMatch) {
    return {
      channel: INTERNAL_NOTIFICATION_CHANNELS.UNKNOWN,
      recipient: null,
      outcome: null,
      mode: null,
      errorMessage: null,
    }
  }

  const channelRaw = baseMatch[1]?.toUpperCase() ?? ''
  const channel =
    channelRaw === INTERNAL_NOTIFICATION_CHANNELS.EMAIL
      ? INTERNAL_NOTIFICATION_CHANNELS.EMAIL
      : channelRaw === INTERNAL_NOTIFICATION_CHANNELS.TEAMS
        ? INTERNAL_NOTIFICATION_CHANNELS.TEAMS
        : INTERNAL_NOTIFICATION_CHANNELS.UNKNOWN

  const tail = baseMatch[5] ?? ''
  const errorMatch = /(?:blad|error)\s*:\s*(.+)$/i.exec(tail)

  return {
    channel,
    recipient: baseMatch[2]?.trim() || null,
    outcome: baseMatch[3]?.trim().toUpperCase() || null,
    mode: baseMatch[4]?.trim().toUpperCase() || null,
    errorMessage: errorMatch?.[1]?.trim() || null,
  }
}

function toEventCode(rawType: string): PortingNotificationEvent | null {
  if (rawType in PORTING_NOTIFICATION_EVENT_LABELS) {
    return rawType as PortingNotificationEvent
  }

  return null
}

function toEventLabel(eventCode: PortingNotificationEvent | null): string {
  if (!eventCode) {
    return 'Powiadomienie wewnetrzne'
  }

  return PORTING_NOTIFICATION_EVENT_LABELS[eventCode] ?? eventCode
}

function formatRecipientDisplayName(user: {
  email: string
  firstName: string
  lastName: string
}): string {
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return displayName ? `${displayName} (${user.email})` : user.email
}

function normalizeRoutingRecipient(rawValue: string): string {
  return rawValue
    .replace(/\s+Kontekst:\s*.+$/i, '')
    .replace(/\s*\.\s*$/, '')
    .trim()
}
