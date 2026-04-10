import { beforeEach, describe, expect, it, vi } from 'vitest'

// ============================================================
// Testy autoryzacji — authenticate i authorize NIE są mockowane.
// Sprawdzamy realne zachowanie middleware przy braku tokenu / złej roli.
// ============================================================

const { mockGetSettings, mockUpdateSettings } = vi.hoisted(() => ({
  mockGetSettings: vi.fn(),
  mockUpdateSettings: vi.fn(),
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

// Mock audit service — authorize loguje zdarzenia SECURITY_ALERT fire-and-forget
vi.mock('../shared/audit/audit.service', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../modules/auth/auth.router', () => ({ authRouter: async () => {} }))
vi.mock('../modules/users/users.router', () => ({ usersRouter: async () => {} }))
vi.mock('../modules/clients/clients.router', () => ({ clientsRouter: async () => {} }))
vi.mock('../modules/operators/operators.router', () => ({ operatorsRouter: async () => {} }))
vi.mock('../modules/porting-requests/porting-requests.router', () => ({
  portingRequestsRouter: async () => {},
}))
vi.mock('../modules/communications/communication-templates.router', () => ({
  communicationTemplatesRouter: async () => {},
}))
vi.mock('../modules/admin-users/admin-users.router', () => ({
  adminUsersRouter: async () => {},
}))
vi.mock('../modules/admin-settings/admin-porting-notification-settings.router', () => ({
  adminPortingNotificationSettingsRouter: async () => {},
}))

vi.mock('../modules/admin-settings/admin-notification-fallback-settings.service', () => ({
  getNotificationFallbackSettings: (...args: unknown[]) => mockGetSettings(...args),
  updateNotificationFallbackSettings: (...args: unknown[]) => mockUpdateSettings(...args),
}))

import { buildApp } from '../app'

describe('GET /api/admin/notification-fallback-settings — autoryzacja', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSettings.mockResolvedValue({
      fallbackEnabled: false,
      fallbackRecipientEmail: '',
      fallbackRecipientName: '',
      applyToFailed: true,
      applyToMisconfigured: true,
      readiness: 'DISABLED',
    })
  })

  it('zwraca 401 gdy brak tokenu JWT', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/notification-fallback-settings',
      })

      expect(response.statusCode).toBe(401)
      expect(mockGetSettings).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('zwraca 403 dla zalogowanego użytkownika z rolą BOK_CONSULTANT', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'bok-user-1', role: 'BOK_CONSULTANT' })

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/notification-fallback-settings',
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(403)
      expect(mockGetSettings).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })
})

describe('PUT /api/admin/notification-fallback-settings — autoryzacja', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('zwraca 403 dla zalogowanego użytkownika z rolą BOK_CONSULTANT', async () => {
    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'bok-user-1', role: 'BOK_CONSULTANT' })

      const response = await app.inject({
        method: 'PUT',
        url: '/api/admin/notification-fallback-settings',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          fallbackEnabled: true,
          fallbackRecipientEmail: 'fallback@multiplay.pl',
          fallbackRecipientName: 'Fallback BOK',
          applyToFailed: true,
          applyToMisconfigured: true,
        },
      })

      expect(response.statusCode).toBe(403)
      expect(mockUpdateSettings).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })
})
