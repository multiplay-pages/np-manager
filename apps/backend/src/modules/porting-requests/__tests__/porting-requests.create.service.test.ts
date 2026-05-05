import { describe, expect, it, beforeEach, vi } from 'vitest'

const mockClientFindUnique = vi.fn()
const mockOperatorFindUnique = vi.fn()
const mockOperatorFindFirst = vi.fn()
const mockPortingRequestFindFirst = vi.fn()
const mockPortingRequestFindUnique = vi.fn()
const mockPortingRequestCreate = vi.fn()
const mockTransaction = vi.fn()

vi.mock('../../../config/database', () => ({
  prisma: {
    client: {
      findUnique: (...args: unknown[]) => mockClientFindUnique(...args),
    },
    operator: {
      findUnique: (...args: unknown[]) => mockOperatorFindUnique(...args),
      findFirst: (...args: unknown[]) => mockOperatorFindFirst(...args),
    },
    portingRequest: {
      findFirst: (...args: unknown[]) => mockPortingRequestFindFirst(...args),
      findUnique: (...args: unknown[]) => mockPortingRequestFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

vi.mock('../../../shared/audit/audit.service', () => ({
  logAuditEvent: vi.fn(),
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

vi.mock('../porting-events.service', () => ({
  PortingEvents: {
    requestCreated: vi.fn(),
  },
}))

vi.mock('../porting-request-case-history.service', () => ({
  createCaseHistoryEntry: vi.fn(),
}))

import { createPortingRequest } from '../porting-requests.service'
import type { CreatePortingRequestBody } from '../porting-requests.schema'

const ACTIVE_OPERATOR = {
  id: 'op-1',
  name: 'Dawca',
  shortName: 'DAWCA',
  routingNumber: 'OP1',
  isActive: true,
}

const DEFAULT_RECIPIENT = {
  id: 'op-2',
  name: 'Biorca',
  shortName: 'BIORCA',
  routingNumber: 'OP2',
  isActive: true,
}

const CLIENT = {
  id: 'client-1',
  clientType: 'INDIVIDUAL',
  firstName: 'Jan',
  lastName: 'Kowalski',
  companyName: null,
  email: 'jan@example.com',
  addressStreet: 'Testowa 1',
  addressCity: 'Warszawa',
  addressZip: '00-001',
}

const tx = {
  portingRequest: {
    create: (...args: unknown[]) => mockPortingRequestCreate(...args),
  },
}

function makeCreatedRequest(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-05-05T10:00:00.000Z')

  return {
    id: 'created-request',
    caseNumber: 'FNP-20260505-ABC123',
    client: CLIENT,
    numberType: 'FIXED_LINE',
    numberRangeKind: 'SINGLE',
    primaryNumber: '+48221234567',
    rangeStart: null,
    rangeEnd: null,
    requestDocumentNumber: null,
    donorOperator: ACTIVE_OPERATOR,
    recipientOperator: DEFAULT_RECIPIENT,
    infrastructureOperator: null,
    donorOperatorId: ACTIVE_OPERATOR.id,
    recipientOperatorId: DEFAULT_RECIPIENT.id,
    infrastructureOperatorId: null,
    donorRoutingNumber: ACTIVE_OPERATOR.routingNumber,
    recipientRoutingNumber: DEFAULT_RECIPIENT.routingNumber,
    sentToExternalSystemAt: null,
    portingMode: 'DAY',
    requestedPortDate: new Date('2026-05-06T00:00:00.000Z'),
    requestedPortTime: '00:00',
    earliestAcceptablePortDate: null,
    confirmedPortDate: null,
    donorAssignedPortDate: null,
    donorAssignedPortTime: null,
    statusInternal: 'DRAFT',
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
    createdByUserId: 'user-1',
    assignedUser: null,
    assignedAt: null,
    assignedByUserId: null,
    commercialOwner: null,
    events: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeBody(overrides: Partial<CreatePortingRequestBody> = {}): CreatePortingRequestBody {
  return {
    clientId: 'client-1',
    donorOperatorId: 'op-1',
    numberType: 'FIXED_LINE',
    numberRangeKind: 'SINGLE',
    primaryNumber: '+48 22 123 45 67',
    portingMode: 'DAY',
    requestedPortDate: '2026-05-06',
    subscriberKind: 'INDIVIDUAL',
    subscriberFirstName: 'Jan',
    subscriberLastName: 'Kowalski',
    identityType: 'PESEL',
    identityValue: '90010112345',
    correspondenceAddress: 'Testowa 1, 00-001 Warszawa',
    hasPowerOfAttorney: true,
    linkedWholesaleServiceOnRecipientSide: false,
    contactChannel: 'EMAIL',
    ...overrides,
  }
}

describe('createPortingRequest - numbering safeguards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClientFindUnique.mockResolvedValue(CLIENT)
    mockOperatorFindUnique.mockResolvedValue(ACTIVE_OPERATOR)
    mockOperatorFindFirst.mockResolvedValue(DEFAULT_RECIPIENT)
    mockPortingRequestFindFirst.mockResolvedValue(null)
    mockPortingRequestFindUnique.mockResolvedValue(null)
    mockPortingRequestCreate.mockResolvedValue(makeCreatedRequest())
    mockTransaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg)
      if (typeof arg === 'function') return arg(tx)
      return arg
    })
  })

  it('rejects active duplicate request for the same canonical single number with 409', async () => {
    mockPortingRequestFindFirst.mockResolvedValue({
      id: 'existing-request',
      caseNumber: 'FNP-20260501-ABC123',
    })

    await expect(
      createPortingRequest(makeBody(), 'user-1', 'BOK_CONSULTANT'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'ACTIVE_REQUEST_ALREADY_EXISTS_FOR_NUMBER',
    })

    expect(mockPortingRequestFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { primaryNumber: '+48221234567' },
            expect.objectContaining({
              AND: expect.arrayContaining([
                { rangeStart: { lte: '+48221234567' } },
                { rangeEnd: { gte: '+48221234567' } },
              ]),
            }),
          ]),
        }),
      }),
    )
  })

  it('stores canonical single number when no duplicate exists', async () => {
    await createPortingRequest(makeBody(), 'user-1', 'BOK_CONSULTANT')

    expect(mockPortingRequestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          primaryNumber: '+48221234567',
          rangeStart: null,
          rangeEnd: null,
        }),
      }),
    )
  })

  it('stores canonical DDI range when no duplicate exists', async () => {
    mockPortingRequestCreate.mockResolvedValue(
      makeCreatedRequest({
        numberRangeKind: 'DDI_RANGE',
        primaryNumber: '+48225551000',
        rangeStart: '+48225551000',
        rangeEnd: '+48225551099',
        requestedPortDate: null,
        requestedPortTime: null,
        earliestAcceptablePortDate: new Date('2026-05-08T00:00:00.000Z'),
      }),
    )

    await createPortingRequest(
      makeBody({
        numberRangeKind: 'DDI_RANGE',
        primaryNumber: undefined,
        rangeStart: '+48 22 555 10 00',
        rangeEnd: '22 555 10 99',
        portingMode: 'END',
        requestedPortDate: undefined,
        earliestAcceptablePortDate: '2026-05-08',
      }),
      'user-1',
      'BOK_CONSULTANT',
    )

    expect(mockPortingRequestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          primaryNumber: '+48225551000',
          rangeStart: '+48225551000',
          rangeEnd: '+48225551099',
        }),
      }),
    )
  })
})
