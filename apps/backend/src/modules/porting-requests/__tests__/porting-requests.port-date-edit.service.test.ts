import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockPortingRequestFindUnique,
  mockTransaction,
  mockUpdate,
  mockEventCreate,
  mockLogAuditEvent,
  mockGetPortingCommunicationHistoryItems,
} = vi.hoisted(() => ({
  mockPortingRequestFindUnique: vi.fn(),
  mockTransaction: vi.fn(),
  mockUpdate: vi.fn(),
  mockEventCreate: vi.fn(),
  mockLogAuditEvent: vi.fn(),
  mockGetPortingCommunicationHistoryItems: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    portingRequest: {
      findUnique: (...args: unknown[]) => mockPortingRequestFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

vi.mock('../../../shared/audit/audit.service', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}))

vi.mock('../../pli-cbd/pli-cbd.adapter', () => ({
  PLI_CBD_TRIGGER_SELECT: {},
  portingRequestPliCbdAdapter: {},
}))

vi.mock('../../pli-cbd/pli-cbd.integration-tracker', () => ({
  createFailedIntegrationAttempt: vi.fn(),
  getPliCbdIntegrationEvents: vi.fn(),
  withPliCbdIntegrationTracking: vi.fn(),
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

import { updatePortingRequestPortDate } from '../porting-requests.service'

function makeCurrent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-1',
    statusInternal: 'SUBMITTED',
    confirmedPortDate: null,
    ...overrides,
  }
}

function makeDetailRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-1',
    caseNumber: 'FNP-20260101-ABCDEF',
    clientId: 'client-1',
    numberType: 'FIXED_LINE',
    numberRangeKind: 'SINGLE',
    primaryNumber: '221234567',
    rangeStart: null,
    rangeEnd: null,
    requestDocumentNumber: null,
    donorRoutingNumber: '2600',
    recipientRoutingNumber: '2700',
    sentToExternalSystemAt: null,
    portingMode: 'DAY',
    requestedPortDate: null,
    requestedPortTime: null,
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
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    updatedAt: new Date('2026-01-01T10:00:00.000Z'),
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
    donorOperator: { id: 'op-1', name: 'Donor', shortName: 'DNR', routingNumber: '2600', isActive: true },
    recipientOperator: { id: 'op-2', name: 'Recipient', shortName: 'RCP', routingNumber: '2700', isActive: true },
    infrastructureOperator: null,
    assignedUser: null,
    commercialOwner: null,
    events: [],
    ...overrides,
  }
}

describe('updatePortingRequestPortDate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogAuditEvent.mockResolvedValue(undefined)
    mockGetPortingCommunicationHistoryItems.mockResolvedValue([])
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        portingRequest: { update: (...a: unknown[]) => mockUpdate(...a) },
        portingRequestEvent: { create: (...a: unknown[]) => mockEventCreate(...a) },
      }),
    )
    mockUpdate.mockResolvedValue({})
    mockEventCreate.mockResolvedValue({})
  })

  it('sets confirmedPortDate, writes [PortDateEdit] NOTE and audit entry', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(makeCurrent())
    mockPortingRequestFindUnique.mockResolvedValueOnce(
      makeDetailRow({ confirmedPortDate: new Date('2026-05-15') }),
    )

    await updatePortingRequestPortDate('req-1', '2026-05-15', 'actor-1', 'BOK_CONSULTANT', '127.0.0.1', 'test')

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'req-1' },
      data: { confirmedPortDate: new Date('2026-05-15T00:00:00.000Z') },
    })

    expect(mockEventCreate).toHaveBeenCalledTimes(1)
    const eventArg = mockEventCreate.mock.calls[0]![0] as { data: { title: string; description: string } }
    expect(eventArg.data.title).toBe('[PortDateEdit] Reczna zmiana daty przeniesienia numeru')
    expect(eventArg.data.description).toContain('BRAK -> 2026-05-15')

    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1)
    expect(mockLogAuditEvent.mock.calls[0]![0]).toMatchObject({
      fieldName: 'confirmedPortDate',
      oldValue: 'BRAK',
      newValue: '2026-05-15',
    })
  })

  it('clears confirmedPortDate (null) and writes audit', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(
      makeCurrent({ confirmedPortDate: new Date('2026-05-15') }),
    )
    mockPortingRequestFindUnique.mockResolvedValueOnce(makeDetailRow())

    await updatePortingRequestPortDate('req-1', null, 'actor-1', 'ADMIN')

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'req-1' },
      data: { confirmedPortDate: null },
    })

    expect(mockLogAuditEvent.mock.calls[0]![0]).toMatchObject({
      fieldName: 'confirmedPortDate',
      oldValue: '2026-05-15',
      newValue: 'BRAK',
    })
  })

  it('returns current detail without side effects when date is unchanged', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(
      makeCurrent({ confirmedPortDate: new Date('2026-05-15') }),
    )
    mockPortingRequestFindUnique.mockResolvedValueOnce(makeDetailRow())

    await updatePortingRequestPortDate('req-1', '2026-05-15', 'actor-1', 'ADMIN')

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockEventCreate).not.toHaveBeenCalled()
    expect(mockLogAuditEvent).not.toHaveBeenCalled()
  })

  it('throws 404 when request does not exist', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(null)

    await expect(
      updatePortingRequestPortDate('missing', '2026-05-15', 'actor-1', 'ADMIN'),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it.each(['REJECTED', 'CANCELLED', 'PORTED'] as const)(
    'rejects edit in terminal status %s',
    async (statusInternal) => {
      mockPortingRequestFindUnique.mockResolvedValueOnce(makeCurrent({ statusInternal }))

      await expect(
        updatePortingRequestPortDate('req-1', '2026-05-15', 'actor-1', 'BOK_CONSULTANT'),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'REQUEST_CLOSED_EDIT_FORBIDDEN',
      })

      expect(mockUpdate).not.toHaveBeenCalled()
    },
  )
})
