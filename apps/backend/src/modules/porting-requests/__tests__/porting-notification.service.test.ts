import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockNotificationCreate,
  mockPortingRequestEventCreate,
  mockResolveRecipients,
  mockSendInternalEmail,
  mockSendInternalTeamsWebhook,
  mockGetNotificationFallbackSettings,
} = vi.hoisted(() => ({
  mockNotificationCreate: vi.fn(),
  mockPortingRequestEventCreate: vi.fn(),
  mockResolveRecipients: vi.fn(),
  mockSendInternalEmail: vi.fn(),
  mockSendInternalTeamsWebhook: vi.fn(),
  mockGetNotificationFallbackSettings: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    notification: {
      create: (...args: unknown[]) => mockNotificationCreate(...args),
    },
    portingRequestEvent: {
      create: (...args: unknown[]) => mockPortingRequestEventCreate(...args),
    },
  },
}))

vi.mock('../porting-notification-recipient-resolver', () => ({
  resolvePortingNotificationRecipients: (...args: unknown[]) => mockResolveRecipients(...args),
}))

vi.mock('../internal-notification.adapter', () => ({
  sendInternalEmail: (...args: unknown[]) => mockSendInternalEmail(...args),
  sendInternalTeamsWebhook: (...args: unknown[]) => mockSendInternalTeamsWebhook(...args),
}))

vi.mock('../../admin-settings/admin-notification-fallback-settings.service', () => ({
  getNotificationFallbackSettings: (...args: unknown[]) =>
    mockGetNotificationFallbackSettings(...args),
}))

import { PORTING_NOTIFICATION_EVENT } from '../porting-notification-events'
import { dispatchPortingNotification } from '../porting-notification.service'

// ============================================================
// DEFAULTS
// ============================================================

const STUB_EMAIL_RESULT = {
  channel: 'EMAIL',
  recipient: 'stub@np-manager.local',
  outcome: 'STUBBED',
  mode: 'STUB',
  messageId: 'stub-email-123',
  errorMessage: null,
}

const STUB_TEAMS_RESULT = {
  channel: 'TEAMS',
  recipient: 'https://teams.example/stub',
  outcome: 'STUBBED',
  mode: 'STUB',
  errorMessage: null,
}

const FALLBACK_SETTINGS_READY = {
  fallbackEnabled: true,
  fallbackRecipientEmail: 'fallback@multiplay.pl',
  fallbackRecipientName: 'Fallback BOK',
  applyToFailed: true,
  applyToMisconfigured: true,
  readiness: 'READY' as const,
}

const FALLBACK_SETTINGS_DISABLED = {
  fallbackEnabled: false,
  fallbackRecipientEmail: '',
  fallbackRecipientName: '',
  applyToFailed: true,
  applyToMisconfigured: true,
  readiness: 'DISABLED' as const,
}

const FALLBACK_SETTINGS_INCOMPLETE = {
  fallbackEnabled: true,
  fallbackRecipientEmail: '',
  fallbackRecipientName: '',
  applyToFailed: true,
  applyToMisconfigured: true,
  readiness: 'INCOMPLETE' as const,
}

const FAILED_EMAIL_RESULT = {
  channel: 'EMAIL',
  recipient: 'sales@np.pl',
  outcome: 'FAILED',
  mode: 'REAL',
  messageId: null,
  errorMessage: 'SMTP connection refused',
}

const MISCONFIGURED_EMAIL_RESULT = {
  channel: 'EMAIL',
  recipient: 'sales@np.pl',
  outcome: 'MISCONFIGURED',
  mode: 'REAL',
  messageId: null,
  errorMessage: 'Brak konfiguracji SMTP: zmienna SMTP_HOST nie jest ustawiona.',
}

// ============================================================
// TESTS
// ============================================================

describe('dispatchPortingNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotificationCreate.mockResolvedValue(undefined)
    mockPortingRequestEventCreate.mockResolvedValue(undefined)
    mockSendInternalEmail.mockResolvedValue(STUB_EMAIL_RESULT)
    mockSendInternalTeamsWebhook.mockResolvedValue(STUB_TEAMS_RESULT)
    mockGetNotificationFallbackSettings.mockResolvedValue(FALLBACK_SETTINGS_DISABLED)
  })

  // -------- USER recipient --------

  it('creates Notification for active owner recipient on STATUS_CHANGED', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      {
        kind: 'USER',
        userId: 'sales-1',
        email: 'sales@np-manager.local',
        displayName: 'Jan Sprzedaz',
      },
    ])

    await dispatchPortingNotification({
      requestId: 'request-1',
      caseNumber: 'FNP-20260409-AAA111',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: 'sales-1',
      actorUserId: 'actor-1',
      metadata: { newStatus: 'ACCEPTED' },
    })

    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: {
        userId: 'sales-1',
        type: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
        title: 'Zmiana statusu sprawy - sprawa FNP-20260409-AAA111',
        body: 'Status sprawy zostal zmieniony na: ACCEPTED.',
        relatedEntityType: 'porting_request',
        relatedEntityId: 'request-1',
      },
    })
    // PR13B: audit NOTE is written after email dispatch (no routing NOTE for USER path)
    expect(mockPortingRequestEventCreate).toHaveBeenCalledTimes(1)
    expect(mockPortingRequestEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: '[Dispatch] Zmiana statusu sprawy' }),
      }),
    )
  })

  it('sends email to USER recipient address', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      {
        kind: 'USER',
        userId: 'sales-1',
        email: 'sales@np-manager.local',
        displayName: 'Jan Sprzedaz',
      },
    ])

    await dispatchPortingNotification({
      requestId: 'request-1',
      caseNumber: 'FNP-20260409-AAA111',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: 'sales-1',
      metadata: { newStatus: 'CONFIRMED' },
    })

    expect(mockSendInternalEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['sales@np-manager.local'] }),
    )
    expect(mockSendInternalTeamsWebhook).not.toHaveBeenCalled()
  })

  it('writes transport audit NOTE after USER email dispatch', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      {
        kind: 'USER',
        userId: 'sales-1',
        email: 'sales@np.pl',
        displayName: 'Jan',
      },
    ])
    mockSendInternalEmail.mockResolvedValueOnce({
      channel: 'EMAIL',
      recipient: 'sales@np.pl',
      outcome: 'SENT',
      mode: 'REAL',
      messageId: 'msg-abc123',
      errorMessage: null,
    })

    await dispatchPortingNotification({
      requestId: 'request-audit',
      caseNumber: 'FNP-2026-AUDIT',
      event: PORTING_NOTIFICATION_EVENT.COMMERCIAL_OWNER_CHANGED,
      commercialOwnerUserId: 'sales-1',
      actorUserId: 'actor-1',
      metadata: { newOwnerName: 'Jan Kowalski' },
    })

    // USER path: only audit NOTE (no routing NOTE)
    expect(mockPortingRequestEventCreate).toHaveBeenCalledTimes(1)
    expect(mockPortingRequestEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: '[Dispatch] Zmiana opiekuna handlowego',
          description: expect.stringContaining('SENT'),
        }),
      }),
    )
  })

  // -------- TEAM_EMAIL recipient --------

  it('creates fallback timeline note for TEAM_EMAIL recipients', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'TEAM_EMAIL', emails: ['bok@multiplay.pl', 'sud@multiplay.pl'] },
    ])

    await dispatchPortingNotification({
      requestId: 'request-2',
      caseNumber: 'FNP-20260409-BBB222',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: null,
      actorUserId: 'actor-2',
      metadata: { newStatus: 'PENDING_DONOR' },
    })

    expect(mockNotificationCreate).not.toHaveBeenCalled()
    expect(mockPortingRequestEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'NOTE',
          title: 'Powiadomienie zespolowe: Zmiana statusu sprawy',
          description: expect.stringContaining('bok@multiplay.pl, sud@multiplay.pl'),
        }),
      }),
    )
  })

  it('sends email to TEAM_EMAIL address list', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'TEAM_EMAIL', emails: ['bok@multiplay.pl', 'sud@multiplay.pl'] },
    ])

    await dispatchPortingNotification({
      requestId: 'request-2',
      caseNumber: 'FNP-20260409-BBB222',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: null,
      metadata: { newStatus: 'PENDING_DONOR' },
    })

    expect(mockSendInternalEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['bok@multiplay.pl', 'sud@multiplay.pl'] }),
    )
    expect(mockSendInternalTeamsWebhook).not.toHaveBeenCalled()
    // routing NOTE + audit NOTE = 2 calls
    expect(mockPortingRequestEventCreate).toHaveBeenCalledTimes(2)
  })

  // -------- TEAM_WEBHOOK recipient --------

  it('creates fallback timeline note for TEAM_WEBHOOK recipients', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'TEAM_WEBHOOK', webhookUrl: 'https://teams.example/hook' },
    ])

    await dispatchPortingNotification({
      requestId: 'request-3',
      caseNumber: 'FNP-20260409-CCC333',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: null,
      metadata: { newStatus: 'PORTED' },
    })

    expect(mockNotificationCreate).not.toHaveBeenCalled()
    expect(mockPortingRequestEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: expect.stringContaining('https://teams.example/hook'),
        }),
      }),
    )
  })

  it('sends Teams webhook POST for TEAM_WEBHOOK recipient', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'TEAM_WEBHOOK', webhookUrl: 'https://teams.example/hook' },
    ])

    await dispatchPortingNotification({
      requestId: 'request-3',
      caseNumber: 'FNP-20260409-CCC333',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: null,
      metadata: { newStatus: 'PORTED' },
    })

    expect(mockSendInternalTeamsWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ webhookUrl: 'https://teams.example/hook' }),
    )
    expect(mockSendInternalEmail).not.toHaveBeenCalled()
    // routing NOTE + audit NOTE = 2 calls
    expect(mockPortingRequestEventCreate).toHaveBeenCalledTimes(2)
  })

  // -------- TEAM_EMAIL + TEAM_WEBHOOK combined --------

  it('dispatches email and Teams when both TEAM_EMAIL and TEAM_WEBHOOK recipients configured', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'TEAM_EMAIL', emails: ['bok@np.pl'] },
      { kind: 'TEAM_WEBHOOK', webhookUrl: 'https://teams.example/hook' },
    ])

    await dispatchPortingNotification({
      requestId: 'request-combined',
      caseNumber: 'FNP-2026-COMBINED',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: null,
      metadata: { newStatus: 'CONFIRMED' },
    })

    expect(mockSendInternalEmail).toHaveBeenCalledTimes(1)
    expect(mockSendInternalTeamsWebhook).toHaveBeenCalledTimes(1)
    // 2 routing NOTEs (one per team recipient) + 1 audit NOTE = 3 calls
    expect(mockPortingRequestEventCreate).toHaveBeenCalledTimes(3)
  })

  // -------- Transport audit trace --------

  it('audit NOTE description includes channel, recipient, outcome, and mode', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'TEAM_EMAIL', emails: ['bok@np.pl'] },
    ])
    mockSendInternalEmail.mockResolvedValueOnce({
      channel: 'EMAIL',
      recipient: 'bok@np.pl',
      outcome: 'SENT',
      mode: 'REAL',
      messageId: 'msg-real-999',
      errorMessage: null,
    })

    await dispatchPortingNotification({
      requestId: 'request-trace',
      caseNumber: 'FNP-2026-TRACE',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: null,
      metadata: { newStatus: 'PORTED' },
    })

    const auditCall = mockPortingRequestEventCreate.mock.calls.find(
      (call) => call[0].data.title === '[Dispatch] Zmiana statusu sprawy',
    )
    expect(auditCall).toBeDefined()
    const description: string = auditCall![0].data.description
    expect(description).toContain('EMAIL')
    expect(description).toContain('bok@np.pl')
    expect(description).toContain('SENT')
    expect(description).toContain('REAL')
  })

  it('audit NOTE description includes error message on FAILED outcome', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'TEAM_EMAIL', emails: ['bok@np.pl'] },
    ])
    mockSendInternalEmail.mockResolvedValueOnce({
      channel: 'EMAIL',
      recipient: 'bok@np.pl',
      outcome: 'FAILED',
      mode: 'REAL',
      messageId: null,
      errorMessage: 'SMTP connection refused',
    })

    await dispatchPortingNotification({
      requestId: 'request-fail',
      caseNumber: 'FNP-2026-FAIL',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: null,
    })

    const auditCall = mockPortingRequestEventCreate.mock.calls.find(
      (call) => call[0].data.title === '[Dispatch] Zmiana statusu sprawy',
    )
    expect(auditCall![0].data.description).toContain('SMTP connection refused')
  })

  // -------- Resilience --------

  it('does nothing when resolver returns no recipients', async () => {
    mockResolveRecipients.mockResolvedValueOnce([])

    await dispatchPortingNotification({
      requestId: 'request-4',
      caseNumber: 'FNP-20260409-DDD444',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: null,
    })

    expect(mockNotificationCreate).not.toHaveBeenCalled()
    expect(mockPortingRequestEventCreate).not.toHaveBeenCalled()
    expect(mockSendInternalEmail).not.toHaveBeenCalled()
    expect(mockSendInternalTeamsWebhook).not.toHaveBeenCalled()
  })

  it('resolves without error even when email transport returns FAILED', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'USER', userId: 'sales-1', email: 'sales@np.pl', displayName: 'Jan' },
    ])
    mockSendInternalEmail.mockResolvedValueOnce({
      channel: 'EMAIL',
      recipient: 'sales@np.pl',
      outcome: 'FAILED',
      mode: 'REAL',
      messageId: null,
      errorMessage: 'SMTP connection refused',
    })

    await expect(
      dispatchPortingNotification({
        requestId: 'request-resilience',
        caseNumber: 'FNP-2026-RESILIENCE',
        event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
        commercialOwnerUserId: 'sales-1',
        metadata: { newStatus: 'REJECTED' },
      }),
    ).resolves.toBeUndefined()

    // In-app Notification was created despite email failure
    expect(mockNotificationCreate).toHaveBeenCalled()
    // Audit NOTE was written with failure info
    expect(mockPortingRequestEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: expect.stringContaining('FAILED'),
        }),
      }),
    )
  })

  it('resolves without error even when Teams transport returns FAILED', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'TEAM_WEBHOOK', webhookUrl: 'https://teams.example/hook' },
    ])
    mockSendInternalTeamsWebhook.mockResolvedValueOnce({
      channel: 'TEAMS',
      recipient: 'https://teams.example/hook',
      outcome: 'FAILED',
      mode: 'REAL',
      errorMessage: 'Network error',
    })

    await expect(
      dispatchPortingNotification({
        requestId: 'request-teams-fail',
        caseNumber: 'FNP-2026-TEAMSFAIL',
        event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
        commercialOwnerUserId: null,
      }),
    ).resolves.toBeUndefined()
  })

  // -------- COMMERCIAL_OWNER_CHANGED --------

  it('creates Notification for COMMERCIAL_OWNER_CHANGED with owner name in body', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      {
        kind: 'USER',
        userId: 'sales-2',
        email: 'new-owner@np-manager.local',
        displayName: 'Anna Handlowa',
      },
    ])

    await dispatchPortingNotification({
      requestId: 'request-co',
      caseNumber: 'FNP-20260409-EEE555',
      event: PORTING_NOTIFICATION_EVENT.COMMERCIAL_OWNER_CHANGED,
      commercialOwnerUserId: 'sales-2',
      actorUserId: 'actor-3',
      metadata: { newOwnerName: 'Anna Handlowa' },
    })

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PORTING_NOTIFICATION_EVENT.COMMERCIAL_OWNER_CHANGED,
          body: 'Opiekun handlowy sprawy zostal zmieniony na: Anna Handlowa.',
        }),
      }),
    )
  })

  it('formats email for COMMERCIAL_OWNER_CHANGED event', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      {
        kind: 'USER',
        userId: 'sales-2',
        email: 'new-owner@np.pl',
        displayName: 'Anna',
      },
    ])

    await dispatchPortingNotification({
      requestId: 'request-co2',
      caseNumber: 'FNP-2026-CO2',
      event: PORTING_NOTIFICATION_EVENT.COMMERCIAL_OWNER_CHANGED,
      commercialOwnerUserId: 'sales-2',
      metadata: { newOwnerName: 'Anna Handlowa' },
    })

    const emailCall = mockSendInternalEmail.mock.calls[0]?.[0] as { subject: string; text: string }
    expect(emailCall.subject).toContain('Zmiana opiekuna handlowego')
    expect(emailCall.text).toContain('Anna Handlowa')
  })

  // -------- FALLBACK DISPATCH --------

  it('does NOT call fallback settings when all transport outcomes succeed', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'USER', userId: 'sales-1', email: 'sales@np.pl', displayName: 'Jan' },
    ])
    mockSendInternalEmail.mockResolvedValueOnce(STUB_EMAIL_RESULT)

    await dispatchPortingNotification({
      requestId: 'request-fb-ok',
      caseNumber: 'FNP-2026-FBOK',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: 'sales-1',
      metadata: { newStatus: 'CONFIRMED' },
    })

    expect(mockGetNotificationFallbackSettings).not.toHaveBeenCalled()
  })

  it('triggers fallback email on FAILED outcome when settings READY and applyToFailed=true', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'USER', userId: 'sales-1', email: 'sales@np.pl', displayName: 'Jan' },
    ])
    mockSendInternalEmail
      .mockResolvedValueOnce(FAILED_EMAIL_RESULT)
      .mockResolvedValueOnce({
        channel: 'EMAIL',
        recipient: '[FALLBACK] fallback@multiplay.pl',
        outcome: 'STUBBED',
        mode: 'STUB',
        messageId: 'stub-fallback-1',
        errorMessage: null,
      })
    mockGetNotificationFallbackSettings.mockResolvedValueOnce(FALLBACK_SETTINGS_READY)

    await dispatchPortingNotification({
      requestId: 'request-fb-failed',
      caseNumber: 'FNP-2026-FBFAIL',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: 'sales-1',
      metadata: { newStatus: 'REJECTED' },
    })

    expect(mockGetNotificationFallbackSettings).toHaveBeenCalledTimes(1)
    // Original email + fallback email = 2 calls
    expect(mockSendInternalEmail).toHaveBeenCalledTimes(2)
    expect(mockSendInternalEmail).toHaveBeenLastCalledWith(
      expect.objectContaining({
        to: ['fallback@multiplay.pl'],
      }),
    )
  })

  it('triggers fallback email on MISCONFIGURED outcome when settings READY and applyToMisconfigured=true', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'USER', userId: 'sales-1', email: 'sales@np.pl', displayName: 'Jan' },
    ])
    mockSendInternalEmail
      .mockResolvedValueOnce(MISCONFIGURED_EMAIL_RESULT)
      .mockResolvedValueOnce({
        channel: 'EMAIL',
        recipient: '[FALLBACK] fallback@multiplay.pl',
        outcome: 'STUBBED',
        mode: 'STUB',
        messageId: 'stub-fallback-2',
        errorMessage: null,
      })
    mockGetNotificationFallbackSettings.mockResolvedValueOnce(FALLBACK_SETTINGS_READY)

    await dispatchPortingNotification({
      requestId: 'request-fb-misc',
      caseNumber: 'FNP-2026-FBMISC',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: 'sales-1',
      metadata: { newStatus: 'ERROR' },
    })

    expect(mockGetNotificationFallbackSettings).toHaveBeenCalledTimes(1)
    expect(mockSendInternalEmail).toHaveBeenCalledTimes(2)
    expect(mockSendInternalEmail).toHaveBeenLastCalledWith(
      expect.objectContaining({
        to: ['fallback@multiplay.pl'],
        subject: expect.stringContaining('[FALLBACK]'),
      }),
    )
  })

  it('does NOT trigger fallback when readiness is DISABLED', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'USER', userId: 'sales-1', email: 'sales@np.pl', displayName: 'Jan' },
    ])
    mockSendInternalEmail.mockResolvedValueOnce(FAILED_EMAIL_RESULT)
    mockGetNotificationFallbackSettings.mockResolvedValueOnce(FALLBACK_SETTINGS_DISABLED)

    await dispatchPortingNotification({
      requestId: 'request-fb-dis',
      caseNumber: 'FNP-2026-FBDIS',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: 'sales-1',
    })

    // Settings fetched (because failure detected), but no fallback email sent
    expect(mockGetNotificationFallbackSettings).toHaveBeenCalledTimes(1)
    expect(mockSendInternalEmail).toHaveBeenCalledTimes(1) // only original
  })

  it('does NOT trigger fallback when readiness is INCOMPLETE', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'USER', userId: 'sales-1', email: 'sales@np.pl', displayName: 'Jan' },
    ])
    mockSendInternalEmail.mockResolvedValueOnce(FAILED_EMAIL_RESULT)
    mockGetNotificationFallbackSettings.mockResolvedValueOnce(FALLBACK_SETTINGS_INCOMPLETE)

    await dispatchPortingNotification({
      requestId: 'request-fb-inc',
      caseNumber: 'FNP-2026-FBINC',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: 'sales-1',
    })

    expect(mockGetNotificationFallbackSettings).toHaveBeenCalledTimes(1)
    expect(mockSendInternalEmail).toHaveBeenCalledTimes(1)
  })

  it('does NOT trigger fallback when applyToFailed=false and only FAILED outcomes', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'USER', userId: 'sales-1', email: 'sales@np.pl', displayName: 'Jan' },
    ])
    mockSendInternalEmail.mockResolvedValueOnce(FAILED_EMAIL_RESULT)
    mockGetNotificationFallbackSettings.mockResolvedValueOnce({
      ...FALLBACK_SETTINGS_READY,
      applyToFailed: false,
    })

    await dispatchPortingNotification({
      requestId: 'request-fb-nofail',
      caseNumber: 'FNP-2026-FBNF',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: 'sales-1',
    })

    expect(mockSendInternalEmail).toHaveBeenCalledTimes(1)
  })

  it('does NOT trigger fallback when applyToMisconfigured=false and only MISCONFIGURED outcomes', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'USER', userId: 'sales-1', email: 'sales@np.pl', displayName: 'Jan' },
    ])
    mockSendInternalEmail.mockResolvedValueOnce(MISCONFIGURED_EMAIL_RESULT)
    mockGetNotificationFallbackSettings.mockResolvedValueOnce({
      ...FALLBACK_SETTINGS_READY,
      applyToMisconfigured: false,
    })

    await dispatchPortingNotification({
      requestId: 'request-fb-nomisc',
      caseNumber: 'FNP-2026-FBNM',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: 'sales-1',
    })

    expect(mockSendInternalEmail).toHaveBeenCalledTimes(1)
  })

  it('sends single fallback email even when multiple transports fail', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'TEAM_EMAIL', emails: ['bok@np.pl'] },
      { kind: 'TEAM_WEBHOOK', webhookUrl: 'https://teams.example/hook' },
    ])
    mockSendInternalEmail.mockResolvedValueOnce({
      ...FAILED_EMAIL_RESULT,
      recipient: 'bok@np.pl',
    })
    mockSendInternalTeamsWebhook.mockResolvedValueOnce({
      channel: 'TEAMS',
      recipient: 'https://teams.example/hook',
      outcome: 'FAILED',
      mode: 'REAL',
      errorMessage: 'Network error',
    })
    mockSendInternalEmail.mockResolvedValueOnce({
      channel: 'EMAIL',
      recipient: '[FALLBACK] fallback@multiplay.pl',
      outcome: 'STUBBED',
      mode: 'STUB',
      messageId: 'stub-fallback-multi',
      errorMessage: null,
    })
    mockGetNotificationFallbackSettings.mockResolvedValueOnce(FALLBACK_SETTINGS_READY)

    await dispatchPortingNotification({
      requestId: 'request-fb-multi',
      caseNumber: 'FNP-2026-FBMULTI',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: null,
    })

    // TEAM_EMAIL send + fallback send = 2 email calls (Teams is separate)
    expect(mockSendInternalEmail).toHaveBeenCalledTimes(2)
    expect(mockSendInternalTeamsWebhook).toHaveBeenCalledTimes(1)
    // Fallback called once despite 2 transport failures
    expect(mockGetNotificationFallbackSettings).toHaveBeenCalledTimes(1)
  })

  it('fallback dispatch result appears in audit NOTE description with [FALLBACK] tag', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'USER', userId: 'sales-1', email: 'sales@np.pl', displayName: 'Jan' },
    ])
    mockSendInternalEmail
      .mockResolvedValueOnce(FAILED_EMAIL_RESULT)
      .mockResolvedValueOnce({
        channel: 'EMAIL',
        recipient: '[FALLBACK] fallback@multiplay.pl',
        outcome: 'SENT',
        mode: 'REAL',
        messageId: 'msg-fallback-audit',
        errorMessage: null,
      })
    mockGetNotificationFallbackSettings.mockResolvedValueOnce(FALLBACK_SETTINGS_READY)

    await dispatchPortingNotification({
      requestId: 'request-fb-audit',
      caseNumber: 'FNP-2026-FBAUDIT',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: 'sales-1',
      metadata: { newStatus: 'ERROR' },
    })

    const auditCall = mockPortingRequestEventCreate.mock.calls.find(
      (call) => call[0].data.title.startsWith('[Dispatch]'),
    )
    expect(auditCall).toBeDefined()
    const description: string = auditCall![0].data.description
    // Original failure line
    expect(description).toContain('FAILED')
    expect(description).toContain('sales@np.pl')
    // Fallback line
    expect(description).toContain('[FALLBACK]')
    expect(description).toContain('fallback@multiplay.pl')
    expect(description).toContain('SENT')
  })

  it('resolves without error even when fallback email itself fails', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'USER', userId: 'sales-1', email: 'sales@np.pl', displayName: 'Jan' },
    ])
    mockSendInternalEmail
      .mockResolvedValueOnce(FAILED_EMAIL_RESULT)
      .mockResolvedValueOnce({
        channel: 'EMAIL',
        recipient: '[FALLBACK] fallback@multiplay.pl',
        outcome: 'FAILED',
        mode: 'REAL',
        messageId: null,
        errorMessage: 'Fallback SMTP also refused',
      })
    mockGetNotificationFallbackSettings.mockResolvedValueOnce(FALLBACK_SETTINGS_READY)

    await expect(
      dispatchPortingNotification({
        requestId: 'request-fb-failfail',
        caseNumber: 'FNP-2026-FBFF',
        event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
        commercialOwnerUserId: 'sales-1',
      }),
    ).resolves.toBeUndefined()

    // Both failures recorded in audit
    const auditCall = mockPortingRequestEventCreate.mock.calls.find(
      (call) => call[0].data.title.startsWith('[Dispatch]'),
    )
    expect(auditCall).toBeDefined()
    const description: string = auditCall![0].data.description
    expect(description).toContain('Fallback SMTP also refused')
  })

  it('fallback email text contains [FALLBACK] preamble with failure context', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'TEAM_EMAIL', emails: ['bok@np.pl'] },
    ])
    mockSendInternalEmail
      .mockResolvedValueOnce(MISCONFIGURED_EMAIL_RESULT)
      .mockResolvedValueOnce({
        channel: 'EMAIL',
        recipient: '[FALLBACK] fallback@multiplay.pl',
        outcome: 'STUBBED',
        mode: 'STUB',
        messageId: 'stub-fb-preamble',
        errorMessage: null,
      })
    mockGetNotificationFallbackSettings.mockResolvedValueOnce(FALLBACK_SETTINGS_READY)

    await dispatchPortingNotification({
      requestId: 'request-fb-preamble',
      caseNumber: 'FNP-2026-FBPRE',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: null,
      metadata: { newStatus: 'ERROR' },
    })

    const fallbackEmailCall = mockSendInternalEmail.mock.calls[1]?.[0] as {
      to: string[]
      subject: string
      text: string
    }
    expect(fallbackEmailCall.subject).toContain('[FALLBACK]')
    expect(fallbackEmailCall.text).toContain('[FALLBACK]')
    expect(fallbackEmailCall.text).toContain('EMAIL:MISCONFIGURED')
    expect(fallbackEmailCall.text).toContain('Oryginalna wysylka zawiodla')
  })
})
