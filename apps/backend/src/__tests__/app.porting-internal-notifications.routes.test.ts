import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetPortingRequestInternalNotifications } = vi.hoisted(() => ({
  mockGetPortingRequestInternalNotifications: vi.fn(),
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
  listAssignablePortingRequestUsers: vi.fn(),
  listCommercialOwnerCandidates: vi.fn(),
  updateCommercialOwner: vi.fn(),
}))

vi.mock('../modules/porting-requests/porting-internal-notification-history.service', () => ({
  getPortingRequestInternalNotifications: (...args: unknown[]) =>
    mockGetPortingRequestInternalNotifications(...args),
}))

vi.mock('../modules/porting-requests/porting-events.service', () => ({
  getPortingRequestTimeline: vi.fn(),
}))

vi.mock('../modules/porting-requests/porting-request-case-history.service', () => ({
  getPortingRequestCaseHistory: vi.fn(),
}))

vi.mock('../modules/porting-requests/porting-request-communication.service', () => ({
  previewPortingCommunication: vi.fn(),
  createPortingCommunicationDraft: vi.fn(),
  getPortingCommunicationHistory: vi.fn(),
  markPortingCommunicationAsSent: vi.fn(),
}))

vi.mock('../modules/porting-requests/communication-delivery.service', () => ({
  sendPortingCommunication: vi.fn(),
  retryPortingCommunication: vi.fn(),
  cancelPortingCommunication: vi.fn(),
  getPortingCommunicationDeliveryAttempts: vi.fn(),
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

describe('porting request internal notifications route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPortingRequestInternalNotifications.mockResolvedValue({
      items: [
        {
          id: 'entry-1',
          entryType: 'USER_NOTIFICATION',
          eventCode: 'STATUS_CHANGED',
          eventLabel: 'Zmiana statusu sprawy',
          channel: 'IN_APP',
          recipient: 'Anna Handlowa (anna@np-manager.local)',
          outcome: 'CREATED',
          mode: null,
          message: 'Status sprawy zostal zmieniony na: PORTED.',
          errorMessage: null,
          createdAt: '2026-04-09T10:00:00.000Z',
        },
      ],
    })
  })

  it('GET /api/porting-requests/:id/internal-notifications returns history payload', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/request-1/internal-notifications',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        success: true,
        data: {
          items: [
            expect.objectContaining({
              id: 'entry-1',
              entryType: 'USER_NOTIFICATION',
              eventCode: 'STATUS_CHANGED',
            }),
          ],
        },
      })
      expect(mockGetPortingRequestInternalNotifications).toHaveBeenCalledWith('request-1')
    } finally {
      await app.close()
    }
  })
})
