import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_SETTING_KEYS } from '@np-manager/shared'

const {
  mockNotificationCreate,
  mockPortingRequestEventCreate,
  mockResolveRecipients,
  mockSendInternalEmail,
  mockSendInternalTeamsWebhook,
  mockSystemSettingFindUnique,
} = vi.hoisted(() => ({
  mockNotificationCreate: vi.fn(),
  mockPortingRequestEventCreate: vi.fn(),
  mockResolveRecipients: vi.fn(),
  mockSendInternalEmail: vi.fn(),
  mockSendInternalTeamsWebhook: vi.fn(),
  mockSystemSettingFindUnique: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    notification: {
      create: (...args: unknown[]) => mockNotificationCreate(...args),
    },
    portingRequestEvent: {
      create: (...args: unknown[]) => mockPortingRequestEventCreate(...args),
    },
    systemSetting: {
      findUnique: (...args: unknown[]) => mockSystemSettingFindUnique(...args),
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

function mockFallbackPolicySettings(values: {
  enabled?: string
  recipientEmail?: string
  recipientName?: string
  applyToFailed?: string
  applyToMisconfigured?: string
}) {
  const byKey = new Map<string, { value: string }>([
    [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_ENABLED, { value: values.enabled ?? 'false' }],
    [
      SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_EMAIL,
      { value: values.recipientEmail ?? '' },
    ],
    [
      SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_NAME,
      { value: values.recipientName ?? '' },
    ],
    [
      SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_FAILED,
      { value: values.applyToFailed ?? 'true' },
    ],
    [
      SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_MISCONFIGURED,
      { value: values.applyToMisconfigured ?? 'true' },
    ],
  ])

  mockSystemSettingFindUnique.mockImplementation(async (args: { where: { key: string } }) => {
    return byKey.get(args.where.key) ?? null
  })
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
    mockFallbackPolicySettings({ enabled: 'false' })
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

  // -------- Error fallback execution --------

  it('triggers error fallback email when primary dispatch returns FAILED and policy allows it', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'USER', userId: 'sales-1', email: 'sales@np.pl', displayName: 'Jan' },
    ])
    mockSendInternalEmail
      .mockResolvedValueOnce({
        channel: 'EMAIL',
        recipient: 'sales@np.pl',
        outcome: 'FAILED',
        mode: 'REAL',
        messageId: null,
        errorMessage: 'SMTP primary failure',
      })
      .mockResolvedValueOnce({
        channel: 'EMAIL',
        recipient: 'fallback@np-manager.local',
        outcome: 'SENT',
        mode: 'REAL',
        messageId: 'fallback-msg-1',
        errorMessage: null,
      })

    mockFallbackPolicySettings({
      enabled: 'true',
      recipientEmail: 'fallback@np-manager.local',
      recipientName: 'Fallback BOK',
      applyToFailed: 'true',
      applyToMisconfigured: 'false',
    })

    await dispatchPortingNotification({
      requestId: 'request-fallback-trigger',
      caseNumber: 'FNP-2026-FALLBACK-TRIGGER',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: 'sales-1',
    })

    expect(mockSendInternalEmail).toHaveBeenCalledTimes(2)
    expect(mockSendInternalEmail.mock.calls[1]?.[0]).toMatchObject({
      to: ['fallback@np-manager.local'],
    })

    const fallbackAuditCall = mockPortingRequestEventCreate.mock.calls.find(
      (call) => call[0].data.title === '[ErrorFallback] Zmiana statusu sprawy',
    )
    expect(fallbackAuditCall).toBeDefined()
    expect(fallbackAuditCall?.[0]?.data?.description).toContain('ERROR_FALLBACK_TRIGGERED')
    expect(fallbackAuditCall?.[0]?.data?.description).toContain('fallback@np-manager.local')
  })

  it('writes skipped error fallback audit note when policy is disabled', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'USER', userId: 'sales-1', email: 'sales@np.pl', displayName: 'Jan' },
    ])
    mockSendInternalEmail.mockResolvedValueOnce({
      channel: 'EMAIL',
      recipient: 'sales@np.pl',
      outcome: 'FAILED',
      mode: 'REAL',
      messageId: null,
      errorMessage: 'SMTP down',
    })

    mockFallbackPolicySettings({ enabled: 'false' })

    await dispatchPortingNotification({
      requestId: 'request-fallback-skip',
      caseNumber: 'FNP-2026-FALLBACK-SKIP',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: 'sales-1',
    })

    const fallbackAuditCall = mockPortingRequestEventCreate.mock.calls.find(
      (call) => call[0].data.title === '[ErrorFallback] Zmiana statusu sprawy',
    )
    expect(fallbackAuditCall).toBeDefined()
    expect(fallbackAuditCall?.[0]?.data?.description).toContain('SKIPPED')
    expect(fallbackAuditCall?.[0]?.data?.description).toContain('POLICY_DISABLED')
    expect(mockSendInternalEmail).toHaveBeenCalledTimes(1)
  })

  it('does not create fallback loop when fallback email itself fails', async () => {
    mockResolveRecipients.mockResolvedValueOnce([
      { kind: 'USER', userId: 'sales-1', email: 'sales@np.pl', displayName: 'Jan' },
    ])
    mockSendInternalEmail
      .mockResolvedValueOnce({
        channel: 'EMAIL',
        recipient: 'sales@np.pl',
        outcome: 'FAILED',
        mode: 'REAL',
        messageId: null,
        errorMessage: 'SMTP primary failure',
      })
      .mockResolvedValueOnce({
        channel: 'EMAIL',
        recipient: 'fallback@np-manager.local',
        outcome: 'FAILED',
        mode: 'REAL',
        messageId: null,
        errorMessage: 'SMTP fallback failure',
      })

    mockFallbackPolicySettings({
      enabled: 'true',
      recipientEmail: 'fallback@np-manager.local',
      recipientName: 'Fallback BOK',
      applyToFailed: 'true',
      applyToMisconfigured: 'true',
    })

    await dispatchPortingNotification({
      requestId: 'request-fallback-no-loop',
      caseNumber: 'FNP-2026-FALLBACK-NO-LOOP',
      event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      commercialOwnerUserId: 'sales-1',
    })

    expect(mockSendInternalEmail).toHaveBeenCalledTimes(2)
    const fallbackAuditCall = mockPortingRequestEventCreate.mock.calls.find(
      (call) => call[0].data.title === '[ErrorFallback] Zmiana statusu sprawy',
    )
    expect(fallbackAuditCall?.[0]?.data?.description).toContain('SMTP fallback failure')
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
})
