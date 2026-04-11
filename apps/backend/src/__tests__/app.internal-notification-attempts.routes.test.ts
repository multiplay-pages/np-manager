import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetAttempts } = vi.hoisted(() => ({
  mockGetAttempts: vi.fn(),
}))

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    FRONTEND_URL: 'http://localhost:5173',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    JWT_EXPIRES_IN: '8h',
    UPLOAD_DIR: './uploads',
    MAX_FILE_SIZE_MB: 10,
    LOG_LEVEL: 'error',
    PLI_CBD_TRANSPORT_MODE: 'STUB',
  },
}))

vi.mock('../shared/audit/audit.service', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
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
vi.mock('../modules/admin-settings/admin-porting-notification-settings.router', () => ({
  adminPortingNotificationSettingsRouter: async () => {},
}))
vi.mock('../modules/admin-settings/admin-notification-fallback-settings.router', () => ({
  adminNotificationFallbackSettingsRouter: async () => {},
}))

vi.mock('../modules/porting-requests/porting-requests.service', () => ({
  assignPortingRequestToMe: vi.fn(),
  createPortingRequest: vi.fn(),
  executePortingRequestExternalAction: vi.fn(),
  exportPortingRequestToPliCbd: vi.fn(),
  getPortingRequest: vi.fn(),
  getPortingRequestAssignmentHistory: vi.fn(),
  getPortingRequestIntegrationEvents: vi.fn(),
  getPortingRequestsOperationalSummary: vi.fn(),
  listAssignablePortingRequestUsers: vi.fn(),
  listCommercialOwnerCandidates: vi.fn(),
  listPortingRequests: vi.fn(),
  syncPortingRequestFromPliCbd: vi.fn(),
  updateCommercialOwner: vi.fn(),
  updatePortingRequestAssignment: vi.fn(),
  updatePortingRequestStatus: vi.fn(),
}))

vi.mock('../modules/porting-requests/porting-request-communication.service', () => ({
  createPortingCommunicationDraft: vi.fn(),
  getPortingCommunicationHistory: vi.fn(),
  markPortingCommunicationAsSent: vi.fn(),
  previewPortingCommunication: vi.fn(),
}))

vi.mock('../modules/porting-requests/communication-delivery.service', () => ({
  cancelPortingCommunication: vi.fn(),
  getPortingCommunicationDeliveryAttempts: vi.fn(),
  retryPortingCommunication: vi.fn(),
  sendPortingCommunication: vi.fn(),
}))

vi.mock('../modules/porting-requests/porting-events.service', () => ({
  getPortingRequestTimeline: vi.fn(),
}))

vi.mock('../modules/porting-requests/porting-request-case-history.service', () => ({
  getPortingRequestCaseHistory: vi.fn(),
}))

vi.mock('../modules/porting-requests/porting-internal-notification-history.service', () => ({
  getPortingRequestInternalNotifications: vi.fn(),
}))

vi.mock('../modules/porting-requests/porting-notification-failure-history.service', () => ({
  getPortingRequestNotificationFailures: vi.fn(),
}))

vi.mock('../modules/porting-requests/porting-internal-notification-attempts.service', () => ({
  getPortingRequestInternalNotificationAttempts: (...args: unknown[]) => mockGetAttempts(...args),
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

import { AppError } from '../shared/errors/app-error'
import { buildApp } from '../app'

const ATTEMPTS_RESULT = {
  requestId: 'request-1',
  items: [
    {
      id: 'attempt-1',
      requestId: 'request-1',
      eventCode: 'STATUS_CHANGED',
      eventLabel: 'Zmiana statusu sprawy',
      attemptOrigin: 'PRIMARY',
      channel: 'EMAIL',
      recipient: 'bok@multiplay.pl',
      mode: 'REAL',
      outcome: 'FAILED',
      errorCode: 'SMTP_TIMEOUT',
      errorMessage: 'Timeout SMTP',
      failureKind: 'DELIVERY',
      retryOfAttemptId: null,
      retryCount: 0,
      isLatestForChain: true,
      triggeredByUserId: null,
      triggeredByDisplayName: null,
      createdAt: '2026-04-11T10:00:00.000Z',
    },
  ],
}

describe('GET /api/porting-requests/:id/internal-notification-attempts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAttempts.mockResolvedValue(ATTEMPTS_RESULT)
  })

  it('returns 401 without JWT token', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/request-1/internal-notification-attempts',
      })

      expect(response.statusCode).toBe(401)
      expect(mockGetAttempts).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('returns 403 for an authenticated role outside read roles', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'client-user-1', role: 'CLIENT' })
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/request-1/internal-notification-attempts',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(403)
      expect(mockGetAttempts).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('returns request-level attempts for a read role and passes normalized limit', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'manager-1', role: 'MANAGER' })
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/request-1/internal-notification-attempts?limit=5',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json<{ success: true; data: typeof ATTEMPTS_RESULT }>()
      expect(body.success).toBe(true)
      expect(body.data.items).toHaveLength(1)
      expect(body.data.items[0]?.attemptOrigin).toBe('PRIMARY')
      expect(mockGetAttempts).toHaveBeenCalledWith('request-1', 5)
    } finally {
      await app.close()
    }
  })

  it('returns an empty list without error', async () => {
    mockGetAttempts.mockResolvedValueOnce({ requestId: 'request-empty', items: [] })
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'auditor-1', role: 'AUDITOR' })
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/request-empty/internal-notification-attempts',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json<{ success: true; data: { items: unknown[] } }>()
      expect(body.data.items).toEqual([])
    } finally {
      await app.close()
    }
  })

  it('returns 404 when the request does not exist', async () => {
    mockGetAttempts.mockRejectedValueOnce(
      AppError.notFound('Sprawa portowania nie zostala znaleziona.'),
    )
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/missing/internal-notification-attempts',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(404)
    } finally {
      await app.close()
    }
  })
})
