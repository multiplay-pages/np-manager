import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockSendPortingCommunication,
  mockRetryPortingCommunication,
  mockCancelPortingCommunication,
  mockGetPortingCommunicationDeliveryAttempts,
} = vi.hoisted(() => ({
  mockSendPortingCommunication: vi.fn(),
  mockRetryPortingCommunication: vi.fn(),
  mockCancelPortingCommunication: vi.fn(),
  mockGetPortingCommunicationDeliveryAttempts: vi.fn(),
}))

vi.mock('../modules/auth/auth.router', () => ({ authRouter: async () => {} }))
vi.mock('../modules/users/users.router', () => ({ usersRouter: async () => {} }))
vi.mock('../modules/clients/clients.router', () => ({ clientsRouter: async () => {} }))
vi.mock('../modules/operators/operators.router', () => ({ operatorsRouter: async () => {} }))

vi.mock('../shared/middleware/authenticate', () => ({
  authenticate: async (request: { user?: unknown }) => {
    request.user = { id: 'user-1', role: 'ADMIN' }
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
  previewPortingCommunication: vi.fn(),
  createPortingCommunicationDraft: vi.fn(),
  getPortingCommunicationHistory: vi.fn(),
  markPortingCommunicationAsSent: vi.fn(),
}))

vi.mock('../modules/porting-requests/communication-delivery.service', () => ({
  sendPortingCommunication: (...args: unknown[]) => mockSendPortingCommunication(...args),
  retryPortingCommunication: (...args: unknown[]) => mockRetryPortingCommunication(...args),
  cancelPortingCommunication: (...args: unknown[]) => mockCancelPortingCommunication(...args),
  getPortingCommunicationDeliveryAttempts: (...args: unknown[]) =>
    mockGetPortingCommunicationDeliveryAttempts(...args),
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

const MOCK_COMM_DTO = {
  id: 'comm-1',
  portingRequestId: 'req-1',
  actionType: 'CLIENT_CONFIRMATION',
  type: 'EMAIL',
  status: 'SENT',
  triggerType: 'CASE_RECEIVED',
  recipient: 'jan@example.com',
  subject: 'Testowy komunikat',
  body: 'Tresc testowa',
  templateKey: 'case_received',
  createdByUserId: 'user-1',
  createdByDisplayName: 'System Administrator',
  createdByRole: 'ADMIN',
  sentAt: '2026-04-07T10:01:00.000Z',
  errorMessage: null,
  metadata: null,
  createdAt: '2026-04-07T10:00:00.000Z',
  updatedAt: '2026-04-07T10:01:00.000Z',
}

const MOCK_ATTEMPT_DTO = {
  id: 'attempt-1',
  communicationId: 'comm-1',
  attemptedAt: '2026-04-07T10:01:00.000Z',
  attemptedByUserId: 'user-1',
  attemptedByDisplayName: 'System Administrator',
  channel: 'EMAIL',
  recipient: 'jan@example.com',
  subjectSnapshot: 'Testowy komunikat',
  bodySnapshot: 'Tresc testowa',
  outcome: 'STUBBED',
  transportMessageId: 'stub-msg-123',
  transportReference: 'stub-ref-comm-1',
  errorCode: null,
  errorMessage: null,
  responsePayloadJson: { mode: 'STUB' },
  adapterName: 'COMMUNICATION_DELIVERY_STUB',
}

const MOCK_SEND_RESULT = {
  communication: MOCK_COMM_DTO,
  attempt: MOCK_ATTEMPT_DTO,
}

describe('communication delivery routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendPortingCommunication.mockResolvedValue(MOCK_SEND_RESULT)
    mockRetryPortingCommunication.mockResolvedValue(MOCK_SEND_RESULT)
    mockCancelPortingCommunication.mockResolvedValue({ ...MOCK_COMM_DTO, status: 'CANCELLED' })
    mockGetPortingCommunicationDeliveryAttempts.mockResolvedValue({
      communicationId: 'comm-1',
      attempts: [MOCK_ATTEMPT_DTO],
    })
  })

  it('rejestruje endpoint send pod /api/porting-requests/:id/communications/:communicationId/send', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/porting-requests/req-1/communications/comm-1/send',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json<{ success: true; data: typeof MOCK_SEND_RESULT }>()
      expect(body.success).toBe(true)
      expect(body.data.communication.status).toBe('SENT')
      expect(body.data.attempt.outcome).toBe('STUBBED')

      const call = mockSendPortingCommunication.mock.calls[0]
      expect(call?.[0]).toBe('req-1')
      expect(call?.[1]).toBe('comm-1')
      expect(call?.[2]).toBe('user-1')
    } finally {
      await app.close()
    }
  })

  it('rejestruje endpoint retry pod /api/porting-requests/:id/communications/:communicationId/retry', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/porting-requests/req-1/communications/comm-1/retry',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json<{ success: true; data: typeof MOCK_SEND_RESULT }>()
      expect(body.success).toBe(true)

      const call = mockRetryPortingCommunication.mock.calls[0]
      expect(call?.[0]).toBe('req-1')
      expect(call?.[1]).toBe('comm-1')
    } finally {
      await app.close()
    }
  })

  it('rejestruje endpoint cancel pod /api/porting-requests/:id/communications/:communicationId/cancel', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/porting-requests/req-1/communications/comm-1/cancel',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json<{ success: true; data: { communication: { status: string } } }>()
      expect(body.success).toBe(true)
      expect(body.data.communication.status).toBe('CANCELLED')

      const call = mockCancelPortingCommunication.mock.calls[0]
      expect(call?.[0]).toBe('req-1')
      expect(call?.[1]).toBe('comm-1')
    } finally {
      await app.close()
    }
  })

  it('rejestruje endpoint delivery-attempts pod /api/porting-requests/:id/communications/:communicationId/delivery-attempts', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/req-1/communications/comm-1/delivery-attempts',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json<{
        success: true
        data: { communicationId: string; attempts: unknown[] }
      }>()
      expect(body.success).toBe(true)
      expect(body.data.communicationId).toBe('comm-1')
      expect(body.data.attempts).toHaveLength(1)

      const call = mockGetPortingCommunicationDeliveryAttempts.mock.calls[0]
      expect(call?.[0]).toBe('req-1')
      expect(call?.[1]).toBe('comm-1')
    } finally {
      await app.close()
    }
  })
})
