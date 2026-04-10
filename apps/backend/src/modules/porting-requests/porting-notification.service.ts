/**
 * Internal notification dispatcher for porting requests.
 *
 * Responsibilities:
 * - resolve recipients (commercial owner or team fallback),
 * - persist Notification for named user recipients,
 * - persist timeline note for shared recipients (routing intent trace),
 * - dispatch real email/Teams transport (PR13B),
 * - persist transport audit trace as PortingRequestEvent NOTE.
 *
 * Non-blocking by design — callers use `.catch(() => {})`.
 */

import { prisma } from '../../config/database'
import {
  PORTING_NOTIFICATION_EVENT_LABELS,
  type PortingNotificationEvent,
} from './porting-notification-events'
import { resolvePortingNotificationRecipients } from './porting-notification-recipient-resolver'
import { formatInternalNotification } from './internal-notification-formatter'
import {
  sendInternalEmail,
  sendInternalTeamsWebhook,
  type InternalNotificationDispatchResult,
} from './internal-notification.adapter'
import { getNotificationFallbackSettings } from '../admin-settings/admin-notification-fallback-settings.service'

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
  const message = formatInternalNotification(event, caseNumber, metadata)

  const transportResults: InternalNotificationDispatchResult[] = []

  for (const recipient of recipients) {
    if (recipient.kind === 'USER') {
      // 1. Domain trace — in-app Notification for the named user
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

      // 2. Transport — email to the user's address
      const emailResult = await sendInternalEmail({
        to: [recipient.email],
        subject: message.subject,
        text: message.text,
      })
      transportResults.push(emailResult)
      continue
    }

    // 3. Domain trace — timeline NOTE recording routing intent for team recipients
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

    if (recipient.kind === 'TEAM_EMAIL') {
      // 4. Transport — email to the shared team address list
      const emailResult = await sendInternalEmail({
        to: recipient.emails,
        subject: message.subject,
        text: message.text,
      })
      transportResults.push(emailResult)
    }

    if (recipient.kind === 'TEAM_WEBHOOK') {
      // 5. Transport — Teams webhook POST
      const teamsResult = await sendInternalTeamsWebhook({
        webhookUrl: recipient.webhookUrl,
        title,
        text: message.text,
      })
      transportResults.push(teamsResult)
    }
  }

  // 6. Fallback dispatch — when any transport failed/misconfigured and fallback is configured
  const fallbackResult = await attemptFallbackDispatch(transportResults, message)
  if (fallbackResult) {
    transportResults.push(fallbackResult)
  }

  // 7. Transport audit trace — one NOTE per dispatch summarising all outcomes
  if (transportResults.length > 0) {
    await prisma.portingRequestEvent.create({
      data: {
        request: { connect: { id: requestId } },
        eventSource: 'INTERNAL',
        eventType: 'NOTE',
        title: `[Dispatch] ${eventLabel}`,
        description: buildTransportAuditDescription(transportResults),
        ...(actorUserId ? { createdBy: { connect: { id: actorUserId } } } : {}),
      },
    })
  }
}

// ============================================================
// FALLBACK DISPATCH
// ============================================================

const FALLBACK_TRIGGERING_OUTCOMES = ['FAILED', 'MISCONFIGURED'] as const

async function attemptFallbackDispatch(
  transportResults: InternalNotificationDispatchResult[],
  message: { subject: string; text: string },
): Promise<InternalNotificationDispatchResult | null> {
  const hasFailed = transportResults.some((r) => r.outcome === 'FAILED')
  const hasMisconfigured = transportResults.some((r) => r.outcome === 'MISCONFIGURED')

  if (!hasFailed && !hasMisconfigured) {
    return null
  }

  const settings = await getNotificationFallbackSettings()

  if (settings.readiness !== 'READY') {
    return null
  }

  const shouldApply =
    (hasFailed && settings.applyToFailed) || (hasMisconfigured && settings.applyToMisconfigured)

  if (!shouldApply) {
    return null
  }

  const failedOutcomes = transportResults
    .filter((r) => (FALLBACK_TRIGGERING_OUTCOMES as readonly string[]).includes(r.outcome))
    .map((r) => `${r.channel}:${r.outcome}`)

  const preamble = `[FALLBACK] Oryginalna wysylka zawiodla (${failedOutcomes.join(', ')}). Ponizej tresc oryginalnej wiadomosci:\n\n`

  return sendInternalEmail({
    to: [settings.fallbackRecipientEmail],
    subject: `[FALLBACK] ${message.subject}`,
    text: `${preamble}${message.text}`,
  })
}

// ============================================================
// POMOCNICZE
// ============================================================

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

function buildTransportAuditDescription(results: InternalNotificationDispatchResult[]): string {
  const lines = results.map((r) => {
    const base = `${r.channel} → ${r.recipient}: ${r.outcome} (tryb: ${r.mode})`
    if (r.errorMessage) {
      return `${base} — blad: ${r.errorMessage}`
    }
    if ('messageId' in r && r.messageId) {
      return `${base}, msgId: ${r.messageId}`
    }
    return base
  })
  return lines.join('\n')
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
