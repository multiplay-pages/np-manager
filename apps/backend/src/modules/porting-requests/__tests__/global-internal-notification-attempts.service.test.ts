import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAttemptFindMany, mockAttemptCount } = vi.hoisted(() => ({
  mockAttemptFindMany: vi.fn(),
  mockAttemptCount: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    internalNotificationDeliveryAttempt: {
      findMany: (...args: unknown[]) => mockAttemptFindMany(...args),
      count: (...args: unknown[]) => mockAttemptCount(...args),
    },
  },
}))

import { getGlobalInternalNotificationAttempts } from '../global-internal-notification-attempts.service'

function buildAttempt(overrides: Record<string, unknown> = {}) {
  return {
    id: 'attempt-1',
    requestId: 'request-1',
    request: { caseNumber: 'FNP-20260411-ABC123' },
    eventCode: 'STATUS_CHANGED',
    eventLabel: 'Zmiana statusu sprawy',
    attemptOrigin: 'PRIMARY',
    channel: 'EMAIL',
    recipient: 'bok@test.pl',
    mode: 'REAL',
    outcome: 'FAILED',
    errorCode: 'DELIVERY_FAILED',
    errorMessage: 'Timeout SMTP',
    failureKind: 'DELIVERY',
    retryOfAttemptId: null,
    retryCount: 0,
    isLatestForChain: true,
    triggeredByUserId: 'manager-1',
    triggeredByUser: {
      firstName: 'Marta',
      lastName: 'Manager',
      email: 'manager@np-manager.local',
    },
    createdAt: new Date('2026-04-11T10:00:00.000Z'),
    ...overrides,
  }
}

describe('getGlobalInternalNotificationAttempts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns global attempts with request case number and retry eligibility', async () => {
    mockAttemptFindMany.mockResolvedValue([buildAttempt()])
    mockAttemptCount.mockResolvedValue(1)

    const result = await getGlobalInternalNotificationAttempts()

    expect(result.total).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      attemptId: 'attempt-1',
      requestId: 'request-1',
      caseNumber: 'FNP-20260411-ABC123',
      eventCode: 'STATUS_CHANGED',
      eventLabel: 'Zmiana statusu sprawy',
      recipient: 'bok@test.pl',
      channel: 'EMAIL',
      outcome: 'FAILED',
      retryCount: 0,
      canRetry: true,
      retryBlockedReasonCode: null,
      errorMessage: 'Timeout SMTP',
      createdAt: '2026-04-11T10:00:00.000Z',
    })
  })

  it('includes triggered user display name when available', async () => {
    mockAttemptFindMany.mockResolvedValue([buildAttempt()])
    mockAttemptCount.mockResolvedValue(1)

    const result = await getGlobalInternalNotificationAttempts()

    expect(result.items[0]?.triggeredByDisplayName).toBe(
      'Marta Manager (manager@np-manager.local)',
    )
  })

  it('returns retry blocked reason for non-retryable successful attempt', async () => {
    mockAttemptFindMany.mockResolvedValue([
      buildAttempt({
        outcome: 'SENT',
        errorCode: null,
        errorMessage: null,
        failureKind: null,
      }),
    ])
    mockAttemptCount.mockResolvedValue(1)

    const result = await getGlobalInternalNotificationAttempts()

    expect(result.items[0]?.canRetry).toBe(false)
    expect(result.items[0]?.retryBlockedReasonCode).toBe('OUTCOME_NOT_RETRYABLE')
  })

  it('orders newest first and applies limit and offset', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalInternalNotificationAttempts({ limit: 10, offset: 20 })

    const callArg = mockAttemptFindMany.mock.calls[0]![0]
    expect(callArg.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'asc' }])
    expect(callArg.take).toBe(10)
    expect(callArg.skip).toBe(20)
  })

  it('caps limit at 100', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalInternalNotificationAttempts({ limit: 999 })

    expect(mockAttemptFindMany.mock.calls[0]![0].take).toBe(100)
  })
})
