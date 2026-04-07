import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockListPortingRequests,
  mockGetPortingRequest,
  mockPreviewPortingCommunication,
  mockCreatePortingCommunicationDraft,
  mockGetPortingCommunicationHistory,
  mockMarkPortingCommunicationAsSent,
} = vi.hoisted(() => ({
  mockListPortingRequests: vi.fn(),
  mockGetPortingRequest: vi.fn(),
  mockPreviewPortingCommunication: vi.fn(),
  mockCreatePortingCommunicationDraft: vi.fn(),
  mockGetPortingCommunicationHistory: vi.fn(),
  mockMarkPortingCommunicationAsSent: vi.fn(),
}))

vi.mock('../modules/auth/auth.router', () => ({
  authRouter: async () => {},
}))

vi.mock('../modules/users/users.router', () => ({
  usersRouter: async () => {},
}))

vi.mock('../modules/clients/clients.router', () => ({
  clientsRouter: async () => {},
}))

vi.mock('../modules/operators/operators.router', () => ({
  operatorsRouter: async () => {},
}))

vi.mock('../shared/middleware/authenticate', () => ({
  authenticate: async (request: { user?: unknown }) => {
    request.user = {
      id: 'user-admin-1',
      role: 'ADMIN',
    }
  },
}))

vi.mock('../shared/middleware/authorize', () => ({
  authorize: () => async () => {},
}))

vi.mock('../modules/porting-requests/porting-requests.service', () => ({
  createPortingRequest: vi.fn(),
  executePortingRequestExternalAction: vi.fn(),
  exportPortingRequestToPliCbd: vi.fn(),
  getPortingRequestIntegrationEvents: vi.fn(),
  getPortingRequest: (...args: unknown[]) => mockGetPortingRequest(...args),
  listPortingRequests: (...args: unknown[]) => mockListPortingRequests(...args),
  syncPortingRequestFromPliCbd: vi.fn(),
  updatePortingRequestStatus: vi.fn(),
}))

vi.mock('../modules/porting-requests/porting-events.service', () => ({
  getPortingRequestTimeline: vi.fn(),
}))

vi.mock('../modules/porting-requests/porting-request-case-history.service', () => ({
  getPortingRequestCaseHistory: vi.fn(),
}))

vi.mock('../modules/porting-requests/porting-request-communication.service', () => ({
  previewPortingCommunication: (...args: unknown[]) => mockPreviewPortingCommunication(...args),
  createPortingCommunicationDraft: (...args: unknown[]) =>
    mockCreatePortingCommunicationDraft(...args),
  getPortingCommunicationHistory: (...args: unknown[]) =>
    mockGetPortingCommunicationHistory(...args),
  markPortingCommunicationAsSent: (...args: unknown[]) =>
    mockMarkPortingCommunicationAsSent(...args),
}))

vi.mock('../modules/pli-cbd/fnp-process.service', () => ({
  buildE03DraftForPortingRequest: vi.fn(),
  buildE12DraftForPortingRequest: vi.fn(),
  buildE18DraftForPortingRequest: vi.fn(),
  buildE23DraftForPortingRequest: vi.fn(),
  getPortingRequestProcessSnapshot: vi.fn(),
}))

vi.mock('../modules/pli-cbd/pli-cbd-technical-payload.service', () => ({
  buildTechnicalPayloadForPortingRequest: vi.fn(),
}))

vi.mock('../modules/pli-cbd/pli-cbd-xml-preview.service', () => ({
  buildXmlPreviewForPortingRequest: vi.fn(),
}))

vi.mock('../modules/pli-cbd/pli-cbd-export.service', () => ({
  triggerManualPliCbdExport: vi.fn(),
}))

import { buildApp } from '../app'

const REAL_REQUEST_ID = 'fc8b0b0a-2650-4665-8c19-fec97a2ec3e4'
const REAL_CASE_NUMBER = 'FNP-SEED-E18-001'
const REAL_PHONE = '221234570'

const REAL_DRAFT_1 = {
  id: '87cd0704-688a-435c-8361-b9bd9dc1dfac',
  portingRequestId: REAL_REQUEST_ID,
  actionType: 'CLIENT_CONFIRMATION' as const,
  type: 'EMAIL' as const,
  status: 'DRAFT' as const,
  triggerType: 'CASE_RECEIVED' as const,
  templateKey: 'case_received',
  recipient: 'jan.testowy@np-manager.local',
  subject: `Potwierdzenie przyjecia sprawy ${REAL_CASE_NUMBER}`,
  body: `Dzien dobry Jan Testowy,\n\npotwierdzamy przyjecie sprawy portowania numeru ${REAL_PHONE}.\nNumer sprawy: ${REAL_CASE_NUMBER}.\n\nBedziemy informowac o kolejnych etapach obslugi.\n\nZespol NP-Manager`,
  createdByUserId: 'user-admin-1',
  createdByDisplayName: 'System Administrator',
  createdByRole: 'ADMIN',
  sentAt: null,
  errorMessage: null,
  metadata: null,
  createdAt: '2026-04-06T14:19:36.376Z',
  updatedAt: '2026-04-06T14:19:36.376Z',
}

const REAL_DRAFT_SENT = {
  ...REAL_DRAFT_1,
  status: 'SENT' as const,
  sentAt: '2026-04-06T14:19:58.902Z',
  updatedAt: '2026-04-06T14:19:58.903Z',
}

describe('porting communications e2e flow with real request ID', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockListPortingRequests.mockResolvedValue({
      items: [
        {
          id: REAL_REQUEST_ID,
          caseNumber: REAL_CASE_NUMBER,
          clientId: '717188d4-b624-40c3-b3dc-85a19c7303ce',
          clientDisplayName: 'Jan Testowy',
          numberDisplay: REAL_PHONE,
          donorOperatorId: '18826f06-8406-4b17-9cd9-5fc11256e94a',
          donorOperatorName: 'Orange Polska',
          portingMode: 'DAY',
          statusInternal: 'PORTED',
          createdAt: '2026-04-06T14:06:36.545Z',
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })

    mockGetPortingRequest.mockResolvedValue({
      id: REAL_REQUEST_ID,
      caseNumber: REAL_CASE_NUMBER,
      statusInternal: 'PORTED',
      numberDisplay: REAL_PHONE,
      client: {
        id: '717188d4-b624-40c3-b3dc-85a19c7303ce',
        clientType: 'INDIVIDUAL',
        displayName: 'Jan Testowy',
      },
      donorOperator: {
        id: '18826f06-8406-4b17-9cd9-5fc11256e94a',
        name: 'Orange Polska',
        shortName: 'ORANGE',
        routingNumber: 'ORANGE',
        isActive: true,
      },
      recipientOperator: {
        id: '18826f06-8406-4b17-9cd9-5fc11256e94b',
        name: 'T-Mobile Polska',
        shortName: 'TMOBILE',
        routingNumber: 'TMOBILE',
        isActive: true,
      },
      infrastructureOperator: null,
      createdAt: '2026-04-06T14:06:36.545Z',
      updatedAt: '2026-04-06T14:06:36.545Z',
      availableStatusActions: [],
      availableExternalActions: [],
      availableCommunicationActions: [],
      communicationSummary: {
        totalCount: 1,
        draftCount: 1,
        sentCount: 0,
        errorCount: 0,
        lastCommunicationAt: REAL_DRAFT_1.createdAt,
        lastCommunicationType: 'CLIENT_CONFIRMATION',
      },
    })

    mockPreviewPortingCommunication.mockResolvedValue({
      actionType: 'CLIENT_CONFIRMATION',
      type: 'EMAIL',
      triggerType: 'CASE_RECEIVED',
      templateKey: 'case_received',
      recipient: 'jan.testowy@np-manager.local',
      subject: `Potwierdzenie przyjecia sprawy ${REAL_CASE_NUMBER}`,
      body: `Dzien dobry Jan Testowy,\n\npotwierdzamy przyjecie sprawy portowania numeru ${REAL_PHONE}.\nNumer sprawy: ${REAL_CASE_NUMBER}.\n\nBedziemy informowac o kolejnych etapach obslugi.\n\nZespol NP-Manager`,
      context: {
        clientName: 'Jan Testowy',
        caseNumber: REAL_CASE_NUMBER,
        portedNumber: REAL_PHONE,
        donorOperatorName: 'Orange Polska',
        recipientOperatorName: 'G-NET',
        plannedPortDate: null,
        issueDescription: null,
        contactEmail: 'jan.testowy@np-manager.local',
        contactPhone: '600700800',
      },
    })

    mockCreatePortingCommunicationDraft.mockResolvedValue(REAL_DRAFT_1)

    mockGetPortingCommunicationHistory.mockResolvedValue({
      items: [REAL_DRAFT_1],
    })

    mockMarkPortingCommunicationAsSent.mockResolvedValue(REAL_DRAFT_SENT)
  })

  it('GET /api/porting-requests lists real seed QA case', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.items).toHaveLength(1)
      expect(body.data.items[0].id).toBe(REAL_REQUEST_ID)
      expect(body.data.items[0].caseNumber).toBe(REAL_CASE_NUMBER)
    } finally {
      await app.close()
    }
  })

  it('GET /api/porting-requests/:id returns detail for real case', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/porting-requests/${REAL_REQUEST_ID}`,
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.request.id).toBe(REAL_REQUEST_ID)
      expect(body.data.request.caseNumber).toBe(REAL_CASE_NUMBER)
      expect(mockGetPortingRequest).toHaveBeenCalledWith(REAL_REQUEST_ID, 'ADMIN')
    } finally {
      await app.close()
    }
  })

  it('POST /api/porting-requests/:id/communications/preview returns draft preview', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'POST',
        url: `/api/porting-requests/${REAL_REQUEST_ID}/communications/preview`,
        payload: { triggerType: 'CASE_RECEIVED' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.templateKey).toBe('case_received')
      expect(body.data.subject).toContain(REAL_CASE_NUMBER)
      expect(mockPreviewPortingCommunication).toHaveBeenCalledWith(
        REAL_REQUEST_ID,
        {
          triggerType: 'CASE_RECEIVED',
        },
        'ADMIN',
      )
    } finally {
      await app.close()
    }
  })

  it('POST /api/porting-requests/:id/communications/drafts creates draft successfully', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'POST',
        url: `/api/porting-requests/${REAL_REQUEST_ID}/communications/drafts`,
        payload: { triggerType: 'CASE_RECEIVED' },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.communication.id).toBe(REAL_DRAFT_1.id)
      expect(body.data.communication.status).toBe('DRAFT')
      expect(body.data.communication.portingRequestId).toBe(REAL_REQUEST_ID)
      const createDraftCall = mockCreatePortingCommunicationDraft.mock.calls[0]
      expect(createDraftCall?.[0]).toBe(REAL_REQUEST_ID)
      expect(createDraftCall?.[1]).toEqual({ triggerType: 'CASE_RECEIVED' })
      expect(createDraftCall?.[2]).toBe('user-admin-1')
      expect(createDraftCall?.[3]).toBe('ADMIN')
    } finally {
      await app.close()
    }
  })

  it('GET /api/porting-requests/:id/communications returns draft in history', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/porting-requests/${REAL_REQUEST_ID}/communications`,
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.items).toHaveLength(1)
      expect(body.data.items[0].id).toBe(REAL_DRAFT_1.id)
      expect(body.data.items[0].status).toBe('DRAFT')
      expect(mockGetPortingCommunicationHistory).toHaveBeenCalledWith(REAL_REQUEST_ID)
    } finally {
      await app.close()
    }
  })

  it('PATCH /api/porting-requests/:id/communications/:communicationId/mark-sent changes status to SENT', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/porting-requests/${REAL_REQUEST_ID}/communications/${REAL_DRAFT_1.id}/mark-sent`,
        payload: {},
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.communication.status).toBe('SENT')
      expect(body.data.communication.sentAt).toBe(REAL_DRAFT_SENT.sentAt)
      const markSentCall = mockMarkPortingCommunicationAsSent.mock.calls[0]
      expect(markSentCall?.[0]).toBe(REAL_REQUEST_ID)
      expect(markSentCall?.[1]).toBe(REAL_DRAFT_1.id)
      expect(markSentCall?.[2]).toBe('ADMIN')
      expect(markSentCall?.[3]).toBe('user-admin-1')
      expect(markSentCall?.[4]).toEqual({})
    } finally {
      await app.close()
    }
  })

  it('full e2e flow: list → detail → preview → create → history → mark-sent', async () => {
    const app = await buildApp()

    try {
      // 1. List
      const listRes = await app.inject({ method: 'GET', url: '/api/porting-requests' })
      expect(listRes.statusCode).toBe(200)
      const listBody = listRes.json()
      const requestId = listBody.data.items[0].id
      expect(requestId).toBe(REAL_REQUEST_ID)

      // 2. Detail
      const detailRes = await app.inject({
        method: 'GET',
        url: `/api/porting-requests/${requestId}`,
      })
      expect(detailRes.statusCode).toBe(200)
      const detailBody = detailRes.json()
      expect(detailBody.data.request.caseNumber).toBe(REAL_CASE_NUMBER)

      // 3. Preview
      const previewRes = await app.inject({
        method: 'POST',
        url: `/api/porting-requests/${requestId}/communications/preview`,
        payload: { triggerType: 'CASE_RECEIVED' },
      })
      expect(previewRes.statusCode).toBe(200)
      expect(previewRes.json().data.subject).toContain(REAL_CASE_NUMBER)

      // 4. Create Draft
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/porting-requests/${requestId}/communications/drafts`,
        payload: { triggerType: 'CASE_RECEIVED' },
      })
      expect(createRes.statusCode).toBe(201)
      const createBody = createRes.json()
      const draftId = createBody.data.communication.id
      expect(createBody.data.communication.status).toBe('DRAFT')

      // 5. Get History
      const historyRes = await app.inject({
        method: 'GET',
        url: `/api/porting-requests/${requestId}/communications`,
      })
      expect(historyRes.statusCode).toBe(200)
      const historyBody = historyRes.json()
      expect(historyBody.data.items).toContainEqual(
        expect.objectContaining({ id: draftId, status: 'DRAFT' }),
      )

      // 6. Mark Sent
      const markRes = await app.inject({
        method: 'PATCH',
        url: `/api/porting-requests/${requestId}/communications/${draftId}/mark-sent`,
        payload: {},
      })
      expect(markRes.statusCode).toBe(200)
      const markBody = markRes.json()
      expect(markBody.data.communication.status).toBe('SENT')
      expect(markBody.data.communication.sentAt).not.toBeNull()
    } finally {
      await app.close()
    }
  })
})
