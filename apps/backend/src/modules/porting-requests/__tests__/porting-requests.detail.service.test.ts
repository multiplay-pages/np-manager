import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindUnique = vi.fn()
const mockCommunicationFindMany = vi.fn()

vi.mock('../../../config/database', () => ({
  prisma: {
    portingRequest: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    portingCommunication: {
      findMany: (...args: unknown[]) => mockCommunicationFindMany(...args),
    },
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

vi.mock('../porting-request-case-history.service', () => ({
  createCaseHistoryEntry: vi.fn(),
}))

import { getPortingRequest } from '../porting-requests.service'

function makeDetailRow() {
  return {
    id: 'req-1',
    caseNumber: 'FNP-DETAIL-001',
    clientId: 'client-1',
    numberType: 'FIXED_LINE',
    numberRangeKind: 'SINGLE',
    primaryNumber: '221234567',
    rangeStart: null,
    rangeEnd: null,
    requestDocumentNumber: 'DOC-1',
    donorRoutingNumber: 'ORANGE',
    recipientRoutingNumber: 'TMOBILE',
    sentToExternalSystemAt: new Date('2026-04-06T09:00:00.000Z'),
    portingMode: 'DAY',
    requestedPortDate: new Date('2026-04-15T00:00:00.000Z'),
    requestedPortTime: null,
    earliestAcceptablePortDate: null,
    confirmedPortDate: new Date('2026-04-16T00:00:00.000Z'),
    donorAssignedPortDate: new Date('2026-04-16T00:00:00.000Z'),
    donorAssignedPortTime: '10:00',
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
    correspondenceAddress: 'ul. Testowa 1, Warszawa',
    hasPowerOfAttorney: true,
    linkedWholesaleServiceOnRecipientSide: false,
    contactChannel: 'EMAIL',
    internalNotes: 'Uwaga operacyjna',
    createdByUserId: 'user-1',
    createdAt: new Date('2026-04-06T08:00:00.000Z'),
    updatedAt: new Date('2026-04-06T10:00:00.000Z'),
    client: {
      id: 'client-1',
      clientType: 'INDIVIDUAL',
      firstName: 'Jan',
      lastName: 'Kowalski',
      companyName: null,
      email: 'jan@example.com',
      addressStreet: 'Testowa 1',
      addressCity: 'Warszawa',
      addressZip: '00-001',
    },
    donorOperator: {
      id: 'op-1',
      name: 'Orange Polska',
      shortName: 'ORANGE',
      routingNumber: 'ORANGE',
      isActive: true,
    },
    recipientOperator: {
      id: 'op-2',
      name: 'T-Mobile Polska',
      shortName: 'TMOBILE',
      routingNumber: 'TMOBILE',
      isActive: true,
    },
    infrastructureOperator: null,
    assignedAt: null,
    assignedByUserId: null,
    assignedUser: null,
    commercialOwner: null,
    commercialOwnerUserId: null,
    events: [],
  }
}

function makeCommunicationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'comm-1',
    portingRequestId: 'req-1',
    type: 'EMAIL',
    status: 'DRAFT',
    triggerType: 'CASE_RECEIVED',
    recipient: 'jan@example.com',
    subject: 'Aktualizacja sprawy',
    body: 'body',
    templateKey: 'client_confirmation',
    createdByUserId: 'user-1',
    sentAt: null,
    errorMessage: null,
    metadata: {
      actionType: 'CLIENT_CONFIRMATION',
    },
    createdAt: new Date('2026-04-06T10:00:00.000Z'),
    updatedAt: new Date('2026-04-06T10:00:00.000Z'),
    createdBy: {
      firstName: 'Anna',
      lastName: 'Nowak',
      role: 'ADMIN',
    },
    ...overrides,
  }
}

describe('getPortingRequest detail DTO', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue(makeDetailRow())
    mockCommunicationFindMany.mockResolvedValue([makeCommunicationRow()])
  })

  it('returns detail DTO enriched with available communication actions and summary', async () => {
    const result = await getPortingRequest('req-1', 'ADMIN')

    expect(result.communicationSummary).toEqual({
      totalCount: 1,
      draftCount: 1,
      sentCount: 0,
      errorCount: 0,
      lastCommunicationAt: '2026-04-06T10:00:00.000Z',
      lastCommunicationType: 'CLIENT_CONFIRMATION',
    })

    expect(result.availableCommunicationActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'CLIENT_CONFIRMATION',
          canPreview: true,
          canCreateDraft: false,
          existingDraftId: 'comm-1',
        }),
      ]),
    )
  })

  it('builds summary from the same communication source as history for sent items', async () => {
    mockCommunicationFindMany.mockResolvedValue([
      makeCommunicationRow({
        id: 'comm-2',
        status: 'SENT',
        sentAt: new Date('2026-04-06T11:00:00.000Z'),
        subject: 'Drugie potwierdzenie',
        createdAt: new Date('2026-04-06T11:00:00.000Z'),
        updatedAt: new Date('2026-04-06T11:00:00.000Z'),
      }),
      makeCommunicationRow({
        id: 'comm-1',
        status: 'SENT',
        sentAt: new Date('2026-04-06T10:00:00.000Z'),
      }),
    ])

    const result = await getPortingRequest('req-1', 'ADMIN')

    expect(result.communicationSummary).toEqual({
      totalCount: 2,
      draftCount: 0,
      sentCount: 2,
      errorCount: 0,
      lastCommunicationAt: '2026-04-06T11:00:00.000Z',
      lastCommunicationType: 'CLIENT_CONFIRMATION',
    })
  })

  it('counts draft, sent and failed communications and exposes the latest item in summary', async () => {
    mockCommunicationFindMany.mockResolvedValue([
      makeCommunicationRow({
        id: 'comm-3',
        status: 'FAILED',
        errorMessage: 'SMTP timeout',
        metadata: {
          actionType: 'INTERNAL_NOTE_EMAIL',
        },
        templateKey: 'internal_note_email',
        triggerType: 'MANUAL',
        subject: 'Notatka do partnera',
        createdAt: new Date('2026-04-06T12:00:00.000Z'),
        updatedAt: new Date('2026-04-06T12:00:00.000Z'),
      }),
      makeCommunicationRow({
        id: 'comm-2',
        status: 'SENT',
        sentAt: new Date('2026-04-06T11:00:00.000Z'),
        subject: 'Potwierdzenie dla klienta',
        createdAt: new Date('2026-04-06T11:00:00.000Z'),
        updatedAt: new Date('2026-04-06T11:00:00.000Z'),
      }),
      makeCommunicationRow({
        id: 'comm-1',
        status: 'DRAFT',
      }),
    ])

    const result = await getPortingRequest('req-1', 'ADMIN')

    expect(result.communicationSummary).toEqual({
      totalCount: 3,
      draftCount: 1,
      sentCount: 1,
      errorCount: 1,
      lastCommunicationAt: '2026-04-06T12:00:00.000Z',
      lastCommunicationType: 'INTERNAL_NOTE_EMAIL',
    })
  })
})
