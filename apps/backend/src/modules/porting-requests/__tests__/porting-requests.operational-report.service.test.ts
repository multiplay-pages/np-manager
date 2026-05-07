import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockPortingRequestCount,
  mockPrismaTransaction,
} = vi.hoisted(() => ({
  mockPortingRequestCount: vi.fn(),
  mockPrismaTransaction: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    portingRequest: {
      count: (...args: unknown[]) => mockPortingRequestCount(...args),
    },
    $transaction: (fns: Array<() => unknown>) => mockPrismaTransaction(fns),
  },
}))

import { getPortingOperationalReport } from '../porting-requests.service'

const STATUS_ORDER = ['DRAFT', 'SUBMITTED', 'PENDING_DONOR', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'PORTED', 'ERROR'] as const

function makeStatusCounts(overrides: Partial<Record<(typeof STATUS_ORDER)[number], number>> = {}): number[] {
  return STATUS_ORDER.map((s) => overrides[s] ?? 0)
}

describe('getPortingOperationalReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg)
      return undefined
    })

    mockPortingRequestCount.mockResolvedValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns zeros for empty dataset', async () => {
    const result = await getPortingOperationalReport({})

    expect(result.totals.createdInPeriod).toBe(0)
    expect(result.totals.inProgress).toBe(0)
    expect(result.totals.ported).toBe(0)
    expect(result.totals.cancelled).toBe(0)
    expect(result.totals.rejected).toBe(0)
    expect(result.totals.error).toBe(0)
    expect(result.totals.pendingDonor).toBe(0)
    expect(result.byStatus).toHaveLength(8)
    expect(result.attention.errorCount).toBe(0)
    expect(result.attention.pendingDonorCount).toBe(0)
  })

  it('counts createdInPeriod as sum of all status counts', async () => {
    const counts = makeStatusCounts({ SUBMITTED: 3, PORTED: 2, CANCELLED: 1 })
    mockPrismaTransaction.mockResolvedValueOnce(counts)
    mockPortingRequestCount.mockResolvedValue(0)

    const result = await getPortingOperationalReport({ dateFrom: '2026-05-01', dateTo: '2026-05-31' })

    expect(result.totals.createdInPeriod).toBe(6)
    expect(result.totals.ported).toBe(2)
    expect(result.totals.cancelled).toBe(1)
    expect(result.dateFrom).toBe('2026-05-01')
    expect(result.dateTo).toBe('2026-05-31')
  })

  it('counts inProgress as DRAFT+SUBMITTED+PENDING_DONOR+CONFIRMED+ERROR', async () => {
    const counts = makeStatusCounts({
      DRAFT: 1,
      SUBMITTED: 2,
      PENDING_DONOR: 3,
      CONFIRMED: 4,
      ERROR: 5,
      PORTED: 10,
    })
    mockPrismaTransaction.mockResolvedValueOnce(counts)
    mockPortingRequestCount.mockResolvedValue(0)

    const result = await getPortingOperationalReport({})

    expect(result.totals.inProgress).toBe(15)
    expect(result.totals.ported).toBe(10)
  })

  it('counts ERROR and PENDING_DONOR correctly in attention', async () => {
    const counts = makeStatusCounts({ ERROR: 4, PENDING_DONOR: 7 })
    mockPrismaTransaction.mockResolvedValueOnce(counts)
    mockPortingRequestCount.mockResolvedValue(2)

    const result = await getPortingOperationalReport({})

    expect(result.attention.errorCount).toBe(4)
    expect(result.attention.pendingDonorCount).toBe(7)
    expect(result.attention.missingConfirmedPortDateCount).toBe(2)
  })

  it('byStatus includes Polish label for each status', async () => {
    mockPrismaTransaction.mockResolvedValueOnce(makeStatusCounts({ PORTED: 5 }))
    mockPortingRequestCount.mockResolvedValue(0)

    const result = await getPortingOperationalReport({})

    const ported = result.byStatus.find((s) => s.status === 'PORTED')
    expect(ported?.label).toBe('Przeniesiona')
    expect(ported?.count).toBe(5)

    const error = result.byStatus.find((s) => s.status === 'ERROR')
    expect(error?.label).toBe('Błąd')

    const pending = result.byStatus.find((s) => s.status === 'PENDING_DONOR')
    expect(pending?.label).toBe('Oczekuje na dawcę')
  })

  it('uses provided dateFrom/dateTo in response', async () => {
    mockPrismaTransaction.mockResolvedValueOnce(makeStatusCounts())
    mockPortingRequestCount.mockResolvedValue(0)

    const result = await getPortingOperationalReport({ dateFrom: '2026-01-01', dateTo: '2026-01-31' })

    expect(result.dateFrom).toBe('2026-01-01')
    expect(result.dateTo).toBe('2026-01-31')
    expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('defaults to current month when no dates provided', async () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')

    mockPrismaTransaction.mockResolvedValueOnce(makeStatusCounts())
    mockPortingRequestCount.mockResolvedValue(0)

    const result = await getPortingOperationalReport({})

    expect(result.dateFrom).toBe(`${year}-${month}-01`)
    expect(result.dateTo.startsWith(`${year}-${month}-`)).toBe(true)
  })
})
