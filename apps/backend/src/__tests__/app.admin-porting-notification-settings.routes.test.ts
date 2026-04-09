import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetSettings, mockUpdateSettings } = vi.hoisted(() => ({
  mockGetSettings: vi.fn(),
  mockUpdateSettings: vi.fn(),
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

vi.mock('../modules/admin-settings/admin-porting-notification-settings.service', () => ({
  getPortingNotificationSettings: (...args: unknown[]) => mockGetSettings(...args),
  updatePortingNotificationSettings: (...args: unknown[]) => mockUpdateSettings(...args),
}))

import { buildApp } from '../app'

describe('admin porting notification settings routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSettings.mockResolvedValue({
      sharedEmails: 'bok@multiplay.pl,sud@multiplay.pl',
      teamsEnabled: false,
      teamsWebhookUrl: '',
      diagnostics: {
        emailAdapterMode: 'STUB',
        smtpConfigured: false,
      },
    })
    mockUpdateSettings.mockResolvedValue({
      sharedEmails: 'bok@multiplay.pl',
      teamsEnabled: true,
      teamsWebhookUrl: 'https://teams.example/hook',
      diagnostics: {
        emailAdapterMode: 'REAL',
        smtpConfigured: true,
      },
    })
  })

  it('GET /api/admin/porting-notification-settings returns settings payload', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/porting-notification-settings',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        success: true,
        data: {
          sharedEmails: 'bok@multiplay.pl,sud@multiplay.pl',
          teamsEnabled: false,
        },
      })
      expect(mockGetSettings).toHaveBeenCalledTimes(1)
    } finally {
      await app.close()
    }
  })

  it('PUT /api/admin/porting-notification-settings validates and saves settings', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/admin/porting-notification-settings',
        payload: {
          sharedEmails: 'bok@multiplay.pl',
          teamsEnabled: true,
          teamsWebhookUrl: 'https://teams.example/hook',
        },
      })

      expect(response.statusCode).toBe(200)
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        {
          sharedEmails: 'bok@multiplay.pl',
          teamsEnabled: true,
          teamsWebhookUrl: 'https://teams.example/hook',
        },
        'admin-1',
        expect.any(String),
        expect.any(String),
      )
    } finally {
      await app.close()
    }
  })

  it('PUT /api/admin/porting-notification-settings returns 400 on invalid payload', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/admin/porting-notification-settings',
        payload: {
          sharedEmails: 'bok@multiplay.pl,nie-email',
          teamsEnabled: true,
          teamsWebhookUrl: 'nie-url',
        },
      })

      expect(response.statusCode).toBe(400)
      expect(mockUpdateSettings).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })
})
