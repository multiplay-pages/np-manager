import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockPortingRequestFindUnique,
  mockPortingRequestFindMany,
  mockPortingRequestCount,
  mockPortingRequestUpdate,
  mockPortingRequestAssignmentHistoryCreate,
  mockPortingRequestAssignmentHistoryFindMany,
  mockUserFindUnique,
  mockPrismaTransaction,
  mockLogAuditEvent,
  mockGetPortingCommunicationHistoryItems,
} = vi.hoisted(() => ({
  mockPortingRequestFindUnique: vi.fn(),
  mockPortingRequestFindMany: vi.fn(),
  mockPortingRequestCount: vi.fn(),
  mockPortingRequestUpdate: vi.fn(),
  mockPortingRequestAssignmentHistoryCreate: vi.fn(),
  mockPortingRequestAssignmentHistoryFindMany: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockLogAuditEvent: vi.fn(),
  mockGetPortingCommunicationHistoryItems: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    portingRequest: {
      findUnique: (...args: unknown[]) => mockPortingRequestFindUnique(...args),
      findMany: (...args: unknown[]) => mockPortingRequestFindMany(...args),
      count: (...args: unknown[]) => mockPortingRequestCount(...args),
      update: (...args: unknown[]) => mockPortingRequestUpdate(...args),
    },
    portingRequestAssignmentHistory: {
      create: (...args: unknown[]) => mockPortingRequestAssignmentHistoryCreate(...args),
      findMany: (...args: unknown[]) => mockPortingRequestAssignmentHistoryFindMany(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
  },
}))

vi.mock('../../../shared/audit/audit.service', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}))

vi.mock('../porting-request-communication.service', async () => {
  const actual = await vi.importActual<typeof import('../porting-request-communication.service')>(
    '../porting-request-communication.service',
  )

  return {
    ...actual,
    getPortingCommunicationHistoryItems: (...args: unknown[]) =>
      mockGetPortingCommunicationHistoryItems(...args),
  }
})

import {
  assignPortingRequestToMe,
  getPortingRequest,
  getPortingRequestAssignmentHistory,
  listPortingRequests,
  updatePortingRequestAssignment,
} from '../porting-requests.service'

function makeAssignee(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-2',
    email: 'anna.nowak@np-manager.local',
    firstName: 'Anna',
    lastName: 'Nowak',
    role: 'BOK_CONSULTANT',
    isActive: true,
    ...overrides,
  }
}

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'client-1',
    clientType: 'INDIVIDUAL',
    firstName: 'Jan',
    lastName: 'Kowalski',
    companyName: null,
    email: 'jan.kowalski@example.com',
    addressStreet: 'Testowa 1',
    addressCity: 'Warszawa',
    addressZip: '00-001',
    ...overrides,
  }
}

function makeOperator(overrides: Record<string, unknown> = {}) {
  return {
    id: 'operator-1',
    name: 'Orange Polska',
    shortName: 'ORANGE',
    routingNumber: '2600',
    isActive: true,
    ...overrides,
  }
}

function makeListRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'request-1',
    caseNumber: 'FNP-20260408-ABC123',
    primaryNumber: '221234567',
    rangeStart: null,
    rangeEnd: null,
    numberRangeKind: 'SINGLE',
    portingMode: 'DAY',
    statusInternal: 'SUBMITTED',
    createdAt: new Date('2026-04-08T10:00:00.000Z'),
    clientId: 'client-1',
    client: makeClient(),
    donorOperatorId: 'operator-1',
    donorOperator: { id: 'operator-1', name: 'Orange Polska' },
    assignedUser: null,
    ...overrides,
  }
}

function makeDetailRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'request-1',
    caseNumber: 'FNP-20260408-ABC123',
    clientId: 'client-1',
    numberType: 'FIXED_LINE',
    numberRangeKind: 'SINGLE',
    primaryNumber: '221234567',
    rangeStart: null,
    rangeEnd: null,
    requestDocumentNumber: 'DOC-1',
    donorRoutingNumber: '2600',
    recipientRoutingNumber: '2700',
    sentToExternalSystemAt: null,
    portingMode: 'DAY',
    requestedPortDate: new Date('2026-04-15T00:00:00.000Z'),
    requestedPortTime: '00:00',
    earliestAcceptablePortDate: null,
    confirmedPortDate: null,
    donorAssignedPortDate: null,
    donorAssignedPortTime: null,
    statusInternal: 'SUBMITTED',
    statusPliCbd: null,
    pliCbdCaseId: null,
    pliCbdCaseNumber: null,
    pliCbdPackageId: null,
    pliCbdExportStatus: 'NOT_EXPORTED',
    pliCbdLastSyncAt: null,
    lastExxReceived: null,
    lastPliCbdStatusCode: null,
    lastPliCbdStatusDescription: null,
    rejectionCode: null,
    rejectionReason: null,
    subscriberKind: 'INDIVIDUAL',
    subscriberFirstName: 'Jan',
    subscriberLastName: 'Kowalski',
    subscriberCompanyName: null,
    identityType: 'PESEL',
    identityValue: '90010112345',
    correspondenceAddress: 'Testowa 1, 00-001 Warszawa',
    hasPowerOfAttorney: true,
    linkedWholesaleServiceOnRecipientSide: false,
    contactChannel: 'EMAIL',
    internalNotes: null,
    createdByUserId: 'creator-1',
    assignedAt: null,
    assignedByUserId: null,
    createdAt: new Date('2026-04-08T10:00:00.000Z'),
    updatedAt: new Date('2026-04-08T10:00:00.000Z'),
    client: makeClient(),
    donorOperator: makeOperator(),
    recipientOperator: makeOperator({ id: 'operator-2', name: 'G-NET', shortName: 'GNET', routingNumber: '2700' }),
    infrastructureOperator: null,
    assignedUser: null,
    ...overrides,
  }
}

describe('porting-request assignment service foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetPortingCommunicationHistoryItems.mockResolvedValue([])
    mockLogAuditEvent.mockResolvedValue(undefined)
    mockPortingRequestUpdate.mockResolvedValue(undefined)
    mockPortingRequestAssignmentHistoryCreate.mockResolvedValue(undefined)
    mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg)
      }

      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)({
          portingRequest: {
            update: (...args: unknown[]) => mockPortingRequestUpdate(...args),
          },
          portingRequestAssignmentHistory: {
            create: (...args: unknown[]) => mockPortingRequestAssignmentHistoryCreate(...args),
          },
        })
      }

      throw new Error('Unsupported transaction invocation shape in test.')
    })
  })

  it('assign specific user happy path', async () => {
    mockUserFindUnique.mockResolvedValue(makeAssignee({ id: 'user-2' }))
    mockPortingRequestFindUnique
      .mockResolvedValueOnce({
        id: 'request-1',
        caseNumber: 'FNP-20260408-ABC123',
        assignedUserId: null,
      })
      .mockResolvedValueOnce(
        makeDetailRow({
          assignedUser: makeAssignee({ id: 'user-2' }),
          assignedAt: new Date('2026-04-08T11:00:00.000Z'),
          assignedByUserId: 'actor-1',
        }),
      )

    const result = await updatePortingRequestAssignment(
      'request-1',
      { assignedUserId: 'user-2' },
      'actor-1',
      'ADMIN',
    )

    expect(mockPortingRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'request-1' },
        data: expect.objectContaining({
          assignedUserId: 'user-2',
          assignedByUserId: 'actor-1',
        }),
      }),
    )
    expect(mockPortingRequestAssignmentHistoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          portingRequestId: 'request-1',
          previousAssignedUserId: null,
          nextAssignedUserId: 'user-2',
          changedByUserId: 'actor-1',
        }),
      }),
    )
    expect(result.assignedUser?.id).toBe('user-2')
  })

  it('assign to me happy path', async () => {
    mockUserFindUnique.mockResolvedValue(makeAssignee({ id: 'actor-2' }))
    mockPortingRequestFindUnique
      .mockResolvedValueOnce({
        id: 'request-1',
        caseNumber: 'FNP-20260408-ABC123',
        assignedUserId: null,
      })
      .mockResolvedValueOnce(
        makeDetailRow({
          assignedUser: makeAssignee({ id: 'actor-2', email: 'konsultant@np-manager.local' }),
          assignedAt: new Date('2026-04-08T11:30:00.000Z'),
          assignedByUserId: 'actor-2',
        }),
      )

    const result = await assignPortingRequestToMe(
      'request-1',
      'actor-2',
      'BOK_CONSULTANT',
    )

    expect(mockPortingRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedUserId: 'actor-2',
          assignedByUserId: 'actor-2',
        }),
      }),
    )
    expect(result.assignedUser?.id).toBe('actor-2')
  })

  it('unassign happy path', async () => {
    mockPortingRequestFindUnique
      .mockResolvedValueOnce({
        id: 'request-1',
        caseNumber: 'FNP-20260408-ABC123',
        assignedUserId: 'user-2',
      })
      .mockResolvedValueOnce(
        makeDetailRow({
          assignedUser: null,
          assignedAt: null,
          assignedByUserId: null,
        }),
      )

    const result = await updatePortingRequestAssignment(
      'request-1',
      { assignedUserId: null },
      'actor-1',
      'ADMIN',
    )

    expect(mockPortingRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          assignedUserId: null,
          assignedAt: null,
          assignedByUserId: null,
        },
      }),
    )
    expect(result.assignedUser).toBeNull()
  })

  it('assignment history endpoint returns mapped entries sorted from newest', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({
      id: 'request-1',
      caseNumber: 'FNP-20260408-ABC123',
      assignedUserId: 'user-2',
    })

    mockPortingRequestAssignmentHistoryFindMany.mockResolvedValue([
      {
        id: 'history-2',
        portingRequestId: 'request-1',
        createdAt: new Date('2026-04-08T12:00:00.000Z'),
        previousAssignedUser: makeAssignee({ id: 'user-2', firstName: 'Anna', lastName: 'Nowak' }),
        nextAssignedUser: null,
        changedByUser: makeAssignee({ id: 'admin-1', role: 'ADMIN', firstName: 'System', lastName: 'Admin' }),
      },
      {
        id: 'history-1',
        portingRequestId: 'request-1',
        createdAt: new Date('2026-04-08T11:00:00.000Z'),
        previousAssignedUser: null,
        nextAssignedUser: makeAssignee({ id: 'user-2' }),
        changedByUser: makeAssignee({ id: 'admin-1', role: 'ADMIN' }),
      },
    ])

    const result = await getPortingRequestAssignmentHistory('request-1')

    expect(result.items).toHaveLength(2)
    expect(result.items[0]?.id).toBe('history-2')
    expect(result.items[0]?.changedByUser.displayName).toBe('System Admin')
  })

  it('cannot assign to non-existing user', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    await expect(
      updatePortingRequestAssignment(
        'request-1',
        { assignedUserId: 'unknown-user' },
        'actor-1',
        'ADMIN',
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'ASSIGNEE_NOT_FOUND',
    })

    expect(mockPortingRequestUpdate).not.toHaveBeenCalled()
  })

  it('cannot assign to inactive user', async () => {
    mockUserFindUnique.mockResolvedValue(makeAssignee({ isActive: false }))

    await expect(
      updatePortingRequestAssignment(
        'request-1',
        { assignedUserId: 'user-2' },
        'actor-1',
        'ADMIN',
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'ASSIGNEE_INACTIVE',
    })

    expect(mockPortingRequestUpdate).not.toHaveBeenCalled()
  })

  it('repeated assign for the same user is idempotent', async () => {
    mockUserFindUnique.mockResolvedValue(makeAssignee({ id: 'user-2' }))
    mockPortingRequestFindUnique
      .mockResolvedValueOnce({
        id: 'request-1',
        caseNumber: 'FNP-20260408-ABC123',
        assignedUserId: 'user-2',
      })
      .mockResolvedValueOnce(
        makeDetailRow({
          assignedUser: makeAssignee({ id: 'user-2' }),
          assignedAt: new Date('2026-04-08T11:00:00.000Z'),
          assignedByUserId: 'actor-1',
        }),
      )

    await updatePortingRequestAssignment(
      'request-1',
      { assignedUserId: 'user-2' },
      'actor-1',
      'ADMIN',
    )

    expect(mockPortingRequestUpdate).not.toHaveBeenCalled()
    expect(mockPortingRequestAssignmentHistoryCreate).not.toHaveBeenCalled()
  })

  it('repeated unassign is idempotent', async () => {
    mockPortingRequestFindUnique
      .mockResolvedValueOnce({
        id: 'request-1',
        caseNumber: 'FNP-20260408-ABC123',
        assignedUserId: null,
      })
      .mockResolvedValueOnce(makeDetailRow({ assignedUser: null }))

    await updatePortingRequestAssignment(
      'request-1',
      { assignedUserId: null },
      'actor-1',
      'ADMIN',
    )

    expect(mockPortingRequestUpdate).not.toHaveBeenCalled()
    expect(mockPortingRequestAssignmentHistoryCreate).not.toHaveBeenCalled()
  })

  it('list DTO exposes assigned user summary', async () => {
    mockPortingRequestCount.mockResolvedValue(1)
    mockPortingRequestFindMany.mockResolvedValue([
      makeListRow({
        assignedUser: makeAssignee({ id: 'user-2', email: 'anna.nowak@np-manager.local' }),
      }),
    ])

    const result = await listPortingRequests({ page: 1, pageSize: 20 })

    expect(result.items[0]?.assignedUserSummary?.id).toBe('user-2')
    expect(result.items[0]?.assignedUserSummary?.displayName).toBe('Anna Nowak')
  })

  it('detail DTO exposes assigned user summary', async () => {
    mockPortingRequestFindUnique.mockResolvedValue(
      makeDetailRow({
        assignedUser: makeAssignee({ id: 'user-2' }),
        assignedAt: new Date('2026-04-08T12:00:00.000Z'),
        assignedByUserId: 'actor-1',
      }),
    )

    const result = await getPortingRequest('request-1', 'ADMIN')

    expect(result.assignedUser?.id).toBe('user-2')
    expect(result.assignedAt).toBe('2026-04-08T12:00:00.000Z')
    expect(result.assignedByUserId).toBe('actor-1')
  })
})
