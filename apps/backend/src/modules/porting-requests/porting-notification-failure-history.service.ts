import type {
  NotificationFailureHistoryItemDto,
  NotificationFailureHistoryResultDto,
} from '@np-manager/shared'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import {
  detectNotificationFailureOutcome,
  NOTIFICATION_FAILURE_OUTCOMES,
  type NotificationFailureOutcome,
} from './porting-notification-health.helper'

const DISPATCH_TITLE_PREFIX = '[Dispatch] '
const DEFAULT_FAILURE_HISTORY_LIMIT = 20
const HARD_FAILURE_HISTORY_LIMIT = 50
const MAX_TECHNICAL_PREVIEW_LENGTH = 180

interface DispatchLineMapping {
  channel: NotificationFailureHistoryItemDto['channel']
  recipient: string | null
  outcome: string | null
  mode: string | null
  errorMessage: string | null
}

export async function getPortingRequestNotificationFailures(
  requestId: string,
  limit: number = DEFAULT_FAILURE_HISTORY_LIMIT,
): Promise<NotificationFailureHistoryResultDto> {
  const request = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: { id: true },
  })

  if (!request) {
    throw AppError.notFound('Sprawa portowania nie zostala znaleziona.')
  }

  const safeLimit = normalizeLimit(limit)

  const notes = await prisma.portingRequestEvent.findMany({
    where: {
      requestId,
      eventSource: 'INTERNAL',
      eventType: 'NOTE',
      title: { startsWith: DISPATCH_TITLE_PREFIX },
      OR: NOTIFICATION_FAILURE_OUTCOMES.map((outcome) => ({
        description: { contains: outcome },
      })),
    },
    orderBy: { occurredAt: 'desc' },
    select: {
      id: true,
      description: true,
      occurredAt: true,
    },
    take: safeLimit,
  })

  const items = notes
    .flatMap((note) => mapDispatchFailureNoteToItems(note))
    .sort((left, right) => {
      const leftTime = new Date(left.occurredAt).getTime()
      const rightTime = new Date(right.occurredAt).getTime()
      if (leftTime !== rightTime) {
        return rightTime - leftTime
      }
      return left.id.localeCompare(right.id)
    })
    .slice(0, safeLimit)

  return { items }
}

function mapDispatchFailureNoteToItems(note: {
  id: string
  description: string | null
  occurredAt: Date
}): NotificationFailureHistoryItemDto[] {
  const lines = (note.description ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return []
  }

  return lines.flatMap((line, index) => {
    const parsedLine = parseDispatchLine(line)
    const outcome =
      detectNotificationFailureOutcome(parsedLine.outcome) ?? detectNotificationFailureOutcome(line)

    if (!outcome) {
      return []
    }

    return [
      {
        id: `${note.id}-${index + 1}`,
        occurredAt: note.occurredAt.toISOString(),
        outcome,
        channel: parsedLine.channel,
        message: buildOperationalMessage(parsedLine, outcome),
        technicalDetailsPreview: buildTechnicalDetailsPreview(parsedLine, line),
        isConfigurationIssue: outcome === 'MISCONFIGURED',
        isDeliveryIssue: outcome === 'FAILED',
      } satisfies NotificationFailureHistoryItemDto,
    ]
  })
}

function parseDispatchLine(line: string): DispatchLineMapping {
  const baseMatch =
    /^([A-Z]+)\s*(?:->|[^\w\s]{1,4})\s*(.+?):\s*([A-Z_]+)\s*\(tryb:\s*([A-Z_]+)\)(.*)$/i.exec(
      line,
    ) ?? /^([A-Z]+)\s+(.+?):\s*([A-Z_]+)\s*\(tryb:\s*([A-Z_]+)\)(.*)$/i.exec(line)

  if (!baseMatch) {
    return {
      channel: 'UNKNOWN',
      recipient: null,
      outcome: null,
      mode: null,
      errorMessage: null,
    }
  }

  const channelRaw = baseMatch[1]?.trim().toUpperCase() ?? ''
  const channel: NotificationFailureHistoryItemDto['channel'] =
    channelRaw === 'EMAIL' ? 'EMAIL' : channelRaw === 'TEAMS' ? 'TEAMS' : 'UNKNOWN'

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

function buildOperationalMessage(
  line: DispatchLineMapping,
  outcome: NotificationFailureOutcome,
): string {
  const channelLabel =
    line.channel === 'EMAIL' ? 'e-mail' : line.channel === 'TEAMS' ? 'Teams' : 'nieznany kanal'
  const recipientPart = line.recipient ? ` do ${line.recipient}` : ''

  if (outcome === 'MISCONFIGURED') {
    return `Notyfikacja przez ${channelLabel}${recipientPart} nie zostala poprawnie skonfigurowana.`
  }

  return `Nie udalo sie wyslac notyfikacji przez ${channelLabel}${recipientPart}.`
}

function buildTechnicalDetailsPreview(line: DispatchLineMapping, sourceLine: string): string | null {
  const parts: string[] = []

  if (line.mode) {
    parts.push(`Tryb: ${line.mode}`)
  }
  if (line.errorMessage) {
    parts.push(line.errorMessage)
  }

  if (parts.length === 0 && line.channel === 'UNKNOWN') {
    parts.push(sourceLine)
  }

  if (parts.length === 0) {
    return null
  }

  return truncate(parts.join(' | '), MAX_TECHNICAL_PREVIEW_LENGTH)
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`
}

function normalizeLimit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_FAILURE_HISTORY_LIMIT
  }

  return Math.min(Math.floor(value), HARD_FAILURE_HISTORY_LIMIT)
}
