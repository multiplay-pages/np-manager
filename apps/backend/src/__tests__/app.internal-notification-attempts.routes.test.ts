import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockGetAttempts,
  mockRetryAttempt,
  mockGetNotificationFailures,
  mockGetGlobalAttempts,
  mockGetGlobalFailureQueue,
} = vi.hoisted(() => ({
  mockGetAttempts: vi.fn(),
  mockRetryAttempt: vi.fn(),
  mockGetNotificationFailures: vi.fn(),
  mockGetGlobalAttempts: vi.fn(),
  mockGetGlobalFailureQueue: vi.fn(),
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
  getPortingRequestNotificationFailures: (...args: unknown[]) =>
    mockGetNotificationFailures(...args),
}))

vi.mock('../modules/porting-requests/porting-internal-notification-attempts.service', () => ({
  getPortingRequestInternalNotificationAttempts: (...args: unknown[]) => mockGetAttempts(...args),
  retryInternalNotificationAttempt: (...args: unknown[]) => mockRetryAttempt(...args),
  InternalNotificationRetryConflictError: class InternalNotificationRetryConflictError extends Error {
    statusCode = 409
    code = 'INTERNAL_NOTIFICATION_RETRY_NOT_ELIGIBLE'
    isOperational = true
    retryBlockedReasonCode: string

    constructor(retryBlockedReasonCode: string) {
      super('Wybrana proba dostarczenia nie kwalifikuje sie do ponowienia.')
      this.retryBlockedReasonCode = retryBlockedReasonCode
    }
  },
}))

vi.mock('../modules/porting-requests/global-internal-notification-attempts.service', () => ({
  getGlobalInternalNotificationAttempts: (...args: unknown[]) => mockGetGlobalAttempts(...args),
}))

vi.mock('../modules/porting-requests/global-notification-failure-queue.service', () => ({
  getGlobalNotificationFailureQueue: (...args: unknown[]) => mockGetGlobalFailureQueue(...args),
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
import { InternalNotificationRetryConflictError } from '../modules/porting-requests/porting-internal-notification-attempts.service'

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
      canRetry: true,
      retryBlockedReasonCode: null,
      createdAt: '2026-04-11T10:00:00.000Z',
    },
  ],
}

const RETRY_RESULT = {
  sourceAttempt: {
    ...ATTEMPTS_RESULT.items[0],
    isLatestForChain: false,
    canRetry: false,
    retryBlockedReasonCode: 'NOT_LATEST_IN_CHAIN',
  },
  retryAttempt: {
    ...ATTEMPTS_RESULT.items[0],
    id: 'attempt-retry-1',
    attemptOrigin: 'RETRY',
    outcome: 'SENT',
    errorCode: null,
    errorMessage: null,
    failureKind: null,
    retryOfAttemptId: 'attempt-1',
    retryCount: 1,
    triggeredByUserId: 'manager-1',
    triggeredByDisplayName: 'Marta Manager (manager@np-manager.local)',
    canRetry: false,
    retryBlockedReasonCode: 'OUTCOME_NOT_RETRYABLE',
    createdAt: '2026-04-11T10:05:00.000Z',
  },
  chain: {
    rootAttemptId: 'attempt-1',
    latestAttemptId: 'attempt-retry-1',
    retryCount: 1,
    latestOutcome: 'SENT',
    isLatestSuccessful: true,
  },
}

const GLOBAL_ATTEMPTS_RESULT = {
  items: [],
  total: 0,
}

const NOTIFICATION_FAILURES_RESULT = {
  items: [
    {
      id: 'failure-1',
      occurredAt: '2026-04-11T10:00:00.000Z',
      outcome: 'FAILED',
      channel: 'EMAIL',
      message: 'Nie udalo sie wyslac notyfikacji przez e-mail.',
      technicalDetailsPreview: 'Tryb: REAL | SMTP timeout',
      isConfigurationIssue: false,
      isDeliveryIssue: true,
    },
  ],
}

const GLOBAL_FAILURE_QUEUE_RESULT = {
  items: [],
  total: 0,
}

describe('GET /api/internal-notification-attempts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetGlobalAttempts.mockResolvedValue(GLOBAL_ATTEMPTS_RESULT)
  })

  it('returns 403 for a non-admin operational role', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'manager-1', role: 'MANAGER' })
      const response = await app.inject({
        method: 'GET',
        url: '/api/internal-notification-attempts',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(403)
      expect(mockGetGlobalAttempts).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('returns global attempts for ADMIN', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })
      const response = await app.inject({
        method: 'GET',
        url: '/api/internal-notification-attempts',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({ success: true, data: GLOBAL_ATTEMPTS_RESULT })
      expect(mockGetGlobalAttempts).toHaveBeenCalledWith({
        outcome: undefined,
        channel: undefined,
        retryableOnly: undefined,
        limit: 50,
        offset: 0,
      })
    } finally {
      await app.close()
    }
  })
})

describe('GET /api/internal-notification-failures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetGlobalFailureQueue.mockResolvedValue(GLOBAL_FAILURE_QUEUE_RESULT)
  })

  it('returns 403 for a non-admin operational role', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'bok-1', role: 'BOK_CONSULTANT' })
      const response = await app.inject({
        method: 'GET',
        url: '/api/internal-notification-failures',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(403)
      expect(mockGetGlobalFailureQueue).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('returns global failure queue for ADMIN', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })
      const response = await app.inject({
        method: 'GET',
        url: '/api/internal-notification-failures',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({ success: true, data: GLOBAL_FAILURE_QUEUE_RESULT })
      expect(mockGetGlobalFailureQueue).toHaveBeenCalledWith({
        outcomes: ['FAILED', 'MISCONFIGURED'],
        canRetry: undefined,
        operationalStatus: undefined,
        sort: 'newest',
        limit: 50,
        offset: 0,
      })
    } finally {
      await app.close()
    }
  })
})

describe('GET /api/porting-requests/:id/internal-notification-attempts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAttempts.mockResolvedValue(ATTEMPTS_RESULT)
    mockRetryAttempt.mockResolvedValue(RETRY_RESULT)
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

  it('returns 403 for a non-admin operational role', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'manager-1', role: 'MANAGER' })
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

  it('returns request-level attempts for ADMIN and passes normalized limit', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })
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
      const token = app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })
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

describe('GET /api/porting-requests/:id/notification-failures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNotificationFailures.mockResolvedValue(NOTIFICATION_FAILURES_RESULT)
  })

  it('returns failure history for ADMIN', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/request-1/notification-failures',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        success: true,
        data: NOTIFICATION_FAILURES_RESULT,
      })
      expect(mockGetNotificationFailures).toHaveBeenCalledWith('request-1')
    } finally {
      await app.close()
    }
  })

  it('returns 403 for a non-admin operational role', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'manager-1', role: 'MANAGER' })
      const response = await app.inject({
        method: 'GET',
        url: '/api/porting-requests/request-1/notification-failures',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(403)
      expect(mockGetNotificationFailures).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })
})

describe('POST /api/porting-requests/:id/internal-notification-attempts/:attemptId/retry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAttempts.mockResolvedValue(ATTEMPTS_RESULT)
    mockRetryAttempt.mockResolvedValue(RETRY_RESULT)
  })

  it('returns 401 without JWT token', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/porting-requests/request-1/internal-notification-attempts/attempt-1/retry',
      })

      expect(response.statusCode).toBe(401)
      expect(mockRetryAttempt).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('returns 403 for a non-admin operational role', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'manager-1', role: 'MANAGER' })
      const response = await app.inject({
        method: 'POST',
        url: '/api/porting-requests/request-1/internal-notification-attempts/attempt-1/retry',
        headers: { authorization: `Bearer ${token}` },
        payload: { reason: 'test' },
      })

      expect(response.statusCode).toBe(403)
      expect(mockRetryAttempt).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('returns 201 for allowed role with retry result contract', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })
      const response = await app.inject({
        method: 'POST',
        url: '/api/porting-requests/request-1/internal-notification-attempts/attempt-1/retry',
        headers: { authorization: `Bearer ${token}` },
        payload: { reason: 'Ponawiam po poprawie SMTP' },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json<{ success: true; data: typeof RETRY_RESULT }>()
      expect(body.success).toBe(true)
      expect(body.data.sourceAttempt.id).toBe('attempt-1')
      expect(body.data.retryAttempt.id).toBe('attempt-retry-1')
      expect(body.data.chain.latestAttemptId).toBe('attempt-retry-1')
      expect(mockRetryAttempt).toHaveBeenCalledWith(
        'request-1',
        'attempt-1',
        { reason: 'Ponawiam po poprawie SMTP' },
        'admin-1',
        expect.any(String),
        'lightMyRequest',
      )
    } finally {
      await app.close()
    }
  })

  it('returns 404 for missing request or attempt', async () => {
    mockRetryAttempt.mockRejectedValueOnce(
      AppError.notFound('Sprawa portowania lub proba dostarczenia nie zostala znaleziona.'),
    )
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })
      const response = await app.inject({
        method: 'POST',
        url: '/api/porting-requests/missing/internal-notification-attempts/missing-attempt/retry',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(404)
    } finally {
      await app.close()
    }
  })

  it('returns 409 with retryBlockedReasonCode for non-eligible attempt', async () => {
    mockRetryAttempt.mockRejectedValueOnce(
      new InternalNotificationRetryConflictError('OUTCOME_NOT_RETRYABLE'),
    )
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })
      const response = await app.inject({
        method: 'POST',
        url: '/api/porting-requests/request-1/internal-notification-attempts/attempt-sent/retry',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(409)
      const body = response.json<{
        success: false
        error: { retryBlockedReasonCode: string }
      }>()
      expect(body.error.retryBlockedReasonCode).toBe('OUTCOME_NOT_RETRYABLE')
    } finally {
      await app.close()
    }
  })
})
