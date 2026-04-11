import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPortingRequestFindUnique, mockAttemptFindMany } = vi.hoisted(() => ({
  mockPortingRequestFindUnique: vi.fn(),
  mockAttemptFindMany: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    portingRequest: {
      findUnique: (...args: unknown[]) => mockPortingRequestFindUnique(...args),
    },
    internalNotificationDeliveryAttempt: {
      findMany: (...args: unknown[]) => mockAttemptFindMany(...args),
    },
  },
}))

import { getPortingRequestInternalNotificationAttempts } from '../porting-internal-notification-attempts.service'

describe('getPortingRequestInternalNotificationAttempts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty attempt list for an existing request with no attempts', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'request-1' })
    mockAttemptFindMany.mockResolvedValueOnce([])

    const result = await getPortingRequestInternalNotificationAttempts('request-1')

    expect(result).toEqual({
      requestId: 'request-1',
      items: [],
    })
    expect(mockAttemptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { requestId: 'request-1' },
        take: 50,
      }),
    )
  })

  it('maps PRIMARY and ERROR_FALLBACK attempts to DTOs', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({ id: 'request-2' })
    mockAttemptFindMany.mockResolvedValueOnce([
      {
        id: 'attempt-primary',
        requestId: 'request-2',
        eventCode: 'STATUS_CHANGED',
        eventLabel: 'Zmiana statusu sprawy',
        attemptOrigin: 'PRIMARY',
        channel: 'EMAIL',
        recipient: 'bok@multiplay.pl',
        mode: 'REAL',
        outcome: 'FAILED',
        errorCode: 'SMTP_TIMEOUT',
        errorMessage: 'Timeout SMTP',
        failureKind: 'DELIVERY',
        retryOfAttemptId: null,
        retryCount: 0,
        isLatestForChain: true,
        triggeredByUserId: null,
        triggeredByUser: null,
        createdAt: new Date('2026-04-11T10:00:00.000Z'),
      },
      {
        id: 'attempt-fallback',
        requestId: 'request-2',
        eventCode: 'STATUS_CHANGED',
        eventLabel: 'Zmiana statusu sprawy',
        attemptOrigin: 'ERROR_FALLBACK',
        channel: 'EMAIL',
        recipient: 'fallback@np-manager.local',
        mode: 'STUB',
        outcome: 'STUBBED',
        errorCode: null,
        errorMessage: null,
        failureKind: null,
        retryOfAttemptId: null,
        retryCount: 0,
        isLatestForChain: true,
        triggeredByUserId: 'admin-1',
        triggeredByUser: {
          firstName: 'Adam',
          lastName: 'Admin',
          email: 'admin@np-manager.local',
        },
        createdAt: new Date('2026-04-11T10:01:00.000Z'),
      },
    ])

    const result = await getPortingRequestInternalNotificationAttempts('request-2', 10)

    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toMatchObject({
      id: 'attempt-primary',
      attemptOrigin: 'PRIMARY',
      channel: 'EMAIL',
      recipient: 'bok@multiplay.pl',
      mode: 'REAL',
      outcome: 'FAILED',
      failureKind: 'DELIVERY',
      errorMessage: 'Timeout SMTP',
      triggeredByDisplayName: null,
      createdAt: '2026-04-11T10:00:00.000Z',
    })
    expect(result.items[1]).toMatchObject({
      id: 'attempt-fallback',
      attemptOrigin: 'ERROR_FALLBACK',
      outcome: 'STUBBED',
      triggeredByDisplayName: 'Adam Admin (admin@np-manager.local)',
    })
  })

  it('normalizes invalid limits and caps high limits', async () => {
    mockPortingRequestFindUnique.mockResolvedValue({ id: 'request-3' })
    mockAttemptFindMany.mockResolvedValue([])

    await getPortingRequestInternalNotificationAttempts('request-3', -1)
    await getPortingRequestInternalNotificationAttempts('request-3', 500)

    expect(mockAttemptFindMany.mock.calls[0]?.[0]).toMatchObject({ take: 50 })
    expect(mockAttemptFindMany.mock.calls[1]?.[0]).toMatchObject({ take: 100 })
  })

  it('throws NOT_FOUND when request does not exist', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(null)

    await expect(
      getPortingRequestInternalNotificationAttempts('missing-request'),
    ).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(mockAttemptFindMany).not.toHaveBeenCalled()
  })
})
