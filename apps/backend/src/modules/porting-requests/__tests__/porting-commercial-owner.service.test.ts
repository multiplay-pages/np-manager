import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockPortingRequestFindUnique,
  mockPortingRequestUpdate,
  mockUserFindUnique,
  mockUserFindMany,
  mockLogAuditEvent,
  mockGetPortingCommunicationHistoryItems,
  mockDispatchPortingNotification,
} = vi.hoisted(() => ({
  mockPortingRequestFindUnique: vi.fn(),
  mockPortingRequestUpdate: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockLogAuditEvent: vi.fn(),
  mockGetPortingCommunicationHistoryItems: vi.fn(),
  mockDispatchPortingNotification: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    portingRequest: {
      findUnique: (...args: unknown[]) => mockPortingRequestFindUnique(...args),
      update: (...args: unknown[]) => mockPortingRequestUpdate(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
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

vi.mock('../porting-notification.service', () => ({
  dispatchPortingNotification: (...args: unknown[]) => mockDispatchPortingNotification(...args),
}))

import { updateCommercialOwner, listCommercialOwnerCandidates } from '../porting-requests.service'

// ============================================================
// Factory helpers
// ============================================================

function makeSalesUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sales-1',
    email: 'adam.sprzedaz@np-manager.local',
    firstName: 'Adam',
    lastName: 'Sprzedaz',
    role: 'SALES',
    isActive: true,
    ...overrides,
  }
}

function makeClient() {
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

function makeDetailRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'request-1',
    caseNumber: 'FNP-20260409-XYZ999',
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
    commercialOwnerUserId: null,
    createdAt: new Date('2026-04-09T10:00:00.000Z'),
    updatedAt: new Date('2026-04-09T10:00:00.000Z'),
    client: makeClient(),
    donorOperator: makeOperator(),
    recipientOperator: makeOperator({
      id: 'operator-2',
      name: 'G-NET',
      shortName: 'GNET',
      routingNumber: '2700',
    }),
    infrastructureOperator: null,
    assignedUser: null,
    commercialOwner: null,
    ...overrides,
  }
}

// ============================================================
// Tests
// ============================================================

describe('updateCommercialOwner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogAuditEvent.mockResolvedValue(undefined)
    mockPortingRequestUpdate.mockResolvedValue(undefined)
    mockGetPortingCommunicationHistoryItems.mockResolvedValue([])
    mockDispatchPortingNotification.mockResolvedValue(undefined)
  })

  it('assigns a valid SALES user as commercial owner', async () => {
    const salesUser = makeSalesUser()

    // 1st findUnique: validate candidate (select id/role/isActive/firstName/lastName)
    mockUserFindUnique.mockResolvedValueOnce(salesUser)
    // 2nd findUnique: find current request (select id/caseNumber/commercialOwnerUserId)
    mockPortingRequestFindUnique.mockResolvedValueOnce({
      id: 'request-1',
      caseNumber: 'FNP-20260409-XYZ999',
      commercialOwnerUserId: null,
    })
    // 3rd findUnique: getPortingRequest (full detail)
    mockPortingRequestFindUnique.mockResolvedValueOnce(
      makeDetailRow({
        commercialOwnerUserId: 'sales-1',
        commercialOwner: {
          id: 'sales-1',
          email: 'adam.sprzedaz@np-manager.local',
          firstName: 'Adam',
          lastName: 'Sprzedaz',
          role: 'SALES',
        },
      }),
    )

    const result = await updateCommercialOwner(
      'request-1',
      { commercialOwnerUserId: 'sales-1' },
      'actor-1',
      'MANAGER',
    )

    expect(mockPortingRequestUpdate).toHaveBeenCalledWith({
      where: { id: 'request-1' },
      data: { commercialOwnerUserId: 'sales-1' },
    })
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        fieldName: 'commercialOwnerUserId',
        oldValue: 'BRAK',
        newValue: 'sales-1',
      }),
    )
    expect(result.commercialOwner).not.toBeNull()
    expect(result.commercialOwner?.displayName).toBe('Adam Sprzedaz')
  })

  it('clears commercial owner when commercialOwnerUserId is null', async () => {
    // No user lookup when clearing (nextOwnerId is null)
    mockPortingRequestFindUnique.mockResolvedValueOnce({
      id: 'request-1',
      caseNumber: 'FNP-20260409-XYZ999',
      commercialOwnerUserId: 'sales-1',
    })
    mockPortingRequestFindUnique.mockResolvedValueOnce(makeDetailRow({ commercialOwner: null }))

    const result = await updateCommercialOwner(
      'request-1',
      { commercialOwnerUserId: null },
      'actor-1',
      'ADMIN',
    )

    // User validation skipped
    expect(mockUserFindUnique).not.toHaveBeenCalled()
    expect(mockPortingRequestUpdate).toHaveBeenCalledWith({
      where: { id: 'request-1' },
      data: { commercialOwnerUserId: null },
    })
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        oldValue: 'sales-1',
        newValue: 'BRAK',
      }),
    )
    expect(result.commercialOwner).toBeNull()
  })

  it('returns current request without side effects when owner is unchanged', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({
      id: 'request-1',
      caseNumber: 'FNP-20260409-XYZ999',
      commercialOwnerUserId: 'sales-1', // same as requested
    })
    // getPortingRequest call for early return
    mockPortingRequestFindUnique.mockResolvedValueOnce(
      makeDetailRow({ commercialOwnerUserId: 'sales-1' }),
    )

    await updateCommercialOwner(
      'request-1',
      { commercialOwnerUserId: 'sales-1' },
      'actor-1',
      'ADMIN',
    )

    // No validation/update/audit/dispatch when value unchanged
    expect(mockUserFindUnique).not.toHaveBeenCalled()
    expect(mockPortingRequestUpdate).not.toHaveBeenCalled()
    expect(mockLogAuditEvent).not.toHaveBeenCalled()
    expect(mockDispatchPortingNotification).not.toHaveBeenCalled()
  })

  it('throws NOT_FOUND when candidate user does not exist', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({
      id: 'request-1',
      caseNumber: 'FNP-20260409-XYZ999',
      commercialOwnerUserId: null,
    })
    mockUserFindUnique.mockResolvedValueOnce(null)

    await expect(
      updateCommercialOwner(
        'request-1',
        { commercialOwnerUserId: 'nonexistent-user' },
        'actor-1',
        'ADMIN',
      ),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(mockPortingRequestUpdate).not.toHaveBeenCalled()
  })

  it('throws BAD_REQUEST when candidate user is inactive', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({
      id: 'request-1',
      caseNumber: 'FNP-20260409-XYZ999',
      commercialOwnerUserId: null,
    })
    mockUserFindUnique.mockResolvedValueOnce(makeSalesUser({ isActive: false }))

    await expect(
      updateCommercialOwner(
        'request-1',
        { commercialOwnerUserId: 'sales-1' },
        'actor-1',
        'ADMIN',
      ),
    ).rejects.toMatchObject({ statusCode: 400, code: 'COMMERCIAL_OWNER_INACTIVE' })

    expect(mockPortingRequestUpdate).not.toHaveBeenCalled()
  })

  it('throws BAD_REQUEST when candidate user does not have SALES role', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce({
      id: 'request-1',
      caseNumber: 'FNP-20260409-XYZ999',
      commercialOwnerUserId: null,
    })
    mockUserFindUnique.mockResolvedValueOnce(makeSalesUser({ role: 'BOK_CONSULTANT' }))

    await expect(
      updateCommercialOwner(
        'request-1',
        { commercialOwnerUserId: 'sales-1' },
        'actor-1',
        'ADMIN',
      ),
    ).rejects.toMatchObject({ statusCode: 400, code: 'COMMERCIAL_OWNER_INVALID_ROLE' })

    expect(mockPortingRequestUpdate).not.toHaveBeenCalled()
  })

  it('throws NOT_FOUND when porting request does not exist', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(null)

    await expect(
      updateCommercialOwner(
        'nonexistent-request',
        { commercialOwnerUserId: 'sales-1' },
        'actor-1',
        'ADMIN',
      ),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(mockUserFindUnique).not.toHaveBeenCalled()
  })
})

describe('listCommercialOwnerCandidates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns active SALES users sorted by lastName, firstName', async () => {
    const salesRows = [
      makeSalesUser({ id: 'sales-1', firstName: 'Adam', lastName: 'Sprzedaz' }),
      makeSalesUser({ id: 'sales-2', firstName: 'Basia', lastName: 'Kowalska' }),
    ]
    mockUserFindMany.mockResolvedValueOnce(salesRows)

    const result = await listCommercialOwnerCandidates()

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, role: 'SALES' },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
    )
    expect(result.users).toHaveLength(2)
    expect(result.users[0]).toMatchObject({
      id: 'sales-1',
      firstName: 'Adam',
      lastName: 'Sprzedaz',
      role: 'SALES',
    })
  })

  it('returns empty list when no SALES users exist', async () => {
    mockUserFindMany.mockResolvedValueOnce([])

    const result = await listCommercialOwnerCandidates()

    expect(result.users).toHaveLength(0)
  })
})
