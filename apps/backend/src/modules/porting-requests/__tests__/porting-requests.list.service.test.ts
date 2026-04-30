import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockPortingRequestFindMany,
  mockPortingRequestCount,
  mockPrismaTransaction,
} = vi.hoisted(() => ({
  mockPortingRequestFindMany: vi.fn(),
  mockPortingRequestCount: vi.fn(),
  mockPrismaTransaction: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    portingRequest: {
      findMany: (...args: unknown[]) => mockPortingRequestFindMany(...args),
      count: (...args: unknown[]) => mockPortingRequestCount(...args),
    },
    $transaction: (fns: Array<() => unknown>) => mockPrismaTransaction(fns),
  },
}))

import {
  getPortingRequestsOperationalSummary,
  listPortingRequests,
} from '../porting-requests.service'

function makeListRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'request-1',
    caseNumber: 'FNP-20260409-ABC123',
    primaryNumber: '221234567',
    rangeStart: null,
    rangeEnd: null,
    numberRangeKind: 'SINGLE',
    confirmedPortDate: null,
    portingMode: 'DAY',
    statusInternal: 'SUBMITTED',
    createdAt: new Date('2026-04-09T10:00:00.000Z'),
    clientId: 'client-1',
    client: {
      id: 'client-1',
      clientType: 'INDIVIDUAL',
      firstName: 'Jan',
      lastName: 'Kowalski',
      companyName: null,
      email: 'jan.kowalski@example.com',
      addressStreet: 'Testowa 1',
      addressCity: 'Warszawa',
      addressZip: '00-001',
    },
    donorOperatorId: 'operator-1',
    donorOperator: { id: 'operator-1', name: 'Orange Polska' },
    assignedUser: null,
    commercialOwner: null,
    events: [],
    ...overrides,
  }
}

const CURRENT_USER_ID = 'auth-user-1'

describe('listPortingRequests - ownership filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // $transaction receives an array of Promises and resolves them
    mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg)
      return undefined
    })

    mockPortingRequestCount.mockResolvedValue(0)
    mockPortingRequestFindMany.mockResolvedValue([])
  })

  it('ALL - no assignedUserId constraint in where clause', async () => {
    mockPortingRequestCount.mockResolvedValue(1)
    mockPortingRequestFindMany.mockResolvedValue([makeListRow()])

    await listPortingRequests(
      { ownership: 'ALL', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const countCall = mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }
    expect(countCall.where).not.toHaveProperty('assignedUserId')
  })

  it('MINE - filters by authenticated user id from server, not from client input', async () => {
    const assignedRow = makeListRow({
      assignedUser: {
        id: CURRENT_USER_ID,
        email: 'auth-user@np-manager.local',
        firstName: 'Auth',
        lastName: 'User',
        role: 'BOK_CONSULTANT',
        isActive: true,
      },
    })

    mockPortingRequestCount.mockResolvedValue(1)
    mockPortingRequestFindMany.mockResolvedValue([assignedRow])

    const result = await listPortingRequests(
      { ownership: 'MINE', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const countCall = mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }
    expect(countCall.where).toMatchObject({ assignedUserId: CURRENT_USER_ID })

    const findManyCall = mockPortingRequestFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> }
    expect(findManyCall.where).toMatchObject({ assignedUserId: CURRENT_USER_ID })

    expect(result.items).toHaveLength(1)
    expect(result.pagination.total).toBe(1)
  })

  it('MINE - total and pagination reflect only assigned records', async () => {
    mockPortingRequestCount.mockResolvedValue(3)
    mockPortingRequestFindMany.mockResolvedValue([
      makeListRow({ id: 'r-1' }),
      makeListRow({ id: 'r-2' }),
      makeListRow({ id: 'r-3' }),
    ])

    const result = await listPortingRequests(
      { ownership: 'MINE', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    expect(result.pagination.total).toBe(3)
    expect(result.pagination.totalPages).toBe(1)
    expect(result.items).toHaveLength(3)
  })

  it('UNASSIGNED - filters to assignedUserId === null', async () => {
    mockPortingRequestCount.mockResolvedValue(2)
    mockPortingRequestFindMany.mockResolvedValue([
      makeListRow({ id: 'r-1' }),
      makeListRow({ id: 'r-2' }),
    ])

    await listPortingRequests(
      { ownership: 'UNASSIGNED', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const countCall = mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }
    expect(countCall.where).toMatchObject({ assignedUserId: null })

    const findManyCall = mockPortingRequestFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> }
    expect(findManyCall.where).toMatchObject({ assignedUserId: null })
  })

  it('UNASSIGNED - returns correct pagination total', async () => {
    mockPortingRequestCount.mockResolvedValue(5)
    mockPortingRequestFindMany.mockResolvedValue(Array.from({ length: 5 }, (_, i) =>
      makeListRow({ id: `r-${i + 1}` }),
    ))

    const result = await listPortingRequests(
      { ownership: 'UNASSIGNED', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    expect(result.pagination.total).toBe(5)
    expect(result.items).toHaveLength(5)
  })

  it('ownership filter is applied before count() - count reflects filtered set, not all records', async () => {
    mockPortingRequestCount.mockResolvedValue(1)
    mockPortingRequestFindMany.mockResolvedValue([makeListRow()])

    await listPortingRequests(
      { ownership: 'MINE', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const countWhere = (mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    const findManyWhere = (mockPortingRequestFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where

    expect(countWhere).toMatchObject({ assignedUserId: CURRENT_USER_ID })
    expect(findManyWhere).toMatchObject({ assignedUserId: CURRENT_USER_ID })
  })
})

describe('listPortingRequests - commercial owner and notification health filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg)
      return undefined
    })

    mockPortingRequestCount.mockResolvedValue(0)
    mockPortingRequestFindMany.mockResolvedValue([])
  })

  it('WITH_OWNER - filters to records with commercialOwnerUserId', async () => {
    await listPortingRequests(
      { commercialOwnerFilter: 'WITH_OWNER', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const countWhere = (mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    expect(countWhere).toMatchObject({ commercialOwnerUserId: { not: null } })
  })

  it('WITHOUT_OWNER - filters to records without commercial owner', async () => {
    await listPortingRequests(
      { commercialOwnerFilter: 'WITHOUT_OWNER', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const countWhere = (mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    expect(countWhere).toMatchObject({ commercialOwnerUserId: null })
  })

  it('MINE - commercial owner filter uses authenticated user id', async () => {
    await listPortingRequests(
      { commercialOwnerFilter: 'MINE', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const countWhere = (mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    expect(countWhere).toMatchObject({ commercialOwnerUserId: CURRENT_USER_ID })
  })

  it('HAS_FAILURES - filters by dispatch audit outcomes FAILED/MISCONFIGURED', async () => {
    await listPortingRequests(
      { notificationHealthFilter: 'HAS_FAILURES', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const countWhere = (mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where

    expect(countWhere).toMatchObject({
      events: {
        some: {
          eventSource: 'INTERNAL',
          eventType: 'NOTE',
          title: { startsWith: '[Dispatch] ' },
          OR: [
            { description: { contains: 'FAILED' } },
            { description: { contains: 'MISCONFIGURED' } },
          ],
        },
      },
    })
  })

  it('NO_FAILURES - excludes requests with dispatch failures', async () => {
    await listPortingRequests(
      { notificationHealthFilter: 'NO_FAILURES', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const countWhere = (mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where

    expect(countWhere).toMatchObject({
      events: {
        none: {
          eventSource: 'INTERNAL',
          eventType: 'NOTE',
          title: { startsWith: '[Dispatch] ' },
        },
      },
    })
  })

  it('maps commercial owner summary and notification failure flag in list item DTO', async () => {
    mockPortingRequestCount.mockResolvedValue(1)
    mockPortingRequestFindMany.mockResolvedValue([
      makeListRow({
        commercialOwner: {
          id: 'sales-1',
          email: 'sales-1@np-manager.local',
          firstName: 'Anna',
          lastName: 'Handlowa',
          role: 'SALES',
          isActive: true,
        },
        events: [{ description: 'Dispatch to email FAILED', occurredAt: new Date('2026-04-09T10:00:00.000Z') }],
      }),
    ])

    const result = await listPortingRequests({ page: 1, pageSize: 20 }, CURRENT_USER_ID)

    expect(result.items[0]?.commercialOwnerSummary?.id).toBe('sales-1')
    expect(result.items[0]?.hasNotificationFailures).toBe(true)
  })

  it('maps confirmed port date in list item DTO', async () => {
    mockPortingRequestCount.mockResolvedValue(2)
    mockPortingRequestFindMany.mockResolvedValue([
      makeListRow({
        id: 'with-date',
        confirmedPortDate: new Date('2026-04-17T00:00:00.000Z'),
      }),
      makeListRow({
        id: 'without-date',
        confirmedPortDate: null,
      }),
    ])

    const result = await listPortingRequests({ page: 1, pageSize: 20 }, CURRENT_USER_ID)

    expect(result.items.find((item) => item.id === 'with-date')?.confirmedPortDate).toBe('2026-04-17')
    expect(result.items.find((item) => item.id === 'without-date')?.confirmedPortDate).toBeNull()
  })
})

describe('listPortingRequests - quick work filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-21T09:00:00.000Z'))

    mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg)
      return undefined
    })

    mockPortingRequestCount.mockResolvedValue(0)
    mockPortingRequestFindMany.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('NO_DATE - filters to requests without confirmed port date', async () => {
    await listPortingRequests(
      { quickWorkFilter: 'NO_DATE', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const countWhere = (mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    expect(countWhere).toMatchObject({ confirmedPortDate: null })
  })

  it('NEEDS_ACTION_TODAY - filters to today or overdue cases using Warsaw day boundary', async () => {
    await listPortingRequests(
      { quickWorkFilter: 'NEEDS_ACTION_TODAY', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const countWhere = (mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    expect(countWhere).toMatchObject({
      confirmedPortDate: { lt: new Date('2026-04-22T00:00:00.000Z') },
    })
    const andClauses = countWhere.AND as Array<Record<string, unknown>>
    expect(andClauses).toContainEqual({ statusInternal: { notIn: ['REJECTED', 'CANCELLED', 'PORTED'] } })
  })

  it('URGENT - filters to overdue and current-week cases using PR49 semantics', async () => {
    await listPortingRequests(
      { quickWorkFilter: 'URGENT', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const countWhere = (mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    expect(countWhere).toMatchObject({
      confirmedPortDate: { lt: new Date('2026-04-27T00:00:00.000Z') },
    })
    const andClauses = countWhere.AND as Array<Record<string, unknown>>
    expect(andClauses).toContainEqual({ statusInternal: { notIn: ['REJECTED', 'CANCELLED', 'PORTED'] } })
  })

  it('URGENT - excludes closed statuses via AND (PORTED, CANCELLED, REJECTED)', async () => {
    await listPortingRequests(
      { quickWorkFilter: 'URGENT', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const findManyWhere = (mockPortingRequestFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    const andClauses = findManyWhere.AND as Array<Record<string, unknown>>
    expect(andClauses).toContainEqual({ statusInternal: { notIn: ['REJECTED', 'CANCELLED', 'PORTED'] } })
    expect(findManyWhere).not.toHaveProperty('statusInternal')
  })

  it('NEEDS_ACTION_TODAY - excludes closed statuses via AND (PORTED, CANCELLED, REJECTED)', async () => {
    await listPortingRequests(
      { quickWorkFilter: 'NEEDS_ACTION_TODAY', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const findManyWhere = (mockPortingRequestFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    const andClauses = findManyWhere.AND as Array<Record<string, unknown>>
    expect(andClauses).toContainEqual({ statusInternal: { notIn: ['REJECTED', 'CANCELLED', 'PORTED'] } })
    expect(findManyWhere).not.toHaveProperty('statusInternal')
  })

  it('NO_DATE - does not add statusInternal exclusion', async () => {
    await listPortingRequests(
      { quickWorkFilter: 'NO_DATE', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const findManyWhere = (mockPortingRequestFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    expect(findManyWhere).not.toHaveProperty('statusInternal')
    expect(findManyWhere).not.toHaveProperty('AND')
  })

  it('status=SUBMITTED + quickWorkFilter=URGENT preserves status filter alongside closed exclusion', async () => {
    await listPortingRequests(
      { quickWorkFilter: 'URGENT', status: 'SUBMITTED', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const findManyWhere = (mockPortingRequestFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    expect(findManyWhere.statusInternal).toBe('SUBMITTED')
    const andClauses = findManyWhere.AND as Array<Record<string, unknown>>
    expect(andClauses).toContainEqual({ statusInternal: { notIn: ['REJECTED', 'CANCELLED', 'PORTED'] } })
  })

  it('status=CONFIRMED + quickWorkFilter=NEEDS_ACTION_TODAY preserves status filter alongside closed exclusion', async () => {
    await listPortingRequests(
      { quickWorkFilter: 'NEEDS_ACTION_TODAY', status: 'CONFIRMED', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const findManyWhere = (mockPortingRequestFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    expect(findManyWhere.statusInternal).toBe('CONFIRMED')
    const andClauses = findManyWhere.AND as Array<Record<string, unknown>>
    expect(andClauses).toContainEqual({ statusInternal: { notIn: ['REJECTED', 'CANCELLED', 'PORTED'] } })
  })
})

describe('listPortingRequests - WORK_PRIORITY sort (PR50B)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Wed 2026-04-22 11:00 Warsaw
    vi.setSystemTime(new Date('2026-04-22T09:00:00.000Z'))

    mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg)
      return undefined
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function makeCandidate(
    id: string,
    confirmedPortDate: Date | null,
    createdAt: Date,
  ): { id: string; confirmedPortDate: Date | null; createdAt: Date } {
    return { id, confirmedPortDate, createdAt }
  }

  it('orders rows by work-priority bucket, then date asc, with NO_DATE between THIS_WEEK and LATER', async () => {
    const overdue = makeCandidate(
      'overdue',
      new Date('2026-04-20T00:00:00.000Z'),
      new Date('2026-04-01T10:00:00.000Z'),
    )
    const today = makeCandidate(
      'today',
      new Date('2026-04-22T00:00:00.000Z'),
      new Date('2026-04-01T10:00:00.000Z'),
    )
    const tomorrow = makeCandidate(
      'tomorrow',
      new Date('2026-04-23T00:00:00.000Z'),
      new Date('2026-04-01T10:00:00.000Z'),
    )
    const thisWeek = makeCandidate(
      'this_week',
      new Date('2026-04-26T00:00:00.000Z'),
      new Date('2026-04-01T10:00:00.000Z'),
    )
    const noDateOld = makeCandidate(
      'no_date_old',
      null,
      new Date('2026-03-01T10:00:00.000Z'),
    )
    const noDateNew = makeCandidate(
      'no_date_new',
      null,
      new Date('2026-04-10T10:00:00.000Z'),
    )
    const later = makeCandidate(
      'later',
      new Date('2026-05-11T00:00:00.000Z'),
      new Date('2026-04-01T10:00:00.000Z'),
    )

    const shuffled = [later, noDateNew, thisWeek, overdue, noDateOld, tomorrow, today]
    // First findMany: candidates (id, confirmedPortDate, createdAt)
    // Second findMany: full rows for page
    mockPortingRequestFindMany.mockResolvedValueOnce(shuffled)
    mockPortingRequestFindMany.mockResolvedValueOnce([
      makeListRow({ id: 'overdue', confirmedPortDate: overdue.confirmedPortDate }),
      makeListRow({ id: 'today', confirmedPortDate: today.confirmedPortDate }),
      makeListRow({ id: 'tomorrow', confirmedPortDate: tomorrow.confirmedPortDate }),
      makeListRow({ id: 'this_week', confirmedPortDate: thisWeek.confirmedPortDate }),
      makeListRow({ id: 'no_date_old', confirmedPortDate: null }),
      makeListRow({ id: 'no_date_new', confirmedPortDate: null }),
      makeListRow({ id: 'later', confirmedPortDate: later.confirmedPortDate }),
    ])

    const result = await listPortingRequests(
      { sort: 'WORK_PRIORITY', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    expect(result.pagination.total).toBe(7)
    expect(result.items.map((i) => i.id)).toEqual([
      'overdue',
      'today',
      'tomorrow',
      'this_week',
      'no_date_old',
      'no_date_new',
      'later',
    ])

    // Pagination-safe: second findMany queries only the target page ids
    const secondCall = mockPortingRequestFindMany.mock.calls[1]?.[0] as {
      where: { id: { in: string[] } }
    }
    expect(secondCall.where.id.in).toHaveLength(7)
  })

  it('respects pagination boundaries for WORK_PRIORITY sort', async () => {
    const candidates = Array.from({ length: 5 }, (_, i) =>
      makeCandidate(
        `r-${i + 1}`,
        new Date(`2026-04-${String(20 + i).padStart(2, '0')}T00:00:00.000Z`),
        new Date('2026-04-01T10:00:00.000Z'),
      ),
    )

    mockPortingRequestFindMany.mockResolvedValueOnce(candidates)
    mockPortingRequestFindMany.mockResolvedValueOnce([
      makeListRow({ id: 'r-3' }),
      makeListRow({ id: 'r-4' }),
    ])

    const result = await listPortingRequests(
      { sort: 'WORK_PRIORITY', page: 2, pageSize: 2 },
      CURRENT_USER_ID,
    )

    const pageIds = (
      mockPortingRequestFindMany.mock.calls[1]?.[0] as { where: { id: { in: string[] } } }
    ).where.id.in
    expect(pageIds).toEqual(['r-3', 'r-4'])
    expect(result.pagination.total).toBe(5)
    expect(result.pagination.totalPages).toBe(3)
  })

  it('composes with quickWorkFilter when sorting by WORK_PRIORITY', async () => {
    mockPortingRequestFindMany.mockResolvedValueOnce([])
    mockPortingRequestFindMany.mockResolvedValueOnce([])

    await listPortingRequests(
      { sort: 'WORK_PRIORITY', quickWorkFilter: 'NO_DATE', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const candidatesCall = mockPortingRequestFindMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>
    }
    expect(candidatesCall.where).toMatchObject({ confirmedPortDate: null })
  })
})

describe('listPortingRequests - confirmedPortDate filter (Etap 5I-A)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg)
      return undefined
    })

    mockPortingRequestCount.mockResolvedValue(0)
    mockPortingRequestFindMany.mockResolvedValue([])
  })

  it('confirmedPortDateFrom builds AND with gte', async () => {
    await listPortingRequests(
      { confirmedPortDateFrom: '2026-04-15', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const where = (mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    const andClauses = where.AND as Array<Record<string, unknown>>
    expect(andClauses).toContainEqual({
      confirmedPortDate: { gte: new Date('2026-04-15T00:00:00.000Z') },
    })
  })

  it('confirmedPortDateTo builds AND with lte', async () => {
    await listPortingRequests(
      { confirmedPortDateTo: '2026-04-30', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    const where = (mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    const andClauses = where.AND as Array<Record<string, unknown>>
    expect(andClauses).toContainEqual({
      confirmedPortDate: { lte: new Date('2026-04-30T23:59:59.999Z') },
    })
  })

  it('confirmedPortDateFrom + confirmedPortDateTo builds AND with gte+lte range', async () => {
    await listPortingRequests(
      {
        confirmedPortDateFrom: '2026-04-15',
        confirmedPortDateTo: '2026-04-30',
        page: 1,
        pageSize: 20,
      },
      CURRENT_USER_ID,
    )

    const where = (mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    const andClauses = where.AND as Array<Record<string, unknown>>
    expect(andClauses).toContainEqual({
      confirmedPortDate: {
        gte: new Date('2026-04-15T00:00:00.000Z'),
        lte: new Date('2026-04-30T23:59:59.999Z'),
      },
    })
  })

  it('confirmedPortDateFrom == confirmedPortDateTo filters single day', async () => {
    await listPortingRequests(
      {
        confirmedPortDateFrom: '2026-04-22',
        confirmedPortDateTo: '2026-04-22',
        page: 1,
        pageSize: 20,
      },
      CURRENT_USER_ID,
    )

    const where = (mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    const andClauses = where.AND as Array<Record<string, unknown>>
    expect(andClauses).toContainEqual({
      confirmedPortDate: {
        gte: new Date('2026-04-22T00:00:00.000Z'),
        lte: new Date('2026-04-22T23:59:59.999Z'),
      },
    })
  })

  it('confirmedPortDate filter composes with quickWorkFilter without overwriting', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-21T09:00:00.000Z'))

    try {
      await listPortingRequests(
        {
          quickWorkFilter: 'NEEDS_ACTION_TODAY',
          confirmedPortDateFrom: '2026-04-15',
          page: 1,
          pageSize: 20,
        },
        CURRENT_USER_ID,
      )

      const where = (mockPortingRequestCount.mock.calls[0]?.[0] as {
        where: Record<string, unknown>
      }).where

      // quickWorkFilter sets where.confirmedPortDate directly
      expect(where).toMatchObject({
        confirmedPortDate: { lt: new Date('2026-04-22T00:00:00.000Z') },
      })

      const andClauses = where.AND as Array<Record<string, unknown>>
      // quickWorkFilter pushes status exclusion
      expect(andClauses).toContainEqual({
        statusInternal: { notIn: ['REJECTED', 'CANCELLED', 'PORTED'] },
      })
      // date filter pushed in AND alongside
      expect(andClauses).toContainEqual({
        confirmedPortDate: { gte: new Date('2026-04-15T00:00:00.000Z') },
      })
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('listPortingRequests - column sorting (Etap 5I-A)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg)
      return undefined
    })

    mockPortingRequestCount.mockResolvedValue(0)
    mockPortingRequestFindMany.mockResolvedValue([])
  })

  function findManyOrderBy(): unknown {
    const call = mockPortingRequestFindMany.mock.calls[0]?.[0] as { orderBy: unknown }
    return call.orderBy
  }

  it('default sort (no sort param) is createdAt desc', async () => {
    await listPortingRequests({ page: 1, pageSize: 20 }, CURRENT_USER_ID)
    expect(findManyOrderBy()).toEqual({ createdAt: 'desc' })
  })

  it('CREATED_AT_DESC sort is createdAt desc', async () => {
    await listPortingRequests(
      { sort: 'CREATED_AT_DESC', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )
    expect(findManyOrderBy()).toEqual({ createdAt: 'desc' })
  })

  it('NUMBER_ASC sorts by ported number (primaryNumber/rangeStart/rangeEnd) asc, nulls last', async () => {
    await listPortingRequests(
      { sort: 'NUMBER_ASC', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )
    expect(findManyOrderBy()).toEqual([
      { primaryNumber: { sort: 'asc', nulls: 'last' } },
      { rangeStart: { sort: 'asc', nulls: 'last' } },
      { rangeEnd: { sort: 'asc', nulls: 'last' } },
      { id: 'asc' },
    ])
  })

  it('NUMBER_DESC sorts by ported number desc, nulls last', async () => {
    await listPortingRequests(
      { sort: 'NUMBER_DESC', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )
    expect(findManyOrderBy()).toEqual([
      { primaryNumber: { sort: 'desc', nulls: 'last' } },
      { rangeStart: { sort: 'desc', nulls: 'last' } },
      { rangeEnd: { sort: 'desc', nulls: 'last' } },
      { id: 'asc' },
    ])
  })

  it('STATUS_ASC sorts by statusInternal asc', async () => {
    await listPortingRequests(
      { sort: 'STATUS_ASC', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )
    expect(findManyOrderBy()).toEqual([{ statusInternal: 'asc' }, { id: 'asc' }])
  })

  it('STATUS_DESC sorts by statusInternal desc', async () => {
    await listPortingRequests(
      { sort: 'STATUS_DESC', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )
    expect(findManyOrderBy()).toEqual([{ statusInternal: 'desc' }, { id: 'asc' }])
  })

  it('CONFIRMED_PORT_DATE_ASC sorts by confirmedPortDate asc with nulls last', async () => {
    await listPortingRequests(
      { sort: 'CONFIRMED_PORT_DATE_ASC', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )
    expect(findManyOrderBy()).toEqual([
      { confirmedPortDate: { sort: 'asc', nulls: 'last' } },
      { createdAt: 'desc' },
      { id: 'asc' },
    ])
  })

  it('CONFIRMED_PORT_DATE_DESC sorts by confirmedPortDate desc with nulls last', async () => {
    await listPortingRequests(
      { sort: 'CONFIRMED_PORT_DATE_DESC', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )
    expect(findManyOrderBy()).toEqual([
      { confirmedPortDate: { sort: 'desc', nulls: 'last' } },
      { createdAt: 'desc' },
      { id: 'asc' },
    ])
  })

  it('DONOR_OPERATOR_ASC sorts by donorOperator name asc', async () => {
    await listPortingRequests(
      { sort: 'DONOR_OPERATOR_ASC', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )
    expect(findManyOrderBy()).toEqual([{ donorOperator: { name: 'asc' } }, { id: 'asc' }])
  })

  it('PORTING_MODE_DESC sorts by portingMode desc', async () => {
    await listPortingRequests(
      { sort: 'PORTING_MODE_DESC', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )
    expect(findManyOrderBy()).toEqual([{ portingMode: 'desc' }, { id: 'asc' }])
  })

  it('ASSIGNED_USER_ASC sorts by assignedUser lastName then firstName asc', async () => {
    await listPortingRequests(
      { sort: 'ASSIGNED_USER_ASC', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )
    expect(findManyOrderBy()).toEqual([
      { assignedUser: { lastName: 'asc' } },
      { assignedUser: { firstName: 'asc' } },
      { id: 'asc' },
    ])
  })

  it('COMMERCIAL_OWNER_DESC sorts by commercialOwner lastName then firstName desc', async () => {
    await listPortingRequests(
      { sort: 'COMMERCIAL_OWNER_DESC', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )
    expect(findManyOrderBy()).toEqual([
      { commercialOwner: { lastName: 'desc' } },
      { commercialOwner: { firstName: 'desc' } },
      { id: 'asc' },
    ])
  })

  it('CLIENT_ASC sorts by client companyName then lastName then firstName asc', async () => {
    await listPortingRequests(
      { sort: 'CLIENT_ASC', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )
    expect(findManyOrderBy()).toEqual([
      { client: { companyName: 'asc' } },
      { client: { lastName: 'asc' } },
      { client: { firstName: 'asc' } },
      { id: 'asc' },
    ])
  })

  it('WORK_PRIORITY sort uses candidates select shape, not column orderBy', async () => {
    mockPortingRequestFindMany.mockResolvedValueOnce([
      { id: 'r-1', confirmedPortDate: null, createdAt: new Date('2026-04-01T10:00:00.000Z') },
    ])
    mockPortingRequestFindMany.mockResolvedValueOnce([makeListRow({ id: 'r-1' })])

    await listPortingRequests(
      { sort: 'WORK_PRIORITY', page: 1, pageSize: 20 },
      CURRENT_USER_ID,
    )

    expect(mockPortingRequestFindMany).toHaveBeenCalledTimes(2)
    const candidatesCall = mockPortingRequestFindMany.mock.calls[0]?.[0] as {
      select: Record<string, unknown>
      orderBy?: unknown
    }
    expect(candidatesCall.select).toMatchObject({
      id: true,
      confirmedPortDate: true,
      createdAt: true,
    })
    expect(candidatesCall.orderBy).toBeUndefined()
  })
})

describe('getPortingRequestsOperationalSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg)
      return undefined
    })
  })

  it('returns expected counters including quickWorkCounts', async () => {
    mockPortingRequestCount
      .mockResolvedValueOnce(42) // totalRequests
      .mockResolvedValueOnce(30) // withCommercialOwner
      .mockResolvedValueOnce(12) // withoutCommercialOwner
      .mockResolvedValueOnce(9)  // myCommercialRequests
      .mockResolvedValueOnce(4)  // requestsWithNotificationFailures
      .mockResolvedValueOnce(7)  // urgent
      .mockResolvedValueOnce(3)  // noDate
      .mockResolvedValueOnce(5)  // needsActionToday

    const result = await getPortingRequestsOperationalSummary(
      {
        search: 'FNP-2026',
        status: 'SUBMITTED',
        ownership: 'MINE',
      },
      CURRENT_USER_ID,
    )

    expect(result).toEqual({
      totalRequests: 42,
      withCommercialOwner: 30,
      withoutCommercialOwner: 12,
      myCommercialRequests: 9,
      requestsWithNotificationFailures: 4,
      quickWorkCounts: {
        urgent: 7,
        noDate: 3,
        needsActionToday: 5,
      },
    })
    expect(mockPortingRequestCount).toHaveBeenCalledTimes(8)
  })

  it('summary base counters ignore commercialOwnerFilter and notificationHealthFilter', async () => {
    mockPortingRequestCount
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)

    await getPortingRequestsOperationalSummary(
      {
        commercialOwnerFilter: 'MINE',
        notificationHealthFilter: 'HAS_FAILURES',
      },
      CURRENT_USER_ID,
    )

    const firstCountWhere = (mockPortingRequestCount.mock.calls[0]?.[0] as { where: Record<string, unknown> }).where
    expect(firstCountWhere).not.toHaveProperty('commercialOwnerUserId')
    expect(firstCountWhere).not.toHaveProperty('events')
  })

  it('quickWorkCounts noDate uses confirmedPortDate: null where', async () => {
    mockPortingRequestCount.mockResolvedValue(0)

    await getPortingRequestsOperationalSummary({}, CURRENT_USER_ID)

    // noDate count is the 7th call (index 6)
    const noDateCall = mockPortingRequestCount.mock.calls[6]?.[0] as { where: Record<string, unknown> }
    expect(noDateCall.where).toMatchObject({ confirmedPortDate: null })
  })

  it('quickWorkCounts urgent excludes closed statuses', async () => {
    mockPortingRequestCount.mockResolvedValue(0)

    await getPortingRequestsOperationalSummary({}, CURRENT_USER_ID)

    // urgent count is the 6th call (index 5)
    const urgentCall = mockPortingRequestCount.mock.calls[5]?.[0] as { where: Record<string, unknown> }
    expect(urgentCall.where).toMatchObject({
      statusInternal: { notIn: ['REJECTED', 'CANCELLED', 'PORTED'] },
    })
  })

  it('quickWorkCounts needsActionToday excludes closed statuses', async () => {
    mockPortingRequestCount.mockResolvedValue(0)

    await getPortingRequestsOperationalSummary({}, CURRENT_USER_ID)

    // needsActionToday count is the 8th call (index 7)
    const needsActionCall = mockPortingRequestCount.mock.calls[7]?.[0] as { where: Record<string, unknown> }
    expect(needsActionCall.where).toMatchObject({
      statusInternal: { notIn: ['REJECTED', 'CANCELLED', 'PORTED'] },
    })
  })
})
