import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, patchMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  patchMock: vi.fn(),
}))

vi.mock('./api.client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
  },
}))

import { changeOwnPassword, getAuthMe } from './auth.api'

describe('auth.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMock.mockResolvedValue({
      data: {
        data: {
          user: {
            id: 'user-1',
            email: 'jan.kowalski@np-manager.local',
            firstName: 'Jan',
            lastName: 'Kowalski',
            role: 'BOK_CONSULTANT',
            forcePasswordChange: false,
          },
        },
      },
    })
    patchMock.mockResolvedValue({
      data: {
        data: {
          message: 'Hasło zostało zmienione.',
        },
      },
    })
  })

  it('uses /auth/me to refresh the authenticated user', async () => {
    const user = await getAuthMe()

    expect(getMock).toHaveBeenCalledWith('/auth/me')
    expect(user.forcePasswordChange).toBe(false)
  })

  it('uses the self-service change-password endpoint with current and new passwords', async () => {
    const payload = {
      currentPassword: 'Temp@1234',
      newPassword: 'NoweHaslo@1234',
    }

    const result = await changeOwnPassword(payload)

    expect(patchMock).toHaveBeenCalledWith('/auth/change-password', payload)
    expect(result.message).toBe('Hasło zostało zmienione.')
  })
})
