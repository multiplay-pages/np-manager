import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequestFindUnique = vi.fn()
const mockCommunicationCreate = vi.fn()
const mockCommunicationFindMany = vi.fn()
const mockCommunicationFindFirst = vi.fn()
const mockCommunicationUpdate = vi.fn()
const mockCaseHistoryFindMany = vi.fn()
const mockIntegrationFindMany = vi.fn()
const mockLogAuditEvent = vi.fn()
const mockGetPublishedCommunicationTemplateVersionOrThrow = vi.fn()
const mockResolveCommunicationTemplateCodeForAction = vi.fn()

vi.mock('../../../config/database', () => ({
  prisma: {
    portingRequest: {
      findUnique: (...args: unknown[]) => mockRequestFindUnique(...args),
    },
    portingCommunication: {
      create: (...args: unknown[]) => mockCommunicationCreate(...args),
      findMany: (...args: unknown[]) => mockCommunicationFindMany(...args),
      findFirst: (...args: unknown[]) => mockCommunicationFindFirst(...args),
      update: (...args: unknown[]) => mockCommunicationUpdate(...args),
    },
    portingRequestCaseHistory: {
      findMany: (...args: unknown[]) => mockCaseHistoryFindMany(...args),
    },
    pliCbdIntegrationEvent: {
      findMany: (...args: unknown[]) => mockIntegrationFindMany(...args),
    },
  },
}))

vi.mock('../../../shared/audit/audit.service', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}))

vi.mock('../../communications/communication-templates.service', () => ({
  getPublishedCommunicationTemplateVersionOrThrow: (...args: unknown[]) =>
    mockGetPublishedCommunicationTemplateVersionOrThrow(...args),
  resolveCommunicationTemplateCodeForAction: (...args: unknown[]) =>
    mockResolveCommunicationTemplateCodeForAction(...args),
}))

import {
  buildCommunicationCreateData,
  createPortingCommunicationDraft,
  getPortingCommunicationHistory,
  markPortingCommunicationAsSent,
  previewPortingCommunication,
} from '../porting-request-communication.service'

const REQUEST_ID = 'req-comm-001'
const USER_ID = 'user-comm-001'

function makeSnapshot(statusInternal: 'SUBMITTED' | 'REJECTED' | 'PORTED' = 'SUBMITTED') {
  return {
    id: REQUEST_ID,
    caseNumber: 'FNP-20260406-XYZ123',
    statusInternal,
    primaryNumber: '221234567',
    rangeStart: null,
    rangeEnd: null,
    numberRangeKind: 'SINGLE',
    requestedPortDate: new Date('2026-04-15T00:00:00.000Z'),
    confirmedPortDate: new Date('2026-04-15T00:00:00.000Z'),
    donorAssignedPortDate: null,
    rejectionReason: statusInternal === 'REJECTED' ? 'Brak pelnomocnictwa' : null,
    sentToExternalSystemAt: new Date('2026-04-06T09:00:00.000Z'),
    client: {
      clientType: 'INDIVIDUAL',
      firstName: 'Jan',
      lastName: 'Kowalski',
      companyName: null,
      email: 'jan.kowalski@example.com',
      phoneContact: '600700800',
    },
    donorOperator: {
      name: 'Orange Polska',
    },
    recipientOperator: {
      name: 'G-NET',
    },
  }
}

function makeCommunicationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'comm-1',
    portingRequestId: REQUEST_ID,
    type: 'EMAIL',
    status: 'DRAFT',
    triggerType: 'CASE_RECEIVED',
    recipient: 'jan.kowalski@example.com',
    subject: 'Aktualizacja sprawy FNP-20260406-XYZ123',
    body: 'body',
    templateKey: 'client_confirmation',
    createdByUserId: USER_ID,
    sentAt: null,
    errorMessage: null,
    metadata: { actionType: 'CLIENT_CONFIRMATION', sourceActionId: 'SET_PORT_DATE' },
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

describe('porting-request-communication.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequestFindUnique.mockResolvedValue(makeSnapshot())
    mockCommunicationCreate.mockResolvedValue(makeCommunicationRow())
    mockCommunicationFindMany.mockResolvedValue([])
    mockCommunicationFindFirst.mockResolvedValue(makeCommunicationRow())
    mockCommunicationUpdate.mockResolvedValue({
      ...makeCommunicationRow(),
      status: 'SENT',
      sentAt: new Date('2026-04-06T11:00:00.000Z'),
    })
    mockLogAuditEvent.mockResolvedValue(undefined)
    mockGetPublishedCommunicationTemplateVersionOrThrow.mockResolvedValue({
      templateId: 'tpl-family-1',
      code: 'REQUEST_RECEIVED',
      name: 'Wniosek przyjety',
      description: 'Opis',
      channel: 'EMAIL',
      versionId: 'tpl-version-1',
      versionNumber: 1,
      subjectTemplate: 'Sprawa {{caseNumber}}',
      bodyTemplate: 'Dzien dobry {{clientName}}',
    })
    mockResolveCommunicationTemplateCodeForAction.mockReturnValue('REQUEST_RECEIVED')
  })

  it('builds create payload linked to porting request and preserves action metadata', () => {
    const createData = buildCommunicationCreateData({
      requestId: REQUEST_ID,
      createdByUserId: USER_ID,
      preview: {
        actionType: 'CLIENT_CONFIRMATION',
        type: 'EMAIL',
        triggerType: 'CASE_RECEIVED',
        templateKey: 'client_confirmation',
        recipient: 'jan.kowalski@example.com',
        subject: 'Potwierdzenie',
        body: 'body',
        context: {
          clientName: 'Jan Kowalski',
          caseNumber: 'FNP-20260406-XYZ123',
          portedNumber: '221234567',
          donorOperatorName: 'Orange Polska',
          recipientOperatorName: 'G-NET',
          plannedPortDate: null,
          issueDescription: null,
          contactEmail: 'jan.kowalski@example.com',
          contactPhone: '600700800',
        },
      },
      metadata: { source: 'manual' },
      templateVersion: {
        versionId: 'tpl-version-1',
        versionNumber: 1,
      },
    })

    expect(createData.portingRequest).toEqual({ connect: { id: REQUEST_ID } })
    expect(createData.createdBy).toEqual({ connect: { id: USER_ID } })
    expect(createData.metadata).toMatchObject({
      source: 'manual',
      actionType: 'CLIENT_CONFIRMATION',
      communicationTemplateCode: 'REQUEST_RECEIVED',
      communicationTemplateVersionId: 'tpl-version-1',
      communicationTemplateVersionNumber: 1,
    })
  })

  it('creates a draft communication only when policy allows it', async () => {
    const result = await createPortingCommunicationDraft(
      REQUEST_ID,
      {
        actionType: 'CLIENT_CONFIRMATION',
      },
      USER_ID,
      'ADMIN',
    )

    expect(result.portingRequestId).toBe(REQUEST_ID)
    expect(result.actionType).toBe('CLIENT_CONFIRMATION')
    expect(mockCommunicationCreate).toHaveBeenCalledOnce()
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entityType: 'porting_communication',
      }),
    )
    expect(mockCaseHistoryFindMany).not.toHaveBeenCalled()
    expect(mockIntegrationFindMany).not.toHaveBeenCalled()
  })

  it('blocks duplicate draft when policy forbids multiple active drafts', async () => {
    mockCommunicationFindMany.mockResolvedValue([makeCommunicationRow()])

    await expect(
      createPortingCommunicationDraft(
        REQUEST_ID,
        { actionType: 'CLIENT_CONFIRMATION' },
        USER_ID,
        'ADMIN',
      ),
    ).rejects.toThrow(/Istnieje juz aktywny draft tego typu/)

    expect(mockCommunicationCreate).not.toHaveBeenCalled()
  })

  it('returns communication history from dedicated communication log only', async () => {
    mockCommunicationFindMany.mockResolvedValue([makeCommunicationRow()])

    const result = await getPortingCommunicationHistory(REQUEST_ID)

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.portingRequestId).toBe(REQUEST_ID)
    expect(result.items[0]?.actionType).toBe('CLIENT_CONFIRMATION')
    expect(mockCommunicationFindMany).toHaveBeenCalledOnce()
    expect(mockCaseHistoryFindMany).not.toHaveBeenCalled()
    expect(mockIntegrationFindMany).not.toHaveBeenCalled()
  })

  it('preview rejects action not allowed for current status and role', async () => {
    mockRequestFindUnique.mockResolvedValue(makeSnapshot('SUBMITTED'))

    await expect(
      previewPortingCommunication(
        REQUEST_ID,
        { actionType: 'COMPLETION_NOTICE' },
        'ADMIN',
      ),
    ).rejects.toThrow(/Aktualny status: SUBMITTED/)
  })

  it('blocks draft creation when there is no active template for resolved communication code', async () => {
    mockGetPublishedCommunicationTemplateVersionOrThrow.mockRejectedValue(
      new Error('Brak opublikowanej wersji szablonu dla komunikacji REQUEST_RECEIVED (EMAIL).'),
    )

    await expect(
      createPortingCommunicationDraft(
        REQUEST_ID,
        { actionType: 'CLIENT_CONFIRMATION' },
        USER_ID,
        'ADMIN',
      ),
    ).rejects.toThrow(/Brak opublikowanej wersji szablonu/)

    expect(mockCommunicationCreate).not.toHaveBeenCalled()
  })

  it('blocks draft creation when active template requires missing request data', async () => {
    mockRequestFindUnique.mockResolvedValue({
      ...makeSnapshot(),
      requestedPortDate: null,
      confirmedPortDate: null,
      donorAssignedPortDate: null,
    })
    mockResolveCommunicationTemplateCodeForAction.mockReturnValue('PORT_DATE_RECEIVED')
    mockGetPublishedCommunicationTemplateVersionOrThrow.mockResolvedValue({
      templateId: 'tpl-family-2',
      code: 'PORT_DATE_RECEIVED',
      name: 'Data przeniesienia',
      description: 'Opis',
      channel: 'EMAIL',
      versionId: 'tpl-version-2',
      versionNumber: 1,
      subjectTemplate: 'Termin {{plannedPortDate}}',
      bodyTemplate: 'Numer {{portedNumber}}, termin {{plannedPortDate}}',
    })

    await expect(
      createPortingCommunicationDraft(
        REQUEST_ID,
        {
          actionType: 'CLIENT_CONFIRMATION',
          triggerType: 'PORT_DATE_SCHEDULED',
        },
        USER_ID,
        'ADMIN',
      ),
    ).rejects.toThrow(/plannedPortDate/)

    expect(mockCommunicationCreate).not.toHaveBeenCalled()
  })

  it('mark-sent rejects invalid communication status transitions', async () => {
    mockRequestFindUnique.mockResolvedValue(makeSnapshot('PORTED'))
    mockCommunicationFindFirst.mockResolvedValue(
      makeCommunicationRow({
        actionType: 'COMPLETION_NOTICE',
        metadata: { actionType: 'COMPLETION_NOTICE' },
        templateKey: 'completion_notice',
        triggerType: 'PORT_COMPLETED',
        status: 'SENT',
        sentAt: new Date('2026-04-06T11:00:00.000Z'),
      }),
    )

    await expect(
      markPortingCommunicationAsSent(REQUEST_ID, 'comm-1', 'ADMIN', USER_ID),
    ).rejects.toThrow(/juz oznaczony jako wyslany/)

    expect(mockCommunicationUpdate).not.toHaveBeenCalled()
  })

  it('marks draft as sent only when policy allows it', async () => {
    mockRequestFindUnique.mockResolvedValue(makeSnapshot('PORTED'))
    mockCommunicationFindFirst.mockResolvedValue(
      makeCommunicationRow({
        actionType: 'COMPLETION_NOTICE',
        metadata: { actionType: 'COMPLETION_NOTICE' },
        templateKey: 'completion_notice',
        triggerType: 'PORT_COMPLETED',
      }),
    )
    mockCommunicationUpdate.mockResolvedValue(
      makeCommunicationRow({
        actionType: 'COMPLETION_NOTICE',
        metadata: { actionType: 'COMPLETION_NOTICE' },
        templateKey: 'completion_notice',
        triggerType: 'PORT_COMPLETED',
        status: 'SENT',
        sentAt: new Date('2026-04-06T11:00:00.000Z'),
      }),
    )

    const result = await markPortingCommunicationAsSent(
      REQUEST_ID,
      'comm-1',
      'ADMIN',
      USER_ID,
    )

    expect(result.status).toBe('SENT')
    expect(mockCommunicationUpdate).toHaveBeenCalledOnce()
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        oldValue: 'DRAFT',
        newValue: 'SENT',
      }),
    )
  })
})
