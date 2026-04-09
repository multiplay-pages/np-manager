import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockPreviewPortingCommunication,
  mockCreatePortingCommunicationDraft,
  mockGetPortingCommunicationHistory,
  mockMarkPortingCommunicationAsSent,
} = vi.hoisted(() => ({
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
      id: 'user-1',
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
  getPortingRequest: vi.fn(),
  listPortingRequests: vi.fn(),
  syncPortingRequestFromPliCbd: vi.fn(),
  updatePortingRequestAssignment: vi.fn(),
  assignPortingRequestToMe: vi.fn(),
  getPortingRequestAssignmentHistory: vi.fn(),
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
  markPortingCommunicationAsSent: (...args: unknown[]) => mockMarkPortingCommunicationAsSent(...args),
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

describe('porting communication routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPreviewPortingCommunication.mockResolvedValue({
      actionType: 'CLIENT_CONFIRMATION',
      type: 'EMAIL',
      triggerType: 'CASE_RECEIVED',
      templateKey: 'case_received',
      recipient: 'jan@example.com',
      subject: 'Potwierdzenie przyjecia sprawy FNP-123',
      body: 'Dzien dobry Janie',
      context: {
        clientName: 'Jan Kowalski',
        caseNumber: 'FNP-123',
        portedNumber: '221234567',
        donorOperatorName: 'Orange Polska',
        recipientOperatorName: 'G-NET',
        plannedPortDate: null,
        issueDescription: null,
        contactEmail: 'jan@example.com',
        contactPhone: '600700800',
      },
    })

    mockCreatePortingCommunicationDraft.mockResolvedValue({
      id: 'comm-1',
      portingRequestId: 'req-1',
      actionType: 'CLIENT_CONFIRMATION',
      type: 'EMAIL',
      status: 'DRAFT',
      triggerType: 'CASE_RECEIVED',
      recipient: 'jan@example.com',
      subject: 'Potwierdzenie przyjecia sprawy FNP-123',
      body: 'Dzien dobry Janie',
      templateKey: 'case_received',
      createdByUserId: 'user-1',
      createdByDisplayName: 'System Administrator',
      createdByRole: 'ADMIN',
      sentAt: null,
      errorMessage: null,
      metadata: null,
      createdAt: '2026-04-06T11:00:00.000Z',
      updatedAt: '2026-04-06T11:00:00.000Z',
    })

    mockGetPortingCommunicationHistory.mockResolvedValue({
      items: [
        {
          id: 'comm-1',
          portingRequestId: 'req-1',
          actionType: 'CLIENT_CONFIRMATION',
          type: 'EMAIL',
          status: 'DRAFT',
          triggerType: 'CASE_RECEIVED',
          recipient: 'jan@example.com',
          subject: 'Potwierdzenie przyjecia sprawy FNP-123',
          body: 'Dzien dobry Janie',
          templateKey: 'case_received',
          createdByUserId: 'user-1',
          createdByDisplayName: 'System Administrator',
          createdByRole: 'ADMIN',
          sentAt: null,
          errorMessage: null,
          metadata: null,
          createdAt: '2026-04-06T11:00:00.000Z',
          updatedAt: '2026-04-06T11:00:00.000Z',
        },
      ],
    })

    mockMarkPortingCommunicationAsSent.mockResolvedValue({
      id: 'comm-1',
      portingRequestId: 'req-1',
      actionType: 'CLIENT_CONFIRMATION',
      type: 'EMAIL',
      status: 'SENT',
      triggerType: 'CASE_RECEIVED',
      recipient: 'jan@example.com',
      subject: 'Potwierdzenie przyjecia sprawy FNP-123',
      body: 'Dzien dobry Janie',
      templateKey: 'case_received',
      createdByUserId: 'user-1',
      createdByDisplayName: 'System Administrator',
      createdByRole: 'ADMIN',
      sentAt: '2026-04-06T11:10:00.000Z',
      errorMessage: null,
      metadata: null,
      createdAt: '2026-04-06T11:00:00.000Z',
      updatedAt: '2026-04-06T11:10:00.000Z',
    })
  })

  it('registers preview draft endpoint under /api/porting-requests/:id/communications/preview', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/porting-requests/req-1/communications/preview',
        payload: {},
      })

      expect(response.statusCode).toBe(200)
      expect(mockPreviewPortingCommunication).toHaveBeenCalledWith('req-1', {}, 'ADMIN')
    } finally {
      await app.close()
    }
  })

  it('registers create draft endpoint under /api/porting-requests/:id/communications/drafts', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/porting-requests/req-1/communications/drafts',
        payload: {},
      })

      expect(response.statusCode).toBe(201)
      const createDraftCall = mockCreatePortingCommunicationDraft.mock.calls[0]
      expect(createDraftCall?.[0]).toBe('req-1')
      expect(createDraftCall?.[1]).toEqual({})
      expect(createDraftCall?.[2]).toBe('user-1')
      expect(createDraftCall?.[3]).toBe('ADMIN')
    } finally {
      await app.close()
    }
  })

  it('registers history endpoint under /api/porting-requests/:id/communications', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/req-1/communications',
      })

      expect(response.statusCode).toBe(200)
      expect(mockGetPortingCommunicationHistory).toHaveBeenCalledWith('req-1')
    } finally {
      await app.close()
    }
  })

  it('registers mark-as-sent endpoint under /api/porting-requests/:id/communications/:communicationId/mark-sent', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/porting-requests/req-1/communications/comm-1/mark-sent',
        payload: {},
      })

      expect(response.statusCode).toBe(200)
      const markSentCall = mockMarkPortingCommunicationAsSent.mock.calls[0]
      expect(markSentCall?.[0]).toBe('req-1')
      expect(markSentCall?.[1]).toBe('comm-1')
      expect(markSentCall?.[2]).toBe('ADMIN')
      expect(markSentCall?.[3]).toBe('user-1')
      expect(markSentCall?.[4]).toEqual({})
    } finally {
      await app.close()
    }
  })
})
