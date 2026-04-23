import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockPortingRequestFindUnique,
  mockPrismaTransaction,
  mockPortingRequestUpdate,
  mockPortingRequestCaseHistoryCreate,
  mockPortingRequestEventCreate,
  mockLogAuditEvent,
  mockDispatchPortingNotification,
  mockResolveSystemCapabilities,
  mockGetPortingCommunicationHistoryItems,
} = vi.hoisted(() => ({
  mockPortingRequestFindUnique: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockPortingRequestUpdate: vi.fn(),
  mockPortingRequestCaseHistoryCreate: vi.fn(),
  mockPortingRequestEventCreate: vi.fn(),
  mockLogAuditEvent: vi.fn(),
  mockDispatchPortingNotification: vi.fn(),
  mockResolveSystemCapabilities: vi.fn(),
  mockGetPortingCommunicationHistoryItems: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    portingRequest: {
      findUnique: (...args: unknown[]) => mockPortingRequestFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
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

vi.mock('../../system-capabilities/system-capabilities.service', () => ({
  resolveSystemCapabilities: (...args: unknown[]) => mockResolveSystemCapabilities(...args),
}))

vi.mock('../porting-notification.service', () => ({
  dispatchPortingNotification: (...args: unknown[]) => mockDispatchPortingNotification(...args),
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

import { confirmPortingRequestPortDateManual } from '../porting-requests.service'

function makeCapabilities(mode: 'STANDALONE' | 'PLI_CBD_INTEGRATED') {
  return {
    mode,
    pliCbd: {
      enabled: mode === 'PLI_CBD_INTEGRATED',
      configured: mode === 'PLI_CBD_INTEGRATED',
      active: mode === 'PLI_CBD_INTEGRATED',
      capabilities: {
        export: mode === 'PLI_CBD_INTEGRATED',
        sync: mode === 'PLI_CBD_INTEGRATED',
        diagnostics: mode === 'PLI_CBD_INTEGRATED',
        externalActions: mode === 'PLI_CBD_INTEGRATED',
      },
    },
    resolvedAt: '2026-04-23T10:00:00.000Z',
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
    caseNumber: 'FNP-20260423-XYZ999',
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
    requestedPortDate: new Date('2026-04-28T00:00:00.000Z'),
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
    createdAt: new Date('2026-04-23T09:00:00.000Z'),
    updatedAt: new Date('2026-04-23T09:00:00.000Z'),
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
    events: [],
    ...overrides,
  }
}

describe('confirmPortingRequestPortDateManual', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPortingCommunicationHistoryItems.mockResolvedValue([])
    mockLogAuditEvent.mockResolvedValue(undefined)
    mockDispatchPortingNotification.mockResolvedValue(undefined)
    mockPortingRequestUpdate.mockResolvedValue({})
    mockPortingRequestCaseHistoryCreate.mockResolvedValue({})
    mockPortingRequestEventCreate.mockResolvedValue({})
    mockPrismaTransaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)({
          portingRequest: {
            update: (...args: unknown[]) => mockPortingRequestUpdate(...args),
          },
          portingRequestCaseHistory: {
            create: (...args: unknown[]) => mockPortingRequestCaseHistoryCreate(...args),
          },
          portingRequestEvent: {
            create: (...args: unknown[]) => mockPortingRequestEventCreate(...args),
          },
        })
      }

      if (Array.isArray(arg)) {
        return Promise.all(arg)
      }

      throw new Error('Unsupported transaction invocation shape in test.')
    })
  })

  it('sets confirmed date and transitions SUBMITTED -> CONFIRMED in manual mode', async () => {
    mockResolveSystemCapabilities.mockResolvedValue(makeCapabilities('STANDALONE'))
    mockPortingRequestFindUnique
      .mockResolvedValueOnce({
        id: 'request-1',
        caseNumber: 'FNP-20260423-XYZ999',
        statusInternal: 'SUBMITTED',
        sentToExternalSystemAt: null,
        requestedPortDate: new Date('2026-04-28T00:00:00.000Z'),
        confirmedPortDate: null,
        donorAssignedPortDate: null,
        rejectionReason: null,
      })
      .mockResolvedValueOnce(
        makeDetailRow({
          statusInternal: 'CONFIRMED',
          confirmedPortDate: new Date('2026-05-02T00:00:00.000Z'),
          donorAssignedPortDate: new Date('2026-05-02T00:00:00.000Z'),
        }),
      )

    const result = await confirmPortingRequestPortDateManual(
      'request-1',
      { confirmedPortDate: '2026-05-02', comment: 'Potwierdzenie od dawcy' },
      'user-1',
      'MANAGER',
    )

    expect(mockPortingRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'request-1' },
        data: expect.objectContaining({
          statusInternal: 'CONFIRMED',
          rejectionReason: null,
        }),
      }),
    )

    expect(
      (mockPortingRequestUpdate.mock.calls[0]?.[0] as { data: { confirmedPortDate: Date } }).data
        .confirmedPortDate,
    ).toEqual(new Date('2026-05-02T00:00:00.000Z'))

    expect(mockPortingRequestCaseHistoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'STATUS_CHANGED',
          statusBefore: 'SUBMITTED',
          statusAfter: 'CONFIRMED',
          metadata: expect.objectContaining({
            confirmedPortDate: '2026-05-02',
            statusTransitionApplied: true,
          }),
        }),
      }),
    )

    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STATUS_CHANGE',
        oldValue: 'SUBMITTED',
        newValue: 'CONFIRMED',
      }),
    )

    expect(mockDispatchPortingNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'PORT_DATE_CONFIRMED',
        metadata: expect.objectContaining({
          confirmedPortDate: '2026-05-02',
          statusTransitionApplied: true,
        }),
      }),
    )

    expect(result.statusInternal).toBe('CONFIRMED')
    expect(result.confirmedPortDate).toBe('2026-05-02')
  })

  it('updates date without status transition when request is already CONFIRMED', async () => {
    mockResolveSystemCapabilities.mockResolvedValue(makeCapabilities('STANDALONE'))
    mockPortingRequestFindUnique
      .mockResolvedValueOnce({
        id: 'request-1',
        caseNumber: 'FNP-20260423-XYZ999',
        statusInternal: 'CONFIRMED',
        sentToExternalSystemAt: null,
        requestedPortDate: new Date('2026-04-28T00:00:00.000Z'),
        confirmedPortDate: null,
        donorAssignedPortDate: null,
        rejectionReason: null,
      })
      .mockResolvedValueOnce(
        makeDetailRow({
          statusInternal: 'CONFIRMED',
          confirmedPortDate: new Date('2026-05-03T00:00:00.000Z'),
          donorAssignedPortDate: new Date('2026-05-03T00:00:00.000Z'),
        }),
      )

    await confirmPortingRequestPortDateManual(
      'request-1',
      { confirmedPortDate: '2026-05-03' },
      'user-1',
      'ADMIN',
    )

    const updateCall = mockPortingRequestUpdate.mock.calls[0]?.[0] as {
      data: { statusInternal?: string; confirmedPortDate: Date }
    }
    expect(updateCall.data.statusInternal).toBeUndefined()
    expect(updateCall.data.confirmedPortDate).toEqual(new Date('2026-05-03T00:00:00.000Z'))

    expect(mockPortingRequestCaseHistoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'STATUS_CHANGED',
          statusBefore: null,
          statusAfter: 'CONFIRMED',
          metadata: expect.objectContaining({
            statusTransitionApplied: false,
          }),
        }),
      }),
    )

    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        fieldName: 'confirmedPortDate',
        oldValue: 'BRAK',
        newValue: '2026-05-03',
      }),
    )
  })

  it('rejects action outside standalone mode', async () => {
    mockResolveSystemCapabilities.mockResolvedValue(makeCapabilities('PLI_CBD_INTEGRATED'))

    await expect(
      confirmPortingRequestPortDateManual(
        'request-1',
        { confirmedPortDate: '2026-05-03' },
        'user-1',
        'ADMIN',
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'PORTING_REQUEST_MANUAL_PORT_DATE_CONFIRMATION_NOT_AVAILABLE',
    })

    expect(mockPortingRequestFindUnique).not.toHaveBeenCalled()
    expect(mockPrismaTransaction).not.toHaveBeenCalled()
  })
})
