import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPortingRequestFindUnique, mockPortingRequestEventFindMany } = vi.hoisted(() => ({
  mockPortingRequestFindUnique: vi.fn(),
  mockPortingRequestEventFindMany: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    portingRequest: {
      findUnique: (...args: unknown[]) => mockPortingRequestFindUnique(...args),
    },
    portingRequestEvent: {
      findMany: (...args: unknown[]) => mockPortingRequestEventFindMany(...args),
    },
  },
}))

import { getPortingRequestNotificationFailures } from '../porting-notification-failure-history.service'

describe('getPortingRequestNotificationFailures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps failed attempts and classifies FAILED vs MISCONFIGURED', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'request-1' })
    mockPortingRequestEventFindMany.mockResolvedValueOnce([
      {
        id: 'event-older',
        description: 'EMAIL -> bok@multiplay.pl: MISCONFIGURED (tryb: REAL) - blad: Brak konfiguracji SMTP',
        occurredAt: new Date('2026-04-09T09:00:00.000Z'),
      },
      {
        id: 'event-newer',
        description:
          'TEAMS -> https://teams.example/hook: FAILED (tryb: REAL) - blad: HTTP 500\nEMAIL -> bok@multiplay.pl: SENT (tryb: REAL), msgId: abc',
        occurredAt: new Date('2026-04-09T10:00:00.000Z'),
      },
    ])

    const result = await getPortingRequestNotificationFailures('request-1')

    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toMatchObject({
      id: 'event-newer-1',
      outcome: 'FAILED',
      channel: 'TEAMS',
      isDeliveryIssue: true,
      isConfigurationIssue: false,
    })
    expect(result.items[1]).toMatchObject({
      id: 'event-older-1',
      outcome: 'MISCONFIGURED',
      channel: 'EMAIL',
      isDeliveryIssue: false,
      isConfigurationIssue: true,
    })
  })

  it('keeps newest failures first', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'request-2' })
    mockPortingRequestEventFindMany.mockResolvedValueOnce([
      {
        id: 'event-1',
        description: 'EMAIL -> a@np-manager.local: FAILED (tryb: REAL) - blad: timeout',
        occurredAt: new Date('2026-04-09T08:00:00.000Z'),
      },
      {
        id: 'event-2',
        description: 'EMAIL -> b@np-manager.local: FAILED (tryb: REAL) - blad: timeout',
        occurredAt: new Date('2026-04-09T11:00:00.000Z'),
      },
    ])

    const result = await getPortingRequestNotificationFailures('request-2')

    expect(result.items.map((item) => item.id)).toEqual(['event-2-1', 'event-1-1'])
  })

  it('uses defensive fallback for unstructured lines', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'request-3' })
    mockPortingRequestEventFindMany.mockResolvedValueOnce([
      {
        id: 'event-raw',
        description: 'Awaria dispatch FAILED bez struktury i bez kanalu.',
        occurredAt: new Date('2026-04-09T12:00:00.000Z'),
      },
    ])

    const result = await getPortingRequestNotificationFailures('request-3')

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      id: 'event-raw-1',
      outcome: 'FAILED',
      channel: 'UNKNOWN',
      isDeliveryIssue: true,
      isConfigurationIssue: false,
    })
    expect(result.items[0]?.technicalDetailsPreview).toContain(
      'Awaria dispatch FAILED bez struktury i bez kanalu.',
    )
  })

  it('applies default limit of 20 items', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'request-4' })
    mockPortingRequestEventFindMany.mockResolvedValueOnce(
      Array.from({ length: 25 }, (_, index) => ({
        id: `event-${index + 1}`,
        description: `EMAIL -> x${index + 1}@np-manager.local: FAILED (tryb: REAL) - blad: timeout`,
        occurredAt: new Date(`2026-04-09T10:${String(index % 60).padStart(2, '0')}:00.000Z`),
      })),
    )

    const result = await getPortingRequestNotificationFailures('request-4')

    expect(result.items).toHaveLength(20)
  })

  it('throws NOT_FOUND when request does not exist', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(null)

    await expect(getPortingRequestNotificationFailures('missing-request')).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(mockPortingRequestEventFindMany).not.toHaveBeenCalled()
  })
})
