/**
 * Message content formatter for internal porting notifications (PR13B).
 *
 * Produces professional plain-text messages suitable for both email body
 * and Microsoft Teams MessageCard text field.
 * No template engine — simple switch-based formatting per event type.
 */

import {
  PORTING_NOTIFICATION_EVENT_LABELS,
  type PortingNotificationEvent,
} from './porting-notification-events'

export interface InternalNotificationMessage {
  subject: string
  text: string
}

/**
 * Builds subject and plain-text body for an internal notification.
 */
export function formatInternalNotification(
  event: PortingNotificationEvent,
  caseNumber: string,
  metadata?: Record<string, unknown>,
): InternalNotificationMessage {
  const label = PORTING_NOTIFICATION_EVENT_LABELS[event]
  const subject = `[NP-Manager] ${label} — sprawa ${caseNumber}`
  const text = buildMessageText(event, caseNumber, label, metadata)
  return { subject, text }
}

function buildMessageText(
  event: PortingNotificationEvent,
  caseNumber: string,
  label: string,
  metadata?: Record<string, unknown>,
): string {
  const lines: string[] = []

  lines.push(`Powiadomienie wewnetrzne: ${label}`)
  lines.push(`Sprawa: ${caseNumber}`)
  lines.push('')

  switch (event) {
    case 'STATUS_CHANGED': {
      const newStatus = metadata?.newStatus ?? '—'
      const oldStatus = metadata?.oldStatus
      lines.push(`Nowy status sprawy: ${newStatus}`)
      if (oldStatus) {
        lines.push(`Poprzedni status: ${oldStatus}`)
      }
      break
    }

    case 'COMMERCIAL_OWNER_CHANGED': {
      const ownerName = metadata?.newOwnerName
      if (ownerName) {
        lines.push(`Nowy opiekun handlowy: ${ownerName}`)
      } else {
        lines.push('Opiekun handlowy zostal usuniety ze sprawy.')
      }
      break
    }

    case 'REQUEST_CREATED': {
      lines.push('Zarejestrowano nowa sprawe portowania.')
      break
    }

    default: {
      lines.push(`Zdarzenie: ${label}`)
      break
    }
  }

  lines.push('')
  lines.push('---')
  lines.push('Ta wiadomosc zostala wygenerowana automatycznie przez system NP-Manager.')
  lines.push('Prosimy nie odpowiadac na ta wiadomosc.')

  return lines.join('\n')
}
