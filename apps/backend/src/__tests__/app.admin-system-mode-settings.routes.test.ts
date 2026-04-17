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

vi.mock('../modules/admin-settings/admin-system-mode-settings.service', () => ({
  getSystemModeSettings: (...args: unknown[]) => mockGetSettings(...args),
  updateSystemModeSettings: (...args: unknown[]) => mockUpdateSettings(...args),
}))

import { buildApp } from '../app'

describe('admin system mode settings routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSettings.mockResolvedValue({
      settings: {
        mode: 'STANDALONE',
        pliCbd: {
          enabled: false,
          endpointUrl: '',
          credentialsRef: '',
          operatorCode: '',
        },
      },
      diagnostics: {
        configured: false,
        active: false,
        missingFields: ['endpointUrl', 'credentialsRef', 'operatorCode'],
      },
      capabilities: {
        mode: 'STANDALONE',
        pliCbd: {
          enabled: false,
          configured: false,
          active: false,
          capabilities: {
            export: false,
            sync: false,
            diagnostics: false,
            externalActions: false,
          },
        },
        resolvedAt: '2026-04-16T10:00:00.000Z',
      },
    })
    mockUpdateSettings.mockResolvedValue({
      settings: {
        mode: 'PLI_CBD_INTEGRATED',
        pliCbd: {
          enabled: true,
          endpointUrl: 'https://pli.example.test',
          credentialsRef: 'secret/pli',
          operatorCode: 'OP01',
        },
      },
      diagnostics: {
        configured: true,
        active: true,
        missingFields: [],
      },
      capabilities: {
        mode: 'PLI_CBD_INTEGRATED',
        pliCbd: {
          enabled: true,
          configured: true,
          active: true,
          capabilities: {
            export: true,
            sync: true,
            diagnostics: true,
            externalActions: true,
          },
        },
        resolvedAt: '2026-04-16T10:01:00.000Z',
      },
    })
  })

  it('GET /api/admin/system-mode-settings returns settings payload', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/system-mode-settings',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        success: true,
        data: {
          settings: {
            mode: 'STANDALONE',
            pliCbd: {
              enabled: false,
            },
          },
          diagnostics: {
            active: false,
          },
        },
      })
      expect(mockGetSettings).toHaveBeenCalledTimes(1)
    } finally {
      await app.close()
    }
  })

  it('PUT /api/admin/system-mode-settings validates, normalizes and saves settings', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/admin/system-mode-settings',
        headers: {
          'user-agent': 'vitest',
        },
        payload: {
          mode: 'PLI_CBD_INTEGRATED',
          pliCbd: {
            enabled: true,
            endpointUrl: ' https://pli.example.test ',
            credentialsRef: ' secret/pli ',
            operatorCode: ' op01 ',
          },
        },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        success: true,
        data: {
          diagnostics: {
            active: true,
          },
        },
      })
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        {
          mode: 'PLI_CBD_INTEGRATED',
          pliCbd: {
            enabled: true,
            endpointUrl: 'https://pli.example.test',
            credentialsRef: 'secret/pli',
            operatorCode: 'OP01',
          },
        },
        'admin-1',
        expect.any(String),
        expect.any(String),
      )
    } finally {
      await app.close()
    }
  })

  it('PUT /api/admin/system-mode-settings returns 400 on invalid endpoint URL', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/admin/system-mode-settings',
        payload: {
          mode: 'PLI_CBD_INTEGRATED',
          pliCbd: {
            enabled: true,
            endpointUrl: 'not-a-url',
            credentialsRef: 'secret/pli',
            operatorCode: 'OP01',
          },
        },
      })

      expect(response.statusCode).toBe(400)
      expect(mockUpdateSettings).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })
})
