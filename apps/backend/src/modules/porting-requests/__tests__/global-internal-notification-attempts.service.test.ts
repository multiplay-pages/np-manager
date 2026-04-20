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

  it('filters by outcome', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalInternalNotificationAttempts({
      outcome: 'FAILED',
    })

    const findManyWhere = mockAttemptFindMany.mock.calls[0]![0].where
    const countWhere = mockAttemptCount.mock.calls[0]![0].where
    expect(findManyWhere).toEqual({
      outcome: 'FAILED',
    })
    expect(countWhere).toEqual(findManyWhere)
  })

  it('filters by channel', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalInternalNotificationAttempts({
      channel: 'TEAMS',
    })

    const findManyWhere = mockAttemptFindMany.mock.calls[0]![0].where
    const countWhere = mockAttemptCount.mock.calls[0]![0].where
    expect(findManyWhere).toEqual({
      channel: 'TEAMS',
    })
    expect(countWhere).toEqual(findManyWhere)
  })

  it('filters by outcome and channel together', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalInternalNotificationAttempts({
      outcome: 'FAILED',
      channel: 'TEAMS',
    })

    const findManyWhere = mockAttemptFindMany.mock.calls[0]![0].where
    const countWhere = mockAttemptCount.mock.calls[0]![0].where
    expect(findManyWhere).toEqual({
      outcome: 'FAILED',
      channel: 'TEAMS',
    })
    expect(countWhere).toEqual(findManyWhere)
  })

  it('filters retryableOnly after mapping without adding retry fields to Prisma where', async () => {
    mockAttemptFindMany.mockResolvedValue([
      buildAttempt({ id: 'retryable', outcome: 'FAILED', retryCount: 0 }),
      buildAttempt({ id: 'sent', outcome: 'SENT', retryCount: 0 }),
      buildAttempt({ id: 'exhausted', outcome: 'FAILED', retryCount: 3 }),
      buildAttempt({ id: 'fallback', outcome: 'FAILED', attemptOrigin: 'ERROR_FALLBACK' }),
    ])

    const result = await getGlobalInternalNotificationAttempts({ retryableOnly: true })

    expect(mockAttemptFindMany.mock.calls[0]![0]).not.toHaveProperty('where')
    expect(mockAttemptFindMany.mock.calls[0]![0]).not.toHaveProperty('take')
    expect(mockAttemptFindMany.mock.calls[0]![0]).not.toHaveProperty('skip')
    expect(mockAttemptCount).not.toHaveBeenCalled()
    expect(result.items.map((item) => item.attemptId)).toEqual(['retryable'])
  })

  it('keeps outcome and channel in Prisma where when retryableOnly filters post-map', async () => {
    mockAttemptFindMany.mockResolvedValue([
      buildAttempt({ id: 'retryable-teams', channel: 'TEAMS' }),
      buildAttempt({ id: 'blocked-teams', channel: 'TEAMS', retryCount: 3 }),
    ])

    const result = await getGlobalInternalNotificationAttempts({
      outcome: 'FAILED',
      channel: 'TEAMS',
      retryableOnly: true,
    })

    expect(mockAttemptFindMany.mock.calls[0]![0].where).toEqual({
      outcome: 'FAILED',
      channel: 'TEAMS',
    })
    expect(result.items.map((item) => item.attemptId)).toEqual(['retryable-teams'])
  })

  it('uses filtered retryableOnly total before pagination', async () => {
    mockAttemptFindMany.mockResolvedValue([
      buildAttempt({ id: 'retryable-1' }),
      buildAttempt({ id: 'blocked', retryCount: 3 }),
      buildAttempt({ id: 'retryable-2', retryCount: 1 }),
    ])

    const result = await getGlobalInternalNotificationAttempts({
      retryableOnly: true,
      limit: 1,
      offset: 1,
    })

    expect(result.total).toBe(2)
    expect(result.items.map((item) => item.attemptId)).toEqual(['retryable-2'])
  })

  it('caps limit at 100', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalInternalNotificationAttempts({ limit: 999 })

    expect(mockAttemptFindMany.mock.calls[0]![0].take).toBe(100)
  })
})
