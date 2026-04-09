import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock global fetch (Teams transport)
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock nodemailer (used only in REAL email mode)
const { mockCreateTransport, mockSendMail } = vi.hoisted(() => ({
  mockCreateTransport: vi.fn(),
  mockSendMail: vi.fn(),
}))

vi.mock('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
  createTransport: mockCreateTransport,
}))

import {
  resolveEmailAdapterMode,
  resolveSmtpConfig,
  sendInternalEmail,
  sendInternalTeamsWebhook,
} from '../internal-notification.adapter'

// ============================================================
// sendInternalEmail
// ============================================================

describe('sendInternalEmail', () => {
  const envelope = {
    to: ['test@np-manager.local'],
    subject: '[NP-Manager] Test — sprawa FNP-2026-TEST',
    text: 'Tresc testowa.',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, status: 200, statusText: 'OK' })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns STUBBED outcome in default STUB mode', async () => {
    vi.stubEnv('INTERNAL_NOTIFICATION_EMAIL_ADAPTER', 'STUB')

    const result = await sendInternalEmail(envelope)

    expect(result.outcome).toBe('STUBBED')
    expect(result.mode).toBe('STUB')
    expect(result.channel).toBe('EMAIL')
    expect(result.errorMessage).toBeNull()
    expect(result.messageId).toMatch(/^stub-email-\d+$/)
    expect(mockCreateTransport).not.toHaveBeenCalled()
  })

  it('returns STUBBED when env var is not set (defaults to STUB)', async () => {
    // No stub — rely on default
    vi.stubEnv('INTERNAL_NOTIFICATION_EMAIL_ADAPTER', '')

    const result = await sendInternalEmail(envelope)

    expect(result.outcome).toBe('STUBBED')
    expect(result.mode).toBe('STUB')
  })

  it('returns DISABLED outcome when DISABLED mode', async () => {
    vi.stubEnv('INTERNAL_NOTIFICATION_EMAIL_ADAPTER', 'DISABLED')

    const result = await sendInternalEmail(envelope)

    expect(result.outcome).toBe('DISABLED')
    expect(result.mode).toBe('DISABLED')
    expect(result.messageId).toBeNull()
    expect(result.errorMessage).toBeNull()
    expect(mockCreateTransport).not.toHaveBeenCalled()
  })

  it('returns MISCONFIGURED when REAL mode but SMTP_HOST not configured', async () => {
    vi.stubEnv('INTERNAL_NOTIFICATION_EMAIL_ADAPTER', 'REAL')
    vi.stubEnv('SMTP_HOST', '')

    const result = await sendInternalEmail(envelope)

    expect(result.outcome).toBe('MISCONFIGURED')
    expect(result.mode).toBe('REAL')
    expect(result.errorMessage).toBeTruthy()
    expect(mockCreateTransport).not.toHaveBeenCalled()
  })

  it('sends via nodemailer in REAL mode when SMTP is configured', async () => {
    vi.stubEnv('INTERNAL_NOTIFICATION_EMAIL_ADAPTER', 'REAL')
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('SMTP_PORT', '587')
    vi.stubEnv('SMTP_USER', 'user@example.com')
    vi.stubEnv('SMTP_PASS', 'secret')
    vi.stubEnv('SMTP_FROM', 'noreply@example.com')

    mockSendMail.mockResolvedValueOnce({ messageId: '<msg-real-001@smtp.example.com>' })
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail })

    const result = await sendInternalEmail(envelope)

    expect(result.outcome).toBe('SENT')
    expect(result.mode).toBe('REAL')
    expect(result.messageId).toBe('<msg-real-001@smtp.example.com>')
    expect(result.errorMessage).toBeNull()
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@np-manager.local',
        subject: envelope.subject,
        from: 'noreply@example.com',
      }),
    )
  })

  it('returns FAILED when nodemailer throws in REAL mode', async () => {
    vi.stubEnv('INTERNAL_NOTIFICATION_EMAIL_ADAPTER', 'REAL')
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')

    mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'))
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail })

    const result = await sendInternalEmail(envelope)

    expect(result.outcome).toBe('FAILED')
    expect(result.mode).toBe('REAL')
    expect(result.errorMessage).toBe('SMTP connection refused')
    expect(result.messageId).toBeNull()
  })

  it('joins multiple recipients into a single recipient field string', async () => {
    vi.stubEnv('INTERNAL_NOTIFICATION_EMAIL_ADAPTER', 'STUB')

    const result = await sendInternalEmail({
      to: ['bok@np.pl', 'sud@np.pl'],
      subject: 'Multi',
      text: 'Test',
    })

    expect(result.recipient).toBe('bok@np.pl, sud@np.pl')
  })
})

// ============================================================
// sendInternalTeamsWebhook
// ============================================================

describe('sendInternalTeamsWebhook', () => {
  const envelope = {
    webhookUrl: 'https://teams.example.com/webhook/abc123',
    title: 'Zmiana statusu sprawy — FNP-2026-AAA111',
    text: 'Nowy status: CONFIRMED.',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends POST and returns SENT outcome on HTTP 200', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' })

    const result = await sendInternalTeamsWebhook(envelope)

    expect(result.outcome).toBe('SENT')
    expect(result.channel).toBe('TEAMS')
    expect(result.mode).toBe('REAL')
    expect(result.errorMessage).toBeNull()
    expect(result.recipient).toBe(envelope.webhookUrl)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://teams.example.com/webhook/abc123',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  it('posts MessageCard payload with correct structure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' })

    await sendInternalTeamsWebhook(envelope)

    const fetchInit = mockFetch.mock.calls[0]![1] as { body: string }
    const body = JSON.parse(fetchInit.body)
    expect(body['@type']).toBe('MessageCard')
    expect(body['@context']).toBe('http://schema.org/extensions')
    expect(body.title).toBe(envelope.title)
    expect(body.text).toBe(envelope.text)
    expect(body.summary).toBe(envelope.title)
  })

  it('returns FAILED when response status is not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' })

    const result = await sendInternalTeamsWebhook(envelope)

    expect(result.outcome).toBe('FAILED')
    expect(result.errorMessage).toContain('429')
    expect(result.errorMessage).toContain('Too Many Requests')
  })

  it('returns FAILED when fetch throws (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error — connection refused'))

    const result = await sendInternalTeamsWebhook(envelope)

    expect(result.outcome).toBe('FAILED')
    expect(result.mode).toBe('REAL')
    expect(result.errorMessage).toBe('Network error — connection refused')
  })
})

// ============================================================
// resolveEmailAdapterMode
// ============================================================

describe('resolveEmailAdapterMode', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to STUB when env var is empty', () => {
    vi.stubEnv('INTERNAL_NOTIFICATION_EMAIL_ADAPTER', '')
    expect(resolveEmailAdapterMode()).toBe('STUB')
  })

  it('returns REAL when env var is REAL', () => {
    vi.stubEnv('INTERNAL_NOTIFICATION_EMAIL_ADAPTER', 'REAL')
    expect(resolveEmailAdapterMode()).toBe('REAL')
  })

  it('returns DISABLED when env var is DISABLED', () => {
    vi.stubEnv('INTERNAL_NOTIFICATION_EMAIL_ADAPTER', 'DISABLED')
    expect(resolveEmailAdapterMode()).toBe('DISABLED')
  })

  it('is case-insensitive', () => {
    vi.stubEnv('INTERNAL_NOTIFICATION_EMAIL_ADAPTER', 'real')
    expect(resolveEmailAdapterMode()).toBe('REAL')
  })

  it('falls back to STUB for unrecognised values', () => {
    vi.stubEnv('INTERNAL_NOTIFICATION_EMAIL_ADAPTER', 'UNKNOWN_VALUE')
    expect(resolveEmailAdapterMode()).toBe('STUB')
  })
})

// ============================================================
// resolveSmtpConfig
// ============================================================

describe('resolveSmtpConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns null when SMTP_HOST is not set', () => {
    vi.stubEnv('SMTP_HOST', '')
    expect(resolveSmtpConfig()).toBeNull()
  })

  it('returns config object when SMTP_HOST is set', () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('SMTP_PORT', '465')
    vi.stubEnv('SMTP_USER', 'user@example.com')
    vi.stubEnv('SMTP_PASS', 'secret')
    vi.stubEnv('SMTP_FROM', 'noreply@example.com')

    const config = resolveSmtpConfig()

    expect(config).toEqual({
      host: 'smtp.example.com',
      port: 465,
      user: 'user@example.com',
      pass: 'secret',
      from: 'noreply@example.com',
    })
  })

  it('uses defaults for missing optional fields', () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('SMTP_PORT', '')
    vi.stubEnv('SMTP_USER', '')
    vi.stubEnv('SMTP_PASS', '')
    vi.stubEnv('SMTP_FROM', '')

    const config = resolveSmtpConfig()

    expect(config?.port).toBe(587)
    expect(config?.user).toBeNull()
    expect(config?.pass).toBeNull()
    expect(config?.from).toBe('noreply@np-manager.local')
  })
})
