/**
 * Foundation internal notification dispatcher for porting requests.
 *
 * Responsibilities:
 * - resolve recipients (commercial owner or team fallback),
 * - persist Notification for named user recipients,
 * - persist timeline note for shared recipients,
 * - build event-specific notification copy.
 */

import { prisma } from '../../config/database'
import {
  PORTING_NOTIFICATION_EVENT_LABELS,
  type PortingNotificationEvent,
} from './porting-notification-events'
import { resolvePortingNotificationRecipients } from './porting-notification-recipient-resolver'

export interface DispatchPortingNotificationParams {
  requestId: string
  caseNumber: string
  event: PortingNotificationEvent
  commercialOwnerUserId: string | null | undefined
  actorUserId?: string
  metadata?: Record<string, unknown>
}

/**
 * Non-blocking by design. Callers should use `.catch(() => {})`.
 */
export async function dispatchPortingNotification(
  params: DispatchPortingNotificationParams,
): Promise<void> {
  const { requestId, caseNumber, event, commercialOwnerUserId, actorUserId, metadata } = params

  const recipients = await resolvePortingNotificationRecipients(commercialOwnerUserId)
  if (recipients.length === 0) {
    return
  }

  const eventLabel = PORTING_NOTIFICATION_EVENT_LABELS[event]
  const title = `${eventLabel} - sprawa ${caseNumber}`
  const body = buildNotificationBody(event, metadata)

  for (const recipient of recipients) {
    if (recipient.kind === 'USER') {
      await prisma.notification.create({
        data: {
          userId: recipient.userId,
          type: event,
          title,
          body,
          relatedEntityType: 'porting_request',
          relatedEntityId: requestId,
        },
      })
      continue
    }

    await prisma.portingRequestEvent.create({
      data: {
        request: { connect: { id: requestId } },
        eventSource: 'INTERNAL',
        eventType: 'NOTE',
        title: `Powiadomienie zespolowe: ${eventLabel}`,
        description: buildFallbackDescription(recipient, metadata),
        ...(actorUserId ? { createdBy: { connect: { id: actorUserId } } } : {}),
      },
    })
  }
}

function buildFallbackDescription(
  recipient: { kind: 'TEAM_EMAIL'; emails: string[] } | { kind: 'TEAM_WEBHOOK'; webhookUrl: string },
  metadata?: Record<string, unknown>,
): string {
  const destination =
    recipient.kind === 'TEAM_EMAIL'
      ? `Routing do e-mail: ${recipient.emails.join(', ')}.`
      : `Routing do Teams webhook: ${recipient.webhookUrl}.`

  const metadataText = metadata ? ` Kontekst: ${safeJson(metadata)}.` : ''
  return `${destination}${metadataText}`.trim()
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return '"[unserializable metadata]"'
  }
}

function buildNotificationBody(
  event: PortingNotificationEvent,
  metadata?: Record<string, unknown>,
): string {
  if (event === 'REQUEST_CREATED') {
    return 'Sprawa portowania zostala zarejestrowana i oczekuje na przetworzenie.'
  }

  if (event === 'STATUS_CHANGED') {
    const status = metadata?.newStatus ?? 'nieznany'
    return `Status sprawy zostal zmieniony na: ${status}.`
  }

  if (event === 'COMMERCIAL_OWNER_CHANGED') {
    const ownerName = metadata?.newOwnerName
    return ownerName
      ? `Opiekun handlowy sprawy zostal zmieniony na: ${ownerName}.`
      : 'Opiekun handlowy sprawy zostal usuniety.'
  }

  return 'Zarejestrowano nowe zdarzenie procesu portowania.'
}
