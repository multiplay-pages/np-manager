import { beforeEach, describe, expect, it, vi } from 'vitest'

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
})

describe('getPortingRequestsOperationalSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg)
      return undefined
    })
  })

  it('returns expected counters', async () => {
    mockPortingRequestCount
      .mockResolvedValueOnce(42)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(4)

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
    })
    expect(mockPortingRequestCount).toHaveBeenCalledTimes(5)
  })

  it('summary base counters ignore commercialOwnerFilter and notificationHealthFilter', async () => {
    mockPortingRequestCount
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)

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
})
