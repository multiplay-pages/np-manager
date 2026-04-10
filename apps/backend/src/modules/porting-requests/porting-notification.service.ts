/**
 * Internal notification dispatcher for porting requests.
 *
 * Responsibilities:
 * - resolve recipients (commercial owner or team routing fallback),
 * - persist Notification for named user recipients,
 * - persist timeline note for shared recipients (routing intent trace),
 * - dispatch email/Teams transport,
 * - persist transport audit trace as PortingRequestEvent NOTE,
 * - execute optional error fallback (notification_fallback_*) after FAILED/MISCONFIGURED outcomes.
 *
 * Non-blocking by design - callers use `.catch(() => {})`.
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
import {
  decideNotificationErrorFallback,
  extractFailureOutcomesFromDispatch,
  resolveNotificationFallbackPolicy,
  type NotificationErrorFallbackDecision,
  type NotificationFallbackPolicy,
} from './porting-notification-fallback-policy.resolver'

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
      // 1. Domain trace - in-app Notification for the named user
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

      // 2. Transport - email to the user's address
      const emailResult = await sendInternalEmail({
        to: [recipient.email],
        subject: message.subject,
        text: message.text,
      })
      transportResults.push(emailResult)
      continue
    }

    // 3. Domain trace - timeline NOTE recording routing intent for team recipients
    await prisma.portingRequestEvent.create({
      data: {
        request: { connect: { id: requestId } },
        eventSource: 'INTERNAL',
        eventType: 'NOTE',
        title: `Powiadomienie zespolowe: ${eventLabel}`,
        description: buildTeamRoutingFallbackDescription(recipient, metadata),
        ...(actorUserId ? { createdBy: { connect: { id: actorUserId } } } : {}),
      },
    })

    if (recipient.kind === 'TEAM_EMAIL') {
      // 4. Transport - email to the shared team address list
      const emailResult = await sendInternalEmail({
        to: recipient.emails,
        subject: message.subject,
        text: message.text,
      })
      transportResults.push(emailResult)
    }

    if (recipient.kind === 'TEAM_WEBHOOK') {
      // 5. Transport - Teams webhook POST
      const teamsResult = await sendInternalTeamsWebhook({
        webhookUrl: recipient.webhookUrl,
        title,
        text: message.text,
      })
      transportResults.push(teamsResult)
    }
  }

  // 6. Transport audit trace - one NOTE per dispatch summarizing primary outcomes
  if (transportResults.length > 0) {
    await prisma.portingRequestEvent.create({
      data: {
        request: { connect: { id: requestId } },
        eventSource: 'INTERNAL',
        eventType: 'NOTE',
        title: `[Dispatch] ${eventLabel}`,
        description: buildPrimaryDispatchAuditDescription(transportResults),
        ...(actorUserId ? { createdBy: { connect: { id: actorUserId } } } : {}),
      },
    })
  }

  await handleNotificationErrorFallback({
    requestId,
    actorUserId,
    eventLabel,
    message,
    transportResults,
  })
}

// ============================================================
// HELPERY
// ============================================================

function buildTeamRoutingFallbackDescription(
  recipient: { kind: 'TEAM_EMAIL'; emails: string[] } | { kind: 'TEAM_WEBHOOK'; webhookUrl: string },
  metadata?: Record<string, unknown>,
): string {
  const destination =
    recipient.kind === 'TEAM_EMAIL'
      ? `Routing do e-mail: ${recipient.emails.join(', ')}.`
      : `Routing do Teams webhook: ${recipient.webhookUrl}.`

  const metadataText = metadata ? ` Kontekst: ${safeJson(metadata)}.` : ''
  return `Rodzaj fallbacku: ROUTING_TEAM. ${destination}${metadataText}`.trim()
}

function buildPrimaryDispatchAuditDescription(results: InternalNotificationDispatchResult[]): string {
  const lines = results.map((result) => {
    const base = `${result.channel} -> ${result.recipient}: ${result.outcome} (tryb: ${result.mode})`
    if (result.errorMessage) {
      return `${base} - blad: ${result.errorMessage}`
    }
    if ('messageId' in result && result.messageId) {
      return `${base}, msgId: ${result.messageId}`
    }
    return base
  })
  return lines.join('\n')
}

async function handleNotificationErrorFallback(params: {
  requestId: string
  actorUserId?: string
  eventLabel: string
  message: { subject: string; text: string }
  transportResults: InternalNotificationDispatchResult[]
}): Promise<void> {
  const failureOutcomes = extractFailureOutcomesFromDispatch(params.transportResults)
  if (failureOutcomes.length === 0) {
    return
  }

  const policy = await resolveNotificationFallbackPolicy()
  const decision = decideNotificationErrorFallback(policy, failureOutcomes)

  let fallbackDispatchResult: InternalNotificationDispatchResult | null = null
  if (decision.shouldTrigger) {
    fallbackDispatchResult = await sendInternalEmail({
      to: [policy.fallbackRecipientEmail],
      subject: params.message.subject,
      text: params.message.text,
    })
  }

  await prisma.portingRequestEvent.create({
    data: {
      request: { connect: { id: params.requestId } },
      eventSource: 'INTERNAL',
      eventType: 'NOTE',
      title: `[ErrorFallback] ${params.eventLabel}`,
      description: buildErrorFallbackAuditDescription(policy, decision, fallbackDispatchResult),
      ...(params.actorUserId ? { createdBy: { connect: { id: params.actorUserId } } } : {}),
    },
  })
}

function buildErrorFallbackAuditDescription(
  policy: NotificationFallbackPolicy,
  decision: NotificationErrorFallbackDecision,
  fallbackDispatchResult: InternalNotificationDispatchResult | null,
): string {
  const outcomesLabel = decision.failureOutcomes.length > 0 ? decision.failureOutcomes.join(',') : 'BRAK'
  const matchedLabel = decision.matchedOutcomes.length > 0 ? decision.matchedOutcomes.join(',') : 'BRAK'

  if (fallbackDispatchResult) {
    const base = `${fallbackDispatchResult.channel} -> ${fallbackDispatchResult.recipient}: ${fallbackDispatchResult.outcome} (tryb: ${fallbackDispatchResult.mode})`
    const reasonPart = `powod: ERROR_FALLBACK_TRIGGERED; sourceOutcomes=${outcomesLabel}; matchedOutcomes=${matchedLabel}; readiness=${policy.readiness}`

    if (fallbackDispatchResult.errorMessage) {
      return `${base} - blad: ${fallbackDispatchResult.errorMessage}; ${reasonPart}`
    }

    if ('messageId' in fallbackDispatchResult && fallbackDispatchResult.messageId) {
      return `${base}, msgId: ${fallbackDispatchResult.messageId} - ${reasonPart}`
    }

    return `${base} - ${reasonPart}`
  }

  const recipient = policy.fallbackRecipientEmail || '-'
  return `EMAIL -> ${recipient}: SKIPPED (tryb: POLICY) - powod: ${decision.reason}; sourceOutcomes=${outcomesLabel}; matchedOutcomes=${matchedLabel}; readiness=${policy.readiness}`
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
