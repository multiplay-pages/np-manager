import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockNotificationCreate, mockPortingRequestEventCreate, mockResolveRecipients } = vi.hoisted(
  () => ({
    mockNotificationCreate: vi.fn(),
    mockPortingRequestEventCreate: vi.fn(),
    mockResolveRecipients: vi.fn(),
  }),
)

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

import { PORTING_NOTIFICATION_EVENT } from '../porting-notification-events'
import { dispatchPortingNotification } from '../porting-notification.service'

describe('dispatchPortingNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotificationCreate.mockResolvedValue(undefined)
    mockPortingRequestEventCreate.mockResolvedValue(undefined)
  })

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
    expect(mockPortingRequestEventCreate).not.toHaveBeenCalled()
  })

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
  })
})
