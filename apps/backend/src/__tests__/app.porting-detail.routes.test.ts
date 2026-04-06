import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetPortingRequest, mockListPortingRequests } = vi.hoisted(() => ({
  mockGetPortingRequest: vi.fn(),
  mockListPortingRequests: vi.fn(),
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
  previewPortingCommunication: vi.fn(),
  createPortingCommunicationDraft: vi.fn(),
  getPortingCommunicationHistory: vi.fn(),
  markPortingCommunicationAsSent: vi.fn(),
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

const FAKE_DETAIL = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  caseNumber: 'FNP-TEST-001',
  statusInternal: 'DRAFT',
  numberDisplay: '22 123 45 67',
}

describe('porting request detail route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPortingRequest.mockResolvedValue(FAKE_DETAIL)
    mockListPortingRequests.mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
  })

  it('GET /api/porting-requests/:id returns 200 with detail DTO', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/550e8400-e29b-41d4-a716-446655440000',
      })

      expect(response.statusCode).toBe(200)

      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.request).toEqual(FAKE_DETAIL)
      expect(mockGetPortingRequest).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'ADMIN',
      )
    } finally {
      await app.close()
    }
  })

  it('GET /api/porting-requests/:id does NOT collide with sub-routes', async () => {
    const app = await buildApp()

    try {
      // Detail endpoint should work even with UUID containing hyphens
      const detailResponse = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/abc-123-def',
      })

      expect(detailResponse.statusCode).toBe(200)
      expect(mockGetPortingRequest).toHaveBeenCalledWith('abc-123-def', 'ADMIN')

      // List endpoint should still work
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/porting-requests',
      })

      expect(listResponse.statusCode).toBe(200)
      expect(mockListPortingRequests).toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('GET /api/porting-requests/:id/case-history does NOT match /:id handler', async () => {
    const app = await buildApp()

    try {
      // Sub-route should NOT call getPortingRequest
      await app.inject({
        method: 'GET',
        url: '/api/porting-requests/abc-123/case-history',
      })

      expect(mockGetPortingRequest).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })
})
