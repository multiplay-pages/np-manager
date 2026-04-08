import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, postMock, patchMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
}))

vi.mock('./api.client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
  },
}))

import {
  createAdminUser,
  deactivateAdminUser,
  getAdminUserAuditLog,
  getAdminUserDetail,
  getAdminUsers,
  reactivateAdminUser,
  resetAdminUserPassword,
  updateAdminUserRole,
} from './adminUsers.api'

describe('adminUsers.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMock.mockResolvedValue({ data: { data: { users: [], total: 0, logs: [], user: { id: 'user-1' } } } })
    postMock.mockResolvedValue({ data: { data: { user: { id: 'user-1' }, targetUserId: 'user-1', forcePasswordChange: true, message: 'OK' } } })
    patchMock.mockResolvedValue({ data: { data: { user: { id: 'user-1' } } } })
  })

  it('builds admin users list query params from filters', async () => {
    await getAdminUsers({ role: 'ADMIN', isActive: false, query: 'anna ' })

    expect(getMock).toHaveBeenCalledWith('/admin/users?role=ADMIN&isActive=false&query=anna')
  })

  it('uses detail and audit-log endpoints for a selected user', async () => {
    await getAdminUserDetail('user-42')
    await getAdminUserAuditLog('user-42')

    expect(getMock).toHaveBeenNthCalledWith(1, '/admin/users/user-42')
    expect(getMock).toHaveBeenNthCalledWith(2, '/admin/users/user-42/audit-log')
  })

  it('uses create and role update endpoints with expected payloads', async () => {
    const createPayload = {
      email: 'anna.admin@firma.pl',
      firstName: 'Anna',
      lastName: 'Admin',
      role: 'ADMIN' as const,
      temporaryPassword: 'Admin@1234',
    }
    const rolePayload = { role: 'MANAGER' as const }

    await createAdminUser(createPayload)
    await updateAdminUserRole('user-1', rolePayload)

    expect(postMock).toHaveBeenCalledWith('/admin/users', createPayload)
    expect(patchMock).toHaveBeenCalledWith('/admin/users/user-1/role', rolePayload)
  })

  it('uses deactivate, reactivate and reset-password endpoints', async () => {
    await deactivateAdminUser('user-1')
    await reactivateAdminUser('user-1')
    await resetAdminUserPassword('user-1', { temporaryPassword: 'NewTemp@1234' })

    expect(patchMock).toHaveBeenNthCalledWith(1, '/admin/users/user-1/deactivate')
    expect(patchMock).toHaveBeenNthCalledWith(2, '/admin/users/user-1/reactivate')
    expect(postMock).toHaveBeenCalledWith('/admin/users/user-1/reset-password', {
      temporaryPassword: 'NewTemp@1234',
    })
  })
})
