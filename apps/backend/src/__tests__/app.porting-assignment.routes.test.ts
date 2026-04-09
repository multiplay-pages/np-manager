import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockListPortingRequests,
  mockGetPortingRequest,
  mockCreatePortingRequest,
  mockUpdatePortingRequestStatus,
  mockExecutePortingRequestExternalAction,
  mockExportPortingRequestToPliCbd,
  mockSyncPortingRequestFromPliCbd,
  mockGetPortingRequestIntegrationEvents,
  mockUpdatePortingRequestAssignment,
  mockAssignPortingRequestToMe,
  mockGetPortingRequestAssignmentHistory,
  mockListAssignablePortingRequestUsers,
} = vi.hoisted(() => ({
  mockListPortingRequests: vi.fn(),
  mockGetPortingRequest: vi.fn(),
  mockCreatePortingRequest: vi.fn(),
  mockUpdatePortingRequestStatus: vi.fn(),
  mockExecutePortingRequestExternalAction: vi.fn(),
  mockExportPortingRequestToPliCbd: vi.fn(),
  mockSyncPortingRequestFromPliCbd: vi.fn(),
  mockGetPortingRequestIntegrationEvents: vi.fn(),
  mockUpdatePortingRequestAssignment: vi.fn(),
  mockAssignPortingRequestToMe: vi.fn(),
  mockGetPortingRequestAssignmentHistory: vi.fn(),
  mockListAssignablePortingRequestUsers: vi.fn(),
}))

vi.mock('../modules/auth/auth.router', () => ({ authRouter: async () => {} }))
vi.mock('../modules/users/users.router', () => ({ usersRouter: async () => {} }))
vi.mock('../modules/clients/clients.router', () => ({ clientsRouter: async () => {} }))
vi.mock('../modules/operators/operators.router', () => ({ operatorsRouter: async () => {} }))
vi.mock('../modules/communications/communication-templates.router', () => ({
  communicationTemplatesRouter: async () => {},
}))
vi.mock('../modules/admin-users/admin-users.router', () => ({
  adminUsersRouter: async () => {},
}))

vi.mock('../modules/porting-requests/porting-requests.service', () => ({
  createPortingRequest: (...args: unknown[]) => mockCreatePortingRequest(...args),
  executePortingRequestExternalAction: (...args: unknown[]) =>
    mockExecutePortingRequestExternalAction(...args),
  exportPortingRequestToPliCbd: (...args: unknown[]) => mockExportPortingRequestToPliCbd(...args),
  getPortingRequestIntegrationEvents: (...args: unknown[]) =>
    mockGetPortingRequestIntegrationEvents(...args),
  getPortingRequest: (...args: unknown[]) => mockGetPortingRequest(...args),
  listPortingRequests: (...args: unknown[]) => mockListPortingRequests(...args),
  listAssignablePortingRequestUsers: (...args: unknown[]) =>
    mockListAssignablePortingRequestUsers(...args),
  syncPortingRequestFromPliCbd: (...args: unknown[]) => mockSyncPortingRequestFromPliCbd(...args),
  updatePortingRequestStatus: (...args: unknown[]) => mockUpdatePortingRequestStatus(...args),
  updatePortingRequestAssignment: (...args: unknown[]) => mockUpdatePortingRequestAssignment(...args),
  assignPortingRequestToMe: (...args: unknown[]) => mockAssignPortingRequestToMe(...args),
  getPortingRequestAssignmentHistory: (...args: unknown[]) =>
    mockGetPortingRequestAssignmentHistory(...args),
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

vi.mock('../modules/porting-requests/porting-events.service', () => ({
  getPortingRequestTimeline: vi.fn(),
}))

vi.mock('../modules/porting-requests/porting-request-case-history.service', () => ({
  getPortingRequestCaseHistory: vi.fn(),
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

function makeRequestDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: 'request-1',
    caseNumber: 'FNP-20260408-ABC123',
    assignedUser: null,
    assignedAt: null,
    assignedByUserId: null,
    ...overrides,
  }
}

describe('porting request assignment routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListPortingRequests.mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
    mockGetPortingRequest.mockResolvedValue(makeRequestDetail())
    mockCreatePortingRequest.mockResolvedValue(makeRequestDetail())
    mockUpdatePortingRequestStatus.mockResolvedValue(makeRequestDetail())
    mockExecutePortingRequestExternalAction.mockResolvedValue({ request: makeRequestDetail(), communication: null })
    mockExportPortingRequestToPliCbd.mockResolvedValue(makeRequestDetail())
    mockSyncPortingRequestFromPliCbd.mockResolvedValue(makeRequestDetail())
    mockGetPortingRequestIntegrationEvents.mockResolvedValue({ items: [] })
    mockUpdatePortingRequestAssignment.mockResolvedValue(
      makeRequestDetail({
        assignedUser: {
          id: 'user-2',
          email: 'anna.nowak@np-manager.local',
          displayName: 'Anna Nowak',
          role: 'BOK_CONSULTANT',
        },
        assignedAt: '2026-04-08T11:00:00.000Z',
        assignedByUserId: 'actor-1',
      }),
    )
    mockAssignPortingRequestToMe.mockResolvedValue(
      makeRequestDetail({
        assignedUser: {
          id: 'bok-1',
          email: 'bok@np-manager.local',
          displayName: 'Konsultant BOK',
          role: 'BOK_CONSULTANT',
        },
        assignedAt: '2026-04-08T11:10:00.000Z',
        assignedByUserId: 'bok-1',
      }),
    )
    mockGetPortingRequestAssignmentHistory.mockResolvedValue({
      items: [
        {
          id: 'history-1',
          portingRequestId: 'request-1',
          previousAssignedUser: null,
          nextAssignedUser: {
            id: 'user-2',
            email: 'anna.nowak@np-manager.local',
            displayName: 'Anna Nowak',
            role: 'BOK_CONSULTANT',
          },
          changedByUser: {
            id: 'admin-1',
            email: 'admin@np-manager.local',
            displayName: 'System Administrator',
            role: 'ADMIN',
          },
          createdAt: '2026-04-08T11:00:00.000Z',
        },
      ],
    })
    mockListAssignablePortingRequestUsers.mockResolvedValue({
      users: [
        { id: 'user-2', email: 'anna.nowak@np-manager.local', firstName: 'Anna', lastName: 'Nowak', role: 'BOK_CONSULTANT' },
      ],
    })
  })

  it('PATCH /api/porting-requests/:id/assignment requires auth', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/porting-requests/request-1/assignment',
        payload: { assignedUserId: '550e8400-e29b-41d4-a716-446655440111' },
      })

      expect(response.statusCode).toBe(401)
      expect(mockUpdatePortingRequestAssignment).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('PATCH /api/porting-requests/:id/assignment rejects role without assignment permissions', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'backoffice-1', role: 'BACK_OFFICE' })
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/porting-requests/request-1/assignment',
        headers: { authorization: `Bearer ${token}` },
        payload: { assignedUserId: '550e8400-e29b-41d4-a716-446655440111' },
      })

      expect(response.statusCode).toBe(403)
      expect(mockUpdatePortingRequestAssignment).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('PATCH /api/porting-requests/:id/assignment allows ADMIN and forwards payload', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'actor-1', role: 'ADMIN' })
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/porting-requests/request-1/assignment',
        headers: {
          authorization: `Bearer ${token}`,
          'user-agent': 'Vitest',
        },
        payload: { assignedUserId: '550e8400-e29b-41d4-a716-446655440111' },
      })

      expect(response.statusCode).toBe(200)
      expect(mockUpdatePortingRequestAssignment).toHaveBeenCalledWith(
        'request-1',
        { assignedUserId: '550e8400-e29b-41d4-a716-446655440111' },
        'actor-1',
        'ADMIN',
        expect.any(String),
        'Vitest',
      )
    } finally {
      await app.close()
    }
  })

  it('POST /api/porting-requests/:id/assignment/assign-to-me assigns request to authenticated BOK user', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'bok-1', role: 'BOK_CONSULTANT' })
      const response = await app.inject({
        method: 'POST',
        url: '/api/porting-requests/request-1/assignment/assign-to-me',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)
      expect(mockAssignPortingRequestToMe).toHaveBeenCalledWith(
        'request-1',
        'bok-1',
        'BOK_CONSULTANT',
        expect.any(String),
        expect.any(String),
      )
    } finally {
      await app.close()
    }
  })

  it('GET /api/porting-requests/:id/assignment-history is available for read-only roles', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'auditor-1', role: 'AUDITOR' })
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/request-1/assignment-history',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)
      expect(mockGetPortingRequestAssignmentHistory).toHaveBeenCalledWith('request-1')
    } finally {
      await app.close()
    }
  })

  it('GET /api/porting-requests/assignment-users requires auth', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/assignment-users',
      })

      expect(response.statusCode).toBe(401)
      expect(mockListAssignablePortingRequestUsers).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('GET /api/porting-requests/assignment-users returns 403 for roles without assignment permissions', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'backoffice-1', role: 'BACK_OFFICE' })
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/assignment-users',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(403)
      expect(mockListAssignablePortingRequestUsers).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('GET /api/porting-requests/assignment-users is accessible for BOK_CONSULTANT', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'bok-1', role: 'BOK_CONSULTANT' })
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/assignment-users',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)
      expect(mockListAssignablePortingRequestUsers).toHaveBeenCalledOnce()
      const body = response.json<{ success: true; data: { users: unknown[] } }>()
      expect(body.data.users).toHaveLength(1)
    } finally {
      await app.close()
    }
  })
})
