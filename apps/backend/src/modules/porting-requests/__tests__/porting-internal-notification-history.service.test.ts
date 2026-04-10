import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockPortingRequestFindUnique,
  mockNotificationFindMany,
  mockPortingRequestEventFindMany,
} = vi.hoisted(() => ({
  mockPortingRequestFindUnique: vi.fn(),
  mockNotificationFindMany: vi.fn(),
  mockPortingRequestEventFindMany: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    portingRequest: {
      findUnique: (...args: unknown[]) => mockPortingRequestFindUnique(...args),
    },
    notification: {
      findMany: (...args: unknown[]) => mockNotificationFindMany(...args),
    },
    portingRequestEvent: {
      findMany: (...args: unknown[]) => mockPortingRequestEventFindMany(...args),
    },
  },
}))

import { getPortingRequestInternalNotifications } from '../porting-internal-notification-history.service'

describe('getPortingRequestInternalNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps user notifications to USER_NOTIFICATION entries', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'request-1' })
    mockNotificationFindMany.mockResolvedValueOnce([
      {
        id: 'notification-1',
        type: 'STATUS_CHANGED',
        title: 'Zmiana statusu sprawy - sprawa FNP-1',
        body: 'Status sprawy zostal zmieniony na: CONFIRMED.',
        sentAt: new Date('2026-04-09T08:00:00.000Z'),
        user: {
          id: 'sales-1',
          email: 'sales@np-manager.local',
          firstName: 'Anna',
          lastName: 'Handlowa',
        },
      },
    ])
    mockPortingRequestEventFindMany.mockResolvedValueOnce([])

    const result = await getPortingRequestInternalNotifications('request-1')

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      entryType: 'USER_NOTIFICATION',
      eventCode: 'STATUS_CHANGED',
      eventLabel: 'Zmiana statusu sprawy',
      channel: 'IN_APP',
      recipient: 'Anna Handlowa (sales@np-manager.local)',
      outcome: 'CREATED',
      mode: null,
      errorMessage: null,
    })
  })

  it('maps team routing notes, dispatch notes and error fallback notes to DTO entries', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'request-2' })
    mockNotificationFindMany.mockResolvedValueOnce([])
    mockPortingRequestEventFindMany.mockResolvedValueOnce([
      {
        id: 'event-routing-1',
        title: 'Powiadomienie zespolowe: Zmiana statusu sprawy',
        description:
          'Rodzaj fallbacku: ROUTING_TEAM. Routing do e-mail: bok@multiplay.pl, sud@multiplay.pl. Kontekst: {"newStatus":"PORTED"}.',
        occurredAt: new Date('2026-04-09T10:00:00.000Z'),
      },
      {
        id: 'event-dispatch-1',
        title: '[Dispatch] Zmiana statusu sprawy',
        description:
          'EMAIL -> bok@multiplay.pl: SENT (tryb: STUB), msgId: stub-123\nTEAMS -> https://teams.example/hook: FAILED (tryb: REAL) - blad: HTTP 500',
        occurredAt: new Date('2026-04-09T10:01:00.000Z'),
      },
      {
        id: 'event-fallback-1',
        title: '[ErrorFallback] Zmiana statusu sprawy',
        description:
          'EMAIL -> fallback@np-manager.local: SKIPPED (tryb: POLICY) - powod: POLICY_DISABLED; sourceOutcomes=FAILED; matchedOutcomes=BRAK; readiness=DISABLED',
        occurredAt: new Date('2026-04-09T10:02:00.000Z'),
      },
    ])

    const result = await getPortingRequestInternalNotifications('request-2')

    expect(result.items).toHaveLength(4)

    const routingEntry = result.items.find((item) => item.entryType === 'TEAM_ROUTING')
    expect(routingEntry).toMatchObject({
      eventCode: 'STATUS_CHANGED',
      channel: 'EMAIL',
      recipient: 'bok@multiplay.pl, sud@multiplay.pl',
      outcome: 'ROUTED',
    })

    const dispatchEntries = result.items.filter((item) => item.entryType === 'TRANSPORT_AUDIT')
    expect(dispatchEntries).toHaveLength(3)

    expect(dispatchEntries[0]).toMatchObject({
      channel: 'EMAIL',
      recipient: 'fallback@np-manager.local',
      outcome: 'SKIPPED',
      mode: 'POLICY',
      errorMessage: null,
    })
    expect(dispatchEntries[1]).toMatchObject({
      channel: 'EMAIL',
      recipient: 'bok@multiplay.pl',
      outcome: 'SENT',
      mode: 'STUB',
      errorMessage: null,
    })
    expect(dispatchEntries[2]).toMatchObject({
      channel: 'TEAMS',
      recipient: 'https://teams.example/hook',
      outcome: 'FAILED',
      mode: 'REAL',
      errorMessage: 'HTTP 500',
    })
  })

  it('throws NOT_FOUND when request does not exist', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(null)

    await expect(getPortingRequestInternalNotifications('missing-request')).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(mockNotificationFindMany).not.toHaveBeenCalled()
    expect(mockPortingRequestEventFindMany).not.toHaveBeenCalled()
  })
})
