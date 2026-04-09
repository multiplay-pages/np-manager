/**
 * Foundation serwisu powiadomień wewnętrznych dla spraw portowania.
 *
 * Odpowiada za:
 *  - rozwiązanie odbiorców (commercialOwner lub fallback zespołowy),
 *  - zapis śladu powiadomienia w modelu Notification (dla nazwanych użytkowników),
 *  - zapis zdarzenia NOTE w timeline sprawy (dla fallbacku zespołowego — brak userId),
 *  - budowanie treści powiadomienia na podstawie zdarzenia domenowego.
 *
 * Nie wysyła jeszcze e-maili ani webhooków Teams — to kolejny etap.
 * Architektura jest gotowa pod adapter transportowy (email/Teams).
 */

import { prisma } from '../../config/database'
import {
  type PortingNotificationEvent,
  PORTING_NOTIFICATION_EVENT_LABELS,
} from './porting-notification-events'
import { resolvePortingNotificationRecipients } from './porting-notification-recipient-resolver'

// ============================================================
// Typy
// ============================================================

export interface DispatchPortingNotificationParams {
  requestId: string
  caseNumber: string
  event: PortingNotificationEvent
  /** ID opiekuna handlowego z pola commercialOwnerUserId — może być null. */
  commercialOwnerUserId: string | null | undefined
  /** ID użytkownika wykonującego akcję — dołączany do zdarzenia fallbackowego. */
  actorUserId?: string
  /** Dodatkowy kontekst biznesowy dla treści powiadomienia. */
  metadata?: Record<string, unknown>
}

// ============================================================
// Dispatch
// ============================================================

/**
 * Dispatches a notification for a porting domain event.
 *
 * Non-blocking — należy wywoływać z .catch(() => {}) aby nie blokować
 * głównego flow API w razie błędu infrastruktury powiadomień.
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
  const title = `${eventLabel} — sprawa ${caseNumber}`
  const body = buildNotificationBody(event, metadata)

  for (const recipient of recipients) {
    if (recipient.kind === 'USER') {
      // Zapis in-app Notification dla nazwanego użytkownika (opiekun handlowy)
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
    } else if (recipient.kind === 'TEAM_EMAIL') {
      // Fallback — brak userId, zapisujemy ślad w timeline sprawy
      // TODO(PR13B): tu podłączyć faktyczny adapter e-mail lub Teams webhook
      await prisma.portingRequestEvent.create({
        data: {
          request: { connect: { id: requestId } },
          eventSource: 'INTERNAL',
          eventType: 'NOTE',
          title: `Powiadomienie zespołowe: ${eventLabel}`,
          description: [
            `Routing do: ${recipient.emails.join(', ')}.`,
            metadata ? `Kontekst: ${JSON.stringify(metadata)}.` : null,
          ]
            .filter(Boolean)
            .join(' '),
          ...(actorUserId ? { createdBy: { connect: { id: actorUserId } } } : {}),
        },
      })
    }
  }
}

// ============================================================
// Treść powiadomienia
// ============================================================

function buildNotificationBody(
  event: PortingNotificationEvent,
  metadata?: Record<string, unknown>,
): string {
  if (event === 'REQUEST_CREATED') {
    return 'Sprawa portowania została zarejestrowana i oczekuje na przetworzenie.'
  }

  if (event === 'STATUS_CHANGED') {
    const status = metadata?.newStatus ?? 'nieznany'
    return `Status sprawy został zmieniony na: ${status}.`
  }

  if (event === 'COMMERCIAL_OWNER_CHANGED') {
    const ownerName = metadata?.newOwnerName
    return ownerName
      ? `Opiekun handlowy sprawy został zmieniony na: ${ownerName}.`
      : 'Opiekun handlowy sprawy został usunięty.'
  }

  return 'Aktualizacja sprawy portowania.'
}
