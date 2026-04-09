/**
 * Internal notification transport adapters (PR13B).
 *
 * Handles email (SMTP via nodemailer) and Microsoft Teams webhook dispatch
 * for internal porting request notifications.
 *
 * Intentionally separate from the customer communication pipeline
 * (communication-delivery.adapter.ts) — do not mix.
 *
 * Mode selection (email):
 *   env INTERNAL_NOTIFICATION_EMAIL_ADAPTER = STUB (default) | REAL | DISABLED
 *
 * Teams transport is always attempted when a webhook URL is supplied
 * (its enablement is governed by the PORTING_STATUS_TEAMS_ENABLED system setting
 * which is evaluated upstream in the recipient resolver).
 */

// ============================================================
// TYPY
// ============================================================

export type InternalNotificationMode = 'REAL' | 'STUB' | 'DISABLED'
export type InternalNotificationOutcome = 'SENT' | 'STUBBED' | 'DISABLED' | 'MISCONFIGURED' | 'FAILED'

export interface InternalEmailEnvelope {
  to: string[]
  subject: string
  text: string
}

export interface InternalTeamsEnvelope {
  webhookUrl: string
  title: string
  text: string
}

export interface InternalEmailDispatchResult {
  channel: 'EMAIL'
  recipient: string
  outcome: InternalNotificationOutcome
  mode: InternalNotificationMode
  messageId: string | null
  errorMessage: string | null
}

export interface InternalTeamsDispatchResult {
  channel: 'TEAMS'
  recipient: string
  outcome: InternalNotificationOutcome
  mode: InternalNotificationMode
  errorMessage: string | null
}

export type InternalNotificationDispatchResult =
  | InternalEmailDispatchResult
  | InternalTeamsDispatchResult

// ============================================================
// EMAIL TRANSPORT
// ============================================================

export async function sendInternalEmail(
  envelope: InternalEmailEnvelope,
): Promise<InternalEmailDispatchResult> {
  const mode = resolveEmailAdapterMode()
  const recipient = envelope.to.join(', ')

  if (mode === 'DISABLED') {
    return {
      channel: 'EMAIL',
      recipient,
      outcome: 'DISABLED',
      mode,
      messageId: null,
      errorMessage: null,
    }
  }

  if (mode === 'STUB') {
    return {
      channel: 'EMAIL',
      recipient,
      outcome: 'STUBBED',
      mode,
      messageId: `stub-email-${Date.now()}`,
      errorMessage: null,
    }
  }

  // REAL mode — dynamiczny import nodemailer (nie laduj w trybach STUB/DISABLED)
  const smtpConfig = resolveSmtpConfig()
  if (!smtpConfig) {
    return {
      channel: 'EMAIL',
      recipient,
      outcome: 'MISCONFIGURED',
      mode,
      messageId: null,
      errorMessage: 'Brak konfiguracji SMTP: zmienna SMTP_HOST nie jest ustawiona.',
    }
  }

  try {
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      ...(smtpConfig.user
        ? { auth: { user: smtpConfig.user, pass: smtpConfig.pass ?? '' } }
        : {}),
    })

    const info = await transporter.sendMail({
      from: smtpConfig.from,
      to: envelope.to.join(', '),
      subject: envelope.subject,
      text: envelope.text,
    })

    return {
      channel: 'EMAIL',
      recipient,
      outcome: 'SENT',
      mode,
      messageId: (info as { messageId?: string }).messageId ?? null,
      errorMessage: null,
    }
  } catch (err) {
    return {
      channel: 'EMAIL',
      recipient,
      outcome: 'FAILED',
      mode,
      messageId: null,
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }
}

// ============================================================
// TEAMS WEBHOOK TRANSPORT
// ============================================================

export async function sendInternalTeamsWebhook(
  envelope: InternalTeamsEnvelope,
): Promise<InternalTeamsDispatchResult> {
  const recipient = envelope.webhookUrl

  try {
    const response = await fetch(envelope.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        summary: envelope.title,
        themeColor: '0076D7',
        title: envelope.title,
        text: envelope.text,
      }),
    })

    if (!response.ok) {
      return {
        channel: 'TEAMS',
        recipient,
        outcome: 'FAILED',
        mode: 'REAL',
        errorMessage: `HTTP ${response.status} ${response.statusText}`.trim(),
      }
    }

    return {
      channel: 'TEAMS',
      recipient,
      outcome: 'SENT',
      mode: 'REAL',
      errorMessage: null,
    }
  } catch (err) {
    return {
      channel: 'TEAMS',
      recipient,
      outcome: 'FAILED',
      mode: 'REAL',
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }
}

// ============================================================
// KONFIGURACJA — eksportowane dla testowalnosci
// ============================================================

export function resolveEmailAdapterMode(): InternalNotificationMode {
  const raw = (process.env.INTERNAL_NOTIFICATION_EMAIL_ADAPTER ?? 'STUB').toUpperCase().trim()
  if (raw === 'REAL') return 'REAL'
  if (raw === 'DISABLED') return 'DISABLED'
  return 'STUB'
}

interface SmtpConfig {
  host: string
  port: number
  user: string | null
  pass: string | null
  from: string
}

export function resolveSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim()
  if (!host) return null

  return {
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10) || 587,
    user: process.env.SMTP_USER?.trim() || null,
    pass: process.env.SMTP_PASS?.trim() || null,
    from: process.env.SMTP_FROM?.trim() || 'noreply@np-manager.local',
  }
}
