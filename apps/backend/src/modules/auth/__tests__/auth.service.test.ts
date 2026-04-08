import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUserFindUnique, mockUserUpdate, mockAuditLogEvent, mockBcryptCompare, mockBcryptHash } =
  vi.hoisted(() => ({
    mockUserFindUnique: vi.fn(),
    mockUserUpdate: vi.fn(),
    mockAuditLogEvent: vi.fn(),
    mockBcryptCompare: vi.fn(),
    mockBcryptHash: vi.fn(),
  }))

vi.mock('../../../config/database', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}))

vi.mock('../../../shared/audit/audit.service', () => ({
  logAuditEvent: (...args: unknown[]) => mockAuditLogEvent(...args),
}))

vi.mock('bcrypt', () => ({
  default: {
    compare: (...args: unknown[]) => mockBcryptCompare(...args),
    hash: (...args: unknown[]) => mockBcryptHash(...args),
  },
}))

import { changePassword } from '../auth.service'

function makeAuthUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'jan.kowalski@np-manager.local',
    isActive: true,
    passwordHash: '$2b$12$currentHash',
    ...overrides,
  }
}

describe('changePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuditLogEvent.mockResolvedValue(undefined)
    mockBcryptHash.mockResolvedValue('$2b$12$newHash')
  })

  it('updates the password hash and clears forcePasswordChange on happy path', async () => {
    mockUserFindUnique.mockResolvedValue(makeAuthUser())
    mockBcryptCompare.mockResolvedValue(true)
    mockUserUpdate.mockResolvedValue({})

    const result = await changePassword(
      'user-1',
      {
        currentPassword: 'Temp@1234',
        newPassword: 'NoweHaslo@1234',
      },
      '127.0.0.1',
      'Vitest',
    )

    expect(result.message).toBe('Hasło zostało zmienione.')
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          passwordHash: '$2b$12$newHash',
          forcePasswordChange: false,
          passwordChangedAt: expect.any(Date),
        }),
      }),
    )
  })

  it('rejects when currentPassword is invalid', async () => {
    mockUserFindUnique.mockResolvedValue(makeAuthUser())
    mockBcryptCompare.mockResolvedValue(false)

    await expect(
      changePassword('user-1', {
        currentPassword: 'ZleHaslo@1234',
        newPassword: 'NoweHaslo@1234',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_CURRENT_PASSWORD',
      statusCode: 400,
    })

    expect(mockUserUpdate).not.toHaveBeenCalled()
  })

  it('rejects when newPassword matches currentPassword', async () => {
    mockUserFindUnique.mockResolvedValue(makeAuthUser())
    mockBcryptCompare.mockResolvedValue(true)

    await expect(
      changePassword('user-1', {
        currentPassword: 'ToSamoHaslo@1234',
        newPassword: 'ToSamoHaslo@1234',
      }),
    ).rejects.toMatchObject({
      code: 'PASSWORD_REUSE_NOT_ALLOWED',
      statusCode: 400,
    })

    expect(mockUserUpdate).not.toHaveBeenCalled()
  })

  it('clears forcePasswordChange after successful password change', async () => {
    mockUserFindUnique.mockResolvedValue(makeAuthUser())
    mockBcryptCompare.mockResolvedValue(true)
    mockUserUpdate.mockResolvedValue({})

    await changePassword('user-1', {
      currentPassword: 'Temp@1234',
      newPassword: 'NoweHaslo@1234',
    })

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ forcePasswordChange: false }),
      }),
    )
  })

  it('updates passwordChangedAt timestamp on success', async () => {
    mockUserFindUnique.mockResolvedValue(makeAuthUser())
    mockBcryptCompare.mockResolvedValue(true)
    mockUserUpdate.mockResolvedValue({})

    await changePassword('user-1', {
      currentPassword: 'Temp@1234',
      newPassword: 'NoweHaslo@1234',
    })

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordChangedAt: expect.any(Date),
        }),
      }),
    )
  })

  it('rejects when account is unavailable', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    await expect(
      changePassword('user-1', {
        currentPassword: 'Temp@1234',
        newPassword: 'NoweHaslo@1234',
      }),
    ).rejects.toMatchObject({
      code: 'ACCOUNT_UNAVAILABLE',
      statusCode: 401,
    })
  })
})
