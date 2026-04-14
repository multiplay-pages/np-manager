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

import { getGlobalNotificationFailureQueue } from '../global-notification-failure-queue.service'

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
    outcome: 'FAILED',
    failureKind: 'DELIVERY',
    retryCount: 0,
    isLatestForChain: true,
    createdAt: new Date('2026-04-11T10:00:00.000Z'),
    ...overrides,
  }
}

describe('getGlobalNotificationFailureQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns items and total with defaults', async () => {
    const attempt = buildAttempt()
    mockAttemptFindMany.mockResolvedValue([attempt])
    mockAttemptCount.mockResolvedValue(1)

    const result = await getGlobalNotificationFailureQueue()

    expect(result.total).toBe(1)
    expect(result.items).toHaveLength(1)
    const item = result.items[0]
    expect(item).toBeDefined()
    expect(item).toMatchObject({
      attemptId: 'attempt-1',
      requestId: 'request-1',
      caseNumber: 'FNP-20260411-ABC123',
      outcome: 'FAILED',
      canRetry: true,
      retryBlockedReasonCode: null,
    })
  })

  it('maps createdAt to ISO string', async () => {
    mockAttemptFindMany.mockResolvedValue([buildAttempt()])
    mockAttemptCount.mockResolvedValue(1)

    const result = await getGlobalNotificationFailureQueue()

    expect(result.items[0]?.createdAt).toBe('2026-04-11T10:00:00.000Z')
  })

  it('filters by outcome=FAILED only', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalNotificationFailureQueue({ outcomes: ['FAILED'] })

    const whereArg = mockAttemptFindMany.mock.calls[0]![0].where
    expect(whereArg.outcome).toEqual({ in: ['FAILED'] })
  })

  it('adds canRetry=true filter (origin + retryCount)', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalNotificationFailureQueue({ canRetry: true })

    const whereArg = mockAttemptFindMany.mock.calls[0]![0].where
    expect(whereArg.attemptOrigin).toEqual({ in: ['PRIMARY', 'RETRY'] })
    expect(whereArg.retryCount).toEqual({ lt: 3 })
  })

  it('adds canRetry=false filter (OR clause)', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalNotificationFailureQueue({ canRetry: false })

    const whereArg = mockAttemptFindMany.mock.calls[0]![0].where
    expect(whereArg.OR).toBeDefined()
  })

  it('uses newest sort by default (createdAt desc)', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalNotificationFailureQueue()

    const orderByArg = mockAttemptFindMany.mock.calls[0]![0].orderBy
    expect(orderByArg[0]).toEqual({ createdAt: 'desc' })
  })

  it('sort=retryAvailable: canRetry=true items appear before canRetry=false', async () => {
    const older = new Date('2026-04-10T08:00:00.000Z')
    const newer = new Date('2026-04-11T10:00:00.000Z')

    mockAttemptFindMany.mockResolvedValue([
      buildAttempt({ id: 'a1', retryCount: 3, createdAt: newer }),
      buildAttempt({ id: 'a2', retryCount: 0, createdAt: older }),
    ])
    mockAttemptCount.mockResolvedValue(2)

    const result = await getGlobalNotificationFailureQueue({ sort: 'retryAvailable' })

    expect(result.items[0]?.attemptId).toBe('a2')
    expect(result.items[1]?.attemptId).toBe('a1')
  })

  it('sort=retryAvailable: within each group orders by createdAt DESC', async () => {
    const t1 = new Date('2026-04-09T08:00:00.000Z')
    const t2 = new Date('2026-04-10T10:00:00.000Z')
    const t3 = new Date('2026-04-09T09:00:00.000Z')
    const t4 = new Date('2026-04-11T12:00:00.000Z')

    mockAttemptFindMany.mockResolvedValue([
      buildAttempt({ id: 'canRetry-newer', retryCount: 0, createdAt: t2 }),
      buildAttempt({ id: 'canRetry-older', retryCount: 1, createdAt: t1 }),
      buildAttempt({ id: 'blocked-newer', retryCount: 3, createdAt: t4 }),
      buildAttempt({ id: 'blocked-older', retryCount: 3, createdAt: t3 }),
    ])
    mockAttemptCount.mockResolvedValue(4)

    const result = await getGlobalNotificationFailureQueue({ sort: 'retryAvailable' })
    const ids = result.items.map((i) => i.attemptId)

    expect(ids[0]).toBe('canRetry-newer')
    expect(ids[1]).toBe('canRetry-older')
    expect(ids[2]).toBe('blocked-newer')
    expect(ids[3]).toBe('blocked-older')
  })

  it('sort=retryAvailable: low retryCount but canRetry=false does not precede canRetry=true', async () => {
    const fallback = buildAttempt({ id: 'fallback', attemptOrigin: 'ERROR_FALLBACK', retryCount: 0 })
    const retryable = buildAttempt({ id: 'retryable', attemptOrigin: 'PRIMARY', retryCount: 2 })

    mockAttemptFindMany.mockResolvedValue([fallback, retryable])
    mockAttemptCount.mockResolvedValue(2)

    const result = await getGlobalNotificationFailureQueue({ sort: 'retryAvailable' })

    expect(result.items[0]?.attemptId).toBe('retryable')
    expect(result.items[1]?.attemptId).toBe('fallback')
  })

  it('sort=retryAvailable: DB query uses createdAt DESC (no retryCount proxy)', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalNotificationFailureQueue({ sort: 'retryAvailable' })

    const orderByArg = mockAttemptFindMany.mock.calls[0]![0].orderBy
    expect(orderByArg[0]).toEqual({ createdAt: 'desc' })
    expect(orderByArg.find((o: Record<string, unknown>) => 'retryCount' in o)).toBeUndefined()
  })

  it('applies limit and offset', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalNotificationFailureQueue({ limit: 10, offset: 20 })

    const callArg = mockAttemptFindMany.mock.calls[0]![0]
    expect(callArg.take).toBe(10)
    expect(callArg.skip).toBe(20)
  })

  it('caps limit at 100', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalNotificationFailureQueue({ limit: 999 })

    expect(mockAttemptFindMany.mock.calls[0]![0].take).toBe(100)
  })

  it('sets canRetry=false and RETRY_LIMIT_REACHED when retryCount >= 3', async () => {
    mockAttemptFindMany.mockResolvedValue([buildAttempt({ retryCount: 3 })])
    mockAttemptCount.mockResolvedValue(1)

    const result = await getGlobalNotificationFailureQueue()
    const item = result.items[0]

    expect(item).toBeDefined()
    expect(item?.canRetry).toBe(false)
    expect(item?.retryBlockedReasonCode).toBe('RETRY_LIMIT_REACHED')
  })

  it('sets canRetry=false and ORIGIN_NOT_RETRYABLE for ERROR_FALLBACK origin', async () => {
    mockAttemptFindMany.mockResolvedValue([buildAttempt({ attemptOrigin: 'ERROR_FALLBACK' })])
    mockAttemptCount.mockResolvedValue(1)

    const result = await getGlobalNotificationFailureQueue()
    const item = result.items[0]

    expect(item).toBeDefined()
    expect(item?.canRetry).toBe(false)
    expect(item?.retryBlockedReasonCode).toBe('ORIGIN_NOT_RETRYABLE')
  })

  it('filters operationalStatus=MANUAL_INTERVENTION_REQUIRED', async () => {
    mockAttemptFindMany.mockResolvedValue([
      buildAttempt({
        id: 'manual',
        outcome: 'MISCONFIGURED',
        failureKind: 'CONFIGURATION',
      }),
      buildAttempt({
        id: 'retryable',
        outcome: 'FAILED',
        failureKind: 'DELIVERY',
      }),
    ])

    const result = await getGlobalNotificationFailureQueue({
      operationalStatus: 'MANUAL_INTERVENTION_REQUIRED',
    })

    expect(result.total).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.attemptId).toBe('manual')
    expect(result.items[0]?.canRetry).toBe(true)
  })

  it('filters operationalStatus=RETRY_AVAILABLE', async () => {
    mockAttemptFindMany.mockResolvedValue([
      buildAttempt({
        id: 'manual',
        outcome: 'MISCONFIGURED',
        failureKind: 'CONFIGURATION',
      }),
      buildAttempt({
        id: 'retryable',
        outcome: 'FAILED',
        failureKind: 'DELIVERY',
      }),
    ])

    const result = await getGlobalNotificationFailureQueue({
      operationalStatus: 'RETRY_AVAILABLE',
    })

    expect(result.total).toBe(1)
    expect(result.items[0]?.attemptId).toBe('retryable')
  })

  it('filters operationalStatus=RETRY_BLOCKED_EXHAUSTED', async () => {
    mockAttemptFindMany.mockResolvedValue([
      buildAttempt({
        id: 'exhausted',
        retryCount: 3,
      }),
      buildAttempt({
        id: 'other-blocked',
        attemptOrigin: 'ERROR_FALLBACK',
      }),
    ])

    const result = await getGlobalNotificationFailureQueue({
      operationalStatus: 'RETRY_BLOCKED_EXHAUSTED',
    })

    expect(result.total).toBe(1)
    expect(result.items[0]?.attemptId).toBe('exhausted')
    expect(result.items[0]?.retryBlockedReasonCode).toBe('RETRY_LIMIT_REACHED')
  })

  it('filters operationalStatus=RETRY_BLOCKED_OTHER', async () => {
    mockAttemptFindMany.mockResolvedValue([
      buildAttempt({
        id: 'exhausted',
        retryCount: 3,
      }),
      buildAttempt({
        id: 'other-blocked',
        attemptOrigin: 'ERROR_FALLBACK',
      }),
    ])

    const result = await getGlobalNotificationFailureQueue({
      operationalStatus: 'RETRY_BLOCKED_OTHER',
    })

    expect(result.total).toBe(1)
    expect(result.items[0]?.attemptId).toBe('other-blocked')
    expect(result.items[0]?.retryBlockedReasonCode).toBe('ORIGIN_NOT_RETRYABLE')
  })

  it('does not include manual intervention records in retry available filter', async () => {
    mockAttemptFindMany.mockResolvedValue([
      buildAttempt({
        id: 'manual',
        outcome: 'MISCONFIGURED',
        failureKind: 'CONFIGURATION',
      }),
      buildAttempt({
        id: 'retryable',
        outcome: 'FAILED',
        failureKind: 'DELIVERY',
      }),
    ])

    const result = await getGlobalNotificationFailureQueue({
      operationalStatus: 'RETRY_AVAILABLE',
    })

    expect(result.items.map((item) => item.attemptId)).not.toContain('manual')
  })

  it('does not include RETRY_LIMIT_REACHED records in retry blocked other filter', async () => {
    mockAttemptFindMany.mockResolvedValue([
      buildAttempt({
        id: 'exhausted',
        retryCount: 3,
      }),
      buildAttempt({
        id: 'other-blocked',
        attemptOrigin: 'ERROR_FALLBACK',
      }),
    ])

    const result = await getGlobalNotificationFailureQueue({
      operationalStatus: 'RETRY_BLOCKED_OTHER',
    })

    expect(result.items.map((item) => item.attemptId)).not.toContain('exhausted')
  })
})
