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

import { updatePortingRequestDetails } from '../porting-requests.service'

function makeCurrent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-1',
    caseNumber: 'FNP-20260101-ABCDEF',
    statusInternal: 'SUBMITTED',
    correspondenceAddress: 'Testowa 1, 00-001 Warszawa',
    contactChannel: 'EMAIL',
    internalNotes: null,
    requestDocumentNumber: 'DOC-1',
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
    requestDocumentNumber: 'DOC-1',
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
    donorOperator: {
      id: 'op-1',
      name: 'Donor',
      shortName: 'DNR',
      routingNumber: '2600',
      isActive: true,
    },
    recipientOperator: {
      id: 'op-2',
      name: 'Recipient',
      shortName: 'RCP',
      routingNumber: '2700',
      isActive: true,
    },
    infrastructureOperator: null,
    assignedUser: null,
    commercialOwner: null,
    events: [],
    ...overrides,
  }
}

describe('updatePortingRequestDetails', () => {
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

  it('updates allowed fields, writes per-field audit and creates [DetailsEdit] NOTE', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(makeCurrent())
    mockPortingRequestFindUnique.mockResolvedValueOnce(
      makeDetailRow({
        correspondenceAddress: 'Nowa 2, 00-002 Warszawa',
        contactChannel: 'SMS',
        internalNotes: 'Oddzwonic jutro',
        requestDocumentNumber: 'DOC-2',
      }),
    )

    const result = await updatePortingRequestDetails(
      'req-1',
      {
        correspondenceAddress: 'Nowa 2, 00-002 Warszawa',
        contactChannel: 'SMS',
        internalNotes: 'Oddzwonic jutro',
        requestDocumentNumber: 'DOC-2',
      },
      'actor-1',
      'BOK_CONSULTANT',
      '127.0.0.1',
      'jest',
    )

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'req-1' },
      data: {
        correspondenceAddress: 'Nowa 2, 00-002 Warszawa',
        contactChannel: 'SMS',
        internalNotes: 'Oddzwonic jutro',
        requestDocumentNumber: 'DOC-2',
      },
    })

    expect(mockEventCreate).toHaveBeenCalledTimes(1)
    const eventArg = mockEventCreate.mock.calls[0]![0] as {
      data: { title: string; description: string; eventType: string }
    }
    expect(eventArg.data.eventType).toBe('NOTE')
    expect(eventArg.data.title.startsWith('[DetailsEdit] ')).toBe(true)
    expect(eventArg.data.description).toContain('Adres korespondencyjny')
    expect(eventArg.data.description).toContain('Kanal kontaktu')
    expect(eventArg.data.description).toContain('Notatki wewnetrzne')
    expect(eventArg.data.description).toContain('Numer dokumentu')

    expect(mockLogAuditEvent).toHaveBeenCalledTimes(4)
    const auditFields = (mockLogAuditEvent.mock.calls as Array<[{ fieldName: string }]>).map(
      (call) => call[0].fieldName,
    )
    expect(auditFields.sort()).toEqual(
      [
        'contactChannel',
        'correspondenceAddress',
        'internalNotes',
        'requestDocumentNumber',
      ].sort(),
    )

    expect(result.caseNumber).toBe('FNP-20260101-ABCDEF')
  })

  it('updates only changed fields and skips unchanged ones', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(makeCurrent())
    mockPortingRequestFindUnique.mockResolvedValueOnce(
      makeDetailRow({ internalNotes: 'Tylko notatka' }),
    )

    await updatePortingRequestDetails(
      'req-1',
      {
        correspondenceAddress: 'Testowa 1, 00-001 Warszawa', // same as current
        contactChannel: 'EMAIL', // same
        internalNotes: 'Tylko notatka', // changed
      },
      'actor-1',
      'BOK_CONSULTANT',
    )

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'req-1' },
      data: { internalNotes: 'Tylko notatka' },
    })
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1)
    expect(mockLogAuditEvent.mock.calls[0]![0]).toMatchObject({
      fieldName: 'internalNotes',
      oldValue: 'BRAK',
      newValue: 'Tylko notatka',
    })
  })

  it('returns current detail without side effects when there are no changes', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(makeCurrent())
    mockPortingRequestFindUnique.mockResolvedValueOnce(makeDetailRow())

    await updatePortingRequestDetails(
      'req-1',
      {
        correspondenceAddress: 'Testowa 1, 00-001 Warszawa',
      },
      'actor-1',
      'ADMIN',
    )

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockEventCreate).not.toHaveBeenCalled()
    expect(mockLogAuditEvent).not.toHaveBeenCalled()
  })

  it('throws 404 when request does not exist', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(null)

    await expect(
      updatePortingRequestDetails(
        'missing',
        { contactChannel: 'SMS' },
        'actor-1',
        'ADMIN',
      ),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockLogAuditEvent).not.toHaveBeenCalled()
  })

  it.each(['REJECTED', 'CANCELLED', 'PORTED'] as const)(
    'rejects edits when request is in terminal status %s',
    async (statusInternal) => {
      mockPortingRequestFindUnique.mockResolvedValueOnce(makeCurrent({ statusInternal }))

      await expect(
        updatePortingRequestDetails(
          'req-1',
          { contactChannel: 'SMS' },
          'actor-1',
          'BOK_CONSULTANT',
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'REQUEST_CLOSED_EDIT_FORBIDDEN',
      })

      expect(mockUpdate).not.toHaveBeenCalled()
      expect(mockLogAuditEvent).not.toHaveBeenCalled()
    },
  )

  it('allows clearing optional fields (null values mapped through)', async () => {
    mockPortingRequestFindUnique.mockResolvedValueOnce(
      makeCurrent({ internalNotes: 'stare', requestDocumentNumber: 'OLD' }),
    )
    mockPortingRequestFindUnique.mockResolvedValueOnce(
      makeDetailRow({ internalNotes: null, requestDocumentNumber: null }),
    )

    await updatePortingRequestDetails(
      'req-1',
      { internalNotes: null, requestDocumentNumber: null },
      'actor-1',
      'ADMIN',
    )

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'req-1' },
      data: { internalNotes: null, requestDocumentNumber: null },
    })

    const auditCalls = mockLogAuditEvent.mock.calls as Array<
      [{ fieldName: string; oldValue: string; newValue: string }]
    >
    expect(
      auditCalls.find((call) => call[0].fieldName === 'internalNotes'),
    ).toBeDefined()
    expect(
      auditCalls.find((call) => call[0].fieldName === 'internalNotes')?.[0].newValue,
    ).toBe('BRAK')
  })
})
