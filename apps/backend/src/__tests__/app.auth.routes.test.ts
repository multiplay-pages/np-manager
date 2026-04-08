import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockLogin, mockGetMe, mockChangePassword } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockGetMe: vi.fn(),
  mockChangePassword: vi.fn(),
}))

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

vi.mock('../modules/auth/auth.service', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  getMe: (...args: unknown[]) => mockGetMe(...args),
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
}))

import { buildApp } from '../app'

describe('PATCH /api/auth/change-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires an active session', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/auth/change-password',
        payload: {
          currentPassword: 'Temp@1234',
          newPassword: 'NoweHaslo@1234',
        },
      })

      expect(response.statusCode).toBe(401)
      expect(mockChangePassword).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('passes authenticated user context to the service and returns a safe response', async () => {
    mockChangePassword.mockResolvedValue({
      message: 'Hasło zostało zmienione.',
    })

    const app = await buildApp()

    try {
      const token = app.jwt.sign({ id: 'user-1', role: 'BOK_CONSULTANT' })
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/auth/change-password',
        headers: {
          authorization: `Bearer ${token}`,
          'user-agent': 'Vitest',
        },
        payload: {
          currentPassword: 'Temp@1234',
          newPassword: 'NoweHaslo@1234',
        },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        success: true,
        data: {
          message: 'Hasło zostało zmienione.',
        },
      })
      expect(mockChangePassword).toHaveBeenCalledWith(
        'user-1',
        {
          currentPassword: 'Temp@1234',
          newPassword: 'NoweHaslo@1234',
        },
        expect.any(String),
        'Vitest',
      )
    } finally {
      await app.close()
    }
  })
})
