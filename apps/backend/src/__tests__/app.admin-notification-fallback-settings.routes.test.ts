import { beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('../shared/middleware/authenticate', () => ({
  authenticate: async (request: { user?: unknown }) => {
    request.user = {
      id: 'admin-1',
      role: 'ADMIN',
    }
  },
}))

vi.mock('../shared/middleware/authorize', () => ({
  authorize: () => async () => {},
}))

vi.mock('../modules/admin-settings/admin-notification-fallback-settings.service', () => ({
  getNotificationFallbackSettings: (...args: unknown[]) => mockGetSettings(...args),
  updateNotificationFallbackSettings: (...args: unknown[]) => mockUpdateSettings(...args),
}))

import { buildApp } from '../app'

describe('admin notification fallback settings routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSettings.mockResolvedValue({
      fallbackEnabled: true,
      fallbackRecipientEmail: 'fallback@multiplay.pl',
      fallbackRecipientName: 'Fallback BOK',
      applyToFailed: true,
      applyToMisconfigured: false,
      readiness: 'READY',
    })
    mockUpdateSettings.mockResolvedValue({
      fallbackEnabled: true,
      fallbackRecipientEmail: 'fallback@multiplay.pl',
      fallbackRecipientName: 'Fallback BOK',
      applyToFailed: true,
      applyToMisconfigured: true,
      readiness: 'READY',
    })
  })

  it('GET /api/admin/notification-fallback-settings returns settings payload', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/notification-fallback-settings',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        success: true,
        data: {
          fallbackEnabled: true,
          fallbackRecipientEmail: 'fallback@multiplay.pl',
          fallbackRecipientName: 'Fallback BOK',
          applyToFailed: true,
          applyToMisconfigured: false,
          readiness: 'READY',
        },
      })
      expect(mockGetSettings).toHaveBeenCalledTimes(1)
    } finally {
      await app.close()
    }
  })

  it('PUT /api/admin/notification-fallback-settings validates and saves settings', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/admin/notification-fallback-settings',
        payload: {
          fallbackEnabled: true,
          fallbackRecipientEmail: 'fallback@multiplay.pl',
          fallbackRecipientName: 'Fallback BOK',
          applyToFailed: true,
          applyToMisconfigured: true,
        },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        success: true,
        data: {
          readiness: 'READY',
        },
      })
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        {
          fallbackEnabled: true,
          fallbackRecipientEmail: 'fallback@multiplay.pl',
          fallbackRecipientName: 'Fallback BOK',
          applyToFailed: true,
          applyToMisconfigured: true,
        },
        'admin-1',
        expect.any(String),
        expect.any(String),
      )
    } finally {
      await app.close()
    }
  })

  it('PUT /api/admin/notification-fallback-settings returns 400 on invalid payload (enabled + empty email)', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/admin/notification-fallback-settings',
        payload: {
          fallbackEnabled: true,
          fallbackRecipientEmail: '',
          fallbackRecipientName: '',
          applyToFailed: true,
          applyToMisconfigured: true,
        },
      })

      expect(response.statusCode).toBe(400)
      expect(mockUpdateSettings).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('PUT /api/admin/notification-fallback-settings returns 400 on invalid email format', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/admin/notification-fallback-settings',
        payload: {
          fallbackEnabled: true,
          fallbackRecipientEmail: 'nie-email',
          fallbackRecipientName: '',
          applyToFailed: true,
          applyToMisconfigured: true,
        },
      })

      expect(response.statusCode).toBe(400)
      expect(mockUpdateSettings).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })
})
