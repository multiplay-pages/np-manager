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

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const whereArg = mockAttemptFindMany.mock.calls[0]![0].where
    expect(whereArg.outcome).toEqual({ in: ['FAILED'] })
  })

  it('adds canRetry=true filter (origin + retryCount)', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalNotificationFailureQueue({ canRetry: true })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const whereArg = mockAttemptFindMany.mock.calls[0]![0].where
    expect(whereArg.attemptOrigin).toEqual({ in: ['PRIMARY', 'RETRY'] })
    expect(whereArg.retryCount).toEqual({ lt: 3 })
  })

  it('adds canRetry=false filter (OR clause)', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalNotificationFailureQueue({ canRetry: false })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const whereArg = mockAttemptFindMany.mock.calls[0]![0].where
    expect(whereArg.OR).toBeDefined()
  })

  it('uses newest sort by default (createdAt desc)', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalNotificationFailureQueue()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const orderByArg = mockAttemptFindMany.mock.calls[0]![0].orderBy
    expect(orderByArg[0]).toEqual({ createdAt: 'desc' })
  })

  it('sort=retryAvailable: canRetry=true items appear before canRetry=false', async () => {
    const older = new Date('2026-04-10T08:00:00.000Z')
    const newer = new Date('2026-04-11T10:00:00.000Z')

    mockAttemptFindMany.mockResolvedValue([
      // canRetry=false (RETRY_LIMIT_REACHED) — newer timestamp
      buildAttempt({ id: 'a1', retryCount: 3, createdAt: newer }),
      // canRetry=true — older timestamp
      buildAttempt({ id: 'a2', retryCount: 0, createdAt: older }),
    ])
    mockAttemptCount.mockResolvedValue(2)

    const result = await getGlobalNotificationFailureQueue({ sort: 'retryAvailable' })

    expect(result.items[0]?.attemptId).toBe('a2') // canRetry=true first
    expect(result.items[1]?.attemptId).toBe('a1') // canRetry=false second
  })

  it('sort=retryAvailable: within each group orders by createdAt DESC', async () => {
    const t1 = new Date('2026-04-09T08:00:00.000Z')
    const t2 = new Date('2026-04-10T10:00:00.000Z')
    const t3 = new Date('2026-04-09T09:00:00.000Z')
    const t4 = new Date('2026-04-11T12:00:00.000Z')

    mockAttemptFindMany.mockResolvedValue([
      // DB returns createdAt DESC, so newer first
      buildAttempt({ id: 'canRetry-newer', retryCount: 0, createdAt: t2 }),
      buildAttempt({ id: 'canRetry-older', retryCount: 1, createdAt: t1 }),
      buildAttempt({ id: 'blocked-newer', retryCount: 3, createdAt: t4 }),
      buildAttempt({ id: 'blocked-older', retryCount: 3, createdAt: t3 }),
    ])
    mockAttemptCount.mockResolvedValue(4)

    const result = await getGlobalNotificationFailureQueue({ sort: 'retryAvailable' })
    const ids = result.items.map((i) => i.attemptId)

    // canRetry=true group first (createdAt DESC within group)
    expect(ids[0]).toBe('canRetry-newer')
    expect(ids[1]).toBe('canRetry-older')
    // canRetry=false group second
    expect(ids[2]).toBe('blocked-newer')
    expect(ids[3]).toBe('blocked-older')
  })

  it('sort=retryAvailable: low retryCount but canRetry=false does not precede canRetry=true', async () => {
    // ERROR_FALLBACK origin: retryCount=0 but canRetry=false (ORIGIN_NOT_RETRYABLE)
    const fallback = buildAttempt({ id: 'fallback', attemptOrigin: 'ERROR_FALLBACK', retryCount: 0 })
    const retryable = buildAttempt({ id: 'retryable', attemptOrigin: 'PRIMARY', retryCount: 2 })

    mockAttemptFindMany.mockResolvedValue([fallback, retryable])
    mockAttemptCount.mockResolvedValue(2)

    const result = await getGlobalNotificationFailureQueue({ sort: 'retryAvailable' })

    expect(result.items[0]?.attemptId).toBe('retryable') // canRetry=true, retryCount=2
    expect(result.items[1]?.attemptId).toBe('fallback')  // canRetry=false despite retryCount=0
  })

  it('sort=retryAvailable: DB query uses createdAt DESC (no retryCount proxy)', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalNotificationFailureQueue({ sort: 'retryAvailable' })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const orderByArg = mockAttemptFindMany.mock.calls[0]![0].orderBy
    expect(orderByArg[0]).toEqual({ createdAt: 'desc' })
    // must NOT use retryCount as DB-level sort proxy
    expect(orderByArg.find((o: Record<string, unknown>) => 'retryCount' in o)).toBeUndefined()
  })

  it('applies limit and offset', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalNotificationFailureQueue({ limit: 10, offset: 20 })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const callArg = mockAttemptFindMany.mock.calls[0]![0]
    expect(callArg.take).toBe(10)
    expect(callArg.skip).toBe(20)
  })

  describe('operationalStatus=MANUAL_INTERVENTION_REQUIRED', () => {
    it('returns only MISCONFIGURED outcome items', async () => {
      mockAttemptFindMany.mockResolvedValue([])
      mockAttemptCount.mockResolvedValue(0)

      await getGlobalNotificationFailureQueue({ operationalStatus: 'MANUAL_INTERVENTION_REQUIRED' })

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const whereArg = mockAttemptFindMany.mock.calls[0]![0].where
      expect(whereArg.OR).toContainEqual({ outcome: 'MISCONFIGURED' })
    })

    it('returns items with failureKind CONFIGURATION via OR clause', async () => {
      mockAttemptFindMany.mockResolvedValue([])
      mockAttemptCount.mockResolvedValue(0)

      await getGlobalNotificationFailureQueue({ operationalStatus: 'MANUAL_INTERVENTION_REQUIRED' })

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const whereArg = mockAttemptFindMany.mock.calls[0]![0].where
      expect(whereArg.OR).toContainEqual({ failureKind: { in: ['CONFIGURATION', 'POLICY'] } })
    })

    it('keeps isLatestForChain=true constraint', async () => {
      mockAttemptFindMany.mockResolvedValue([])
      mockAttemptCount.mockResolvedValue(0)

      await getGlobalNotificationFailureQueue({ operationalStatus: 'MANUAL_INTERVENTION_REQUIRED' })

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const whereArg = mockAttemptFindMany.mock.calls[0]![0].where
      expect(whereArg.isLatestForChain).toBe(true)
    })

    it('does not apply outcome IN filter when operationalStatus is set', async () => {
      mockAttemptFindMany.mockResolvedValue([])
      mockAttemptCount.mockResolvedValue(0)

      await getGlobalNotificationFailureQueue({ operationalStatus: 'MANUAL_INTERVENTION_REQUIRED' })

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const whereArg = mockAttemptFindMany.mock.calls[0]![0].where
      // outcome should not be a simple { in: [...] } filter — the OR clause handles it
      expect(whereArg.outcome).toBeUndefined()
    })

    it('returns MISCONFIGURED items in the result', async () => {
      const misconfiguredAttempt = buildAttempt({ outcome: 'MISCONFIGURED', failureKind: null })
      mockAttemptFindMany.mockResolvedValue([misconfiguredAttempt])
      mockAttemptCount.mockResolvedValue(1)

      const result = await getGlobalNotificationFailureQueue({
        operationalStatus: 'MANUAL_INTERVENTION_REQUIRED',
      })

      expect(result.total).toBe(1)
      expect(result.items[0]?.outcome).toBe('MISCONFIGURED')
    })

    it('returns FAILED+CONFIGURATION items in the result', async () => {
      const configAttempt = buildAttempt({ outcome: 'FAILED', failureKind: 'CONFIGURATION' })
      mockAttemptFindMany.mockResolvedValue([configAttempt])
      mockAttemptCount.mockResolvedValue(1)

      const result = await getGlobalNotificationFailureQueue({
        operationalStatus: 'MANUAL_INTERVENTION_REQUIRED',
      })

      expect(result.total).toBe(1)
      expect(result.items[0]?.failureKind).toBe('CONFIGURATION')
    })

    it('returns FAILED+POLICY items in the result', async () => {
      const policyAttempt = buildAttempt({ outcome: 'FAILED', failureKind: 'POLICY' })
      mockAttemptFindMany.mockResolvedValue([policyAttempt])
      mockAttemptCount.mockResolvedValue(1)

      const result = await getGlobalNotificationFailureQueue({
        operationalStatus: 'MANUAL_INTERVENTION_REQUIRED',
      })

      expect(result.total).toBe(1)
      expect(result.items[0]?.failureKind).toBe('POLICY')
    })
  })

  it('caps limit at 100', async () => {
    mockAttemptFindMany.mockResolvedValue([])
    mockAttemptCount.mockResolvedValue(0)

    await getGlobalNotificationFailureQueue({ limit: 999 })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
})
