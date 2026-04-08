import { beforeEach, describe, expect, it, vi } from 'vitest'

// ============================================================
// PRISMA MOCK
// ============================================================

const {
  mockUserFindUnique,
  mockUserFindMany,
  mockUserCount,
  mockUserCreate,
  mockUserUpdate,
  mockAuditLogCreate,
  mockAuditLogFindMany,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockUserCount: vi.fn(),
  mockUserCreate: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockAuditLogCreate: vi.fn(),
  mockAuditLogFindMany: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
      count: (...args: unknown[]) => mockUserCount(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    userAdminAuditLog: {
      create: (...args: unknown[]) => mockAuditLogCreate(...args),
      findMany: (...args: unknown[]) => mockAuditLogFindMany(...args),
    },
  },
}))

// Mock bcrypt — pomijamy kosztowne bcrypt w testach serwisowych
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$mockedhashvalue'),
    compare: vi.fn(),
  },
}))

import {
  listAdminUsers,
  getAdminUserById,
  createAdminUser,
  updateUserRole,
  deactivateAdminUser,
  reactivateAdminUser,
  resetUserPassword,
  getUserAdminAuditLog,
} from '../admin-users.service'

// ============================================================
// FIXTURES
// ============================================================

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'jan.kowalski@test.local',
    firstName: 'Jan',
    lastName: 'Kowalski',
    role: 'BOK_CONSULTANT',
    isActive: true,
    forcePasswordChange: false,
    passwordChangedAt: null,
    lastLoginAt: null,
    deactivatedAt: null,
    deactivatedByUserId: null,
    reactivatedAt: null,
    reactivatedByUserId: null,
    createdAt: new Date('2026-04-01T10:00:00.000Z'),
    updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    ...overrides,
  }
}

function makeAdminUser(overrides: Record<string, unknown> = {}) {
  return makeUser({ id: 'admin-1', email: 'admin@test.local', role: 'ADMIN', ...overrides })
}

// ============================================================
// listAdminUsers
// ============================================================

describe('listAdminUsers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('zwraca listę i łączną liczbę użytkowników', async () => {
    const users = [makeUser(), makeAdminUser()]
    mockUserFindMany.mockResolvedValue(users)
    mockUserCount.mockResolvedValue(2)

    const result = await listAdminUsers({})
    expect(result.users).toHaveLength(2)
    expect(result.total).toBe(2)
  })

  it('przekazuje filtr role do prisma', async () => {
    mockUserFindMany.mockResolvedValue([])
    mockUserCount.mockResolvedValue(0)

    await listAdminUsers({ role: 'ADMIN' })

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ role: 'ADMIN' }) }),
    )
  })

  it('przekazuje filtr isActive do prisma', async () => {
    mockUserFindMany.mockResolvedValue([])
    mockUserCount.mockResolvedValue(0)

    await listAdminUsers({ isActive: false })

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: false }) }),
    )
  })

  it('przekazuje filtr query jako OR po email/firstName/lastName', async () => {
    mockUserFindMany.mockResolvedValue([])
    mockUserCount.mockResolvedValue(0)

    await listAdminUsers({ query: 'kowal' })

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ email: expect.objectContaining({ contains: 'kowal' }) }),
          ]),
        }),
      }),
    )
  })
})

// ============================================================
// getAdminUserById
// ============================================================

describe('getAdminUserById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('zwraca użytkownika gdy istnieje', async () => {
    const user = makeUser()
    mockUserFindUnique.mockResolvedValue(user)

    const result = await getAdminUserById('user-1')
    expect(result.id).toBe('user-1')
    expect(result).not.toHaveProperty('passwordHash')
  })

  it('rzuca 404 gdy użytkownik nie istnieje', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    await expect(getAdminUserById('nieznany')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
      statusCode: 404,
    })
  })
})

// ============================================================
// createAdminUser
// ============================================================

describe('createAdminUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('tworzy użytkownika z forcePasswordChange=true', async () => {
    mockUserFindUnique.mockResolvedValue(null) // email nie istnieje
    const created = makeUser({ forcePasswordChange: true, isActive: true })
    mockUserCreate.mockResolvedValue(created)
    mockAuditLogCreate.mockResolvedValue({})

    const result = await createAdminUser(
      {
        email: 'nowy@test.local',
        firstName: 'Nowy',
        lastName: 'User',
        role: 'BOK_CONSULTANT',
        temporaryPassword: 'Temp@1234',
      },
      'actor-admin-1',
    )

    expect(result.forcePasswordChange).toBe(true)
    expect(result.isActive).toBe(true)
  })

  it('zapisuje audit log USER_CREATED', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    mockUserCreate.mockResolvedValue(makeUser({ forcePasswordChange: true }))
    mockAuditLogCreate.mockResolvedValue({})

    await createAdminUser(
      {
        email: 'nowy@test.local',
        firstName: 'Nowy',
        lastName: 'User',
        role: 'BOK_CONSULTANT',
        temporaryPassword: 'Temp@1234',
      },
      'actor-admin-1',
    )

    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'USER_CREATED', actorUserId: 'actor-admin-1' }),
      }),
    )
  })

  it('rzuca 409 gdy email już istnieje', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'existing-id' })

    await expect(
      createAdminUser(
        {
          email: 'istniejacy@test.local',
          firstName: 'X',
          lastName: 'Y',
          role: 'BOK_CONSULTANT',
          temporaryPassword: 'Temp@1234',
        },
        'actor-admin-1',
      ),
    ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_EXISTS', statusCode: 409 })
  })
})

// ============================================================
// updateUserRole
// ============================================================

describe('updateUserRole', () => {
  beforeEach(() => vi.clearAllMocks())

  it('zmienia rolę i zapisuje audit USER_ROLE_CHANGED', async () => {
    const user = makeUser({ id: 'user-1', role: 'BOK_CONSULTANT', isActive: true })
    const updated = makeUser({ id: 'user-1', role: 'BACK_OFFICE' })
    mockUserFindUnique
      .mockResolvedValueOnce(user)   // find user
    mockUserUpdate.mockResolvedValue(updated)
    mockAuditLogCreate.mockResolvedValue({})

    const result = await updateUserRole('user-1', { role: 'BACK_OFFICE' }, 'actor-admin-1')

    expect(result.role).toBe('BACK_OFFICE')
    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: 'USER_ROLE_CHANGED',
          previousStateJson: { role: 'BOK_CONSULTANT' },
          nextStateJson: { role: 'BACK_OFFICE' },
        }),
      }),
    )
  })

  it('rzuca 409 przy próbie zmiany roli ostatniego aktywnego admina', async () => {
    const admin = makeAdminUser({ id: 'admin-1', isActive: true })
    mockUserFindUnique.mockResolvedValue(admin)
    mockUserCount.mockResolvedValue(0) // brak innych aktywnych adminów

    await expect(
      updateUserRole('admin-1', { role: 'BOK_CONSULTANT' }, 'aktor'),
    ).rejects.toMatchObject({ code: 'LAST_ACTIVE_ADMIN_PROTECTED', statusCode: 409 })
  })

  it('pozwala zmienić rolę admina gdy są inni aktywni admini', async () => {
    const admin = makeAdminUser({ id: 'admin-1', isActive: true })
    const updated = makeAdminUser({ id: 'admin-1', role: 'MANAGER' })
    mockUserFindUnique.mockResolvedValue(admin)
    mockUserCount.mockResolvedValue(1) // jest jeszcze 1 aktywny admin
    mockUserUpdate.mockResolvedValue(updated)
    mockAuditLogCreate.mockResolvedValue({})

    const result = await updateUserRole('admin-1', { role: 'MANAGER' }, 'actor-admin-2')
    expect(result.role).toBe('MANAGER')
  })

  it('idempotencja — ta sama rola zwraca aktualny stan bez update', async () => {
    const user = makeUser({ role: 'BOK_CONSULTANT' })
    mockUserFindUnique.mockResolvedValue(user) // pierwsze wywołanie — findUnique for check
    // Drugie wywołanie to getAdminUserById (wewnętrzny select)
    mockUserFindUnique.mockResolvedValue(user)

    await updateUserRole('user-1', { role: 'BOK_CONSULTANT' }, 'actor')

    expect(mockUserUpdate).not.toHaveBeenCalled()
    expect(mockAuditLogCreate).not.toHaveBeenCalled()
  })

  it('rzuca 404 gdy użytkownik nie istnieje', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    await expect(
      updateUserRole('nieznany', { role: 'ADMIN' }, 'actor'),
    ).rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 })
  })
})

// ============================================================
// deactivateAdminUser
// ============================================================

describe('deactivateAdminUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('dezaktywuje użytkownika i zapisuje audit USER_DEACTIVATED', async () => {
    const user = makeUser({ isActive: true })
    const updated = makeUser({ isActive: false, deactivatedAt: new Date() })
    mockUserFindUnique.mockResolvedValue(user)
    mockUserUpdate.mockResolvedValue(updated)
    mockAuditLogCreate.mockResolvedValue({})

    const result = await deactivateAdminUser('user-1', 'actor-admin-1')

    expect(result.isActive).toBe(false)
    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'USER_DEACTIVATED' }),
      }),
    )
  })

  it('rzuca 400 przy próbie dezaktywacji samego siebie', async () => {
    await expect(deactivateAdminUser('actor-1', 'actor-1')).rejects.toMatchObject({
      code: 'CANNOT_DEACTIVATE_SELF',
      statusCode: 400,
    })
  })

  it('rzuca 409 przy próbie dezaktywacji ostatniego aktywnego admina', async () => {
    const admin = makeAdminUser({ isActive: true })
    mockUserFindUnique.mockResolvedValue(admin)
    mockUserCount.mockResolvedValue(0) // brak innych aktywnych adminów

    await expect(deactivateAdminUser('admin-1', 'inny-aktor')).rejects.toMatchObject({
      code: 'LAST_ACTIVE_ADMIN_PROTECTED',
      statusCode: 409,
    })
  })

  it('rzuca 409 gdy konto jest już nieaktywne', async () => {
    const user = makeUser({ isActive: false })
    mockUserFindUnique.mockResolvedValue(user)

    await expect(deactivateAdminUser('user-1', 'actor')).rejects.toMatchObject({
      code: 'ALREADY_DEACTIVATED',
      statusCode: 409,
    })
  })

  it('rzuca 404 gdy użytkownik nie istnieje', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    await expect(deactivateAdminUser('nieznany', 'actor')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
      statusCode: 404,
    })
  })
})

// ============================================================
// reactivateAdminUser
// ============================================================

describe('reactivateAdminUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reaktywuje konto i zapisuje audit USER_REACTIVATED', async () => {
    const user = makeUser({ isActive: false })
    const updated = makeUser({ isActive: true, reactivatedAt: new Date() })
    mockUserFindUnique.mockResolvedValue(user)
    mockUserUpdate.mockResolvedValue(updated)
    mockAuditLogCreate.mockResolvedValue({})

    const result = await reactivateAdminUser('user-1', 'actor-admin-1')

    expect(result.isActive).toBe(true)
    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'USER_REACTIVATED' }),
      }),
    )
  })

  it('rzuca 409 gdy konto jest już aktywne', async () => {
    const user = makeUser({ isActive: true })
    mockUserFindUnique.mockResolvedValue(user)

    await expect(reactivateAdminUser('user-1', 'actor')).rejects.toMatchObject({
      code: 'ALREADY_ACTIVE',
      statusCode: 409,
    })
  })

  it('rzuca 404 gdy użytkownik nie istnieje', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    await expect(reactivateAdminUser('nieznany', 'actor')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
      statusCode: 404,
    })
  })
})

// ============================================================
// resetUserPassword
// ============================================================

describe('resetUserPassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('aktualizuje hasło i ustawia forcePasswordChange=true', async () => {
    const user = makeUser()
    mockUserFindUnique.mockResolvedValue(user)
    mockUserUpdate.mockResolvedValue({ ...user, forcePasswordChange: true })
    mockAuditLogCreate.mockResolvedValue({})

    const result = await resetUserPassword('user-1', { temporaryPassword: 'NewTemp@1234' }, 'actor')

    expect(result.forcePasswordChange).toBe(true)
    expect(result.targetUserId).toBe('user-1')
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ forcePasswordChange: true }),
      }),
    )
  })

  it('zapisuje audit USER_PASSWORD_RESET bez hasła w logu', async () => {
    const user = makeUser()
    mockUserFindUnique.mockResolvedValue(user)
    mockUserUpdate.mockResolvedValue(user)
    mockAuditLogCreate.mockResolvedValue({})

    await resetUserPassword('user-1', { temporaryPassword: 'NewTemp@1234' }, 'actor')

    expect(mockAuditLogCreate).toHaveBeenCalled()
    const auditCall = mockAuditLogCreate.mock.calls[0]?.[0] as { data: { actionType: string } }
    expect(auditCall?.data?.actionType).toBe('USER_PASSWORD_RESET')
    // Upewniamy się, że hasło nie jest logowane
    expect(JSON.stringify(auditCall)).not.toContain('NewTemp@1234')
    expect(JSON.stringify(auditCall)).not.toContain('passwordHash')
  })

  it('rzuca 404 gdy użytkownik nie istnieje', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    await expect(
      resetUserPassword('nieznany', { temporaryPassword: 'NewTemp@1234' }, 'actor'),
    ).rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 })
  })
})

// ============================================================
// getUserAdminAuditLog
// ============================================================

describe('getUserAdminAuditLog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('zwraca audit log posortowany malejąco', async () => {
    const user = makeUser()
    mockUserFindUnique.mockResolvedValue(user)

    const logs = [
      {
        id: 'log-2',
        targetUserId: 'user-1',
        actorUserId: 'admin-1',
        actionType: 'USER_DEACTIVATED',
        previousStateJson: { isActive: true },
        nextStateJson: { isActive: false },
        reason: null,
        createdAt: new Date('2026-04-08T12:00:00.000Z'),
      },
      {
        id: 'log-1',
        targetUserId: 'user-1',
        actorUserId: 'admin-1',
        actionType: 'USER_CREATED',
        previousStateJson: null,
        nextStateJson: { role: 'BOK_CONSULTANT' },
        reason: null,
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
      },
    ]

    mockAuditLogFindMany.mockResolvedValue(logs)

    const result = await getUserAdminAuditLog('user-1')

    expect(result).toHaveLength(2)
    expect(result[0]?.actionType).toBe('USER_DEACTIVATED')
  })

  it('rzuca 404 gdy użytkownik nie istnieje', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    await expect(getUserAdminAuditLog('nieznany')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
      statusCode: 404,
    })
  })
})

// ============================================================
// REGUŁA OSTATNIEGO AKTYWNEGO ADMINA — testy poziomowe
// ============================================================

describe('ochrona ostatniego aktywnego ADMIN-a', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deactivateAdminUser blokuje gdy jest tylko 1 aktywny admin', async () => {
    const admin = makeAdminUser({ isActive: true })
    mockUserFindUnique.mockResolvedValue(admin)
    mockUserCount.mockResolvedValue(0) // żaden inny aktywny admin

    await expect(deactivateAdminUser('admin-1', 'inny')).rejects.toMatchObject({
      code: 'LAST_ACTIVE_ADMIN_PROTECTED',
    })
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })

  it('deactivateAdminUser pozwala gdy są 2 aktywnych adminów', async () => {
    const admin = makeAdminUser({ isActive: true })
    const updated = makeAdminUser({ isActive: false })
    mockUserFindUnique.mockResolvedValue(admin)
    mockUserCount.mockResolvedValue(1) // jest jeszcze 1
    mockUserUpdate.mockResolvedValue(updated)
    mockAuditLogCreate.mockResolvedValue({})

    await expect(deactivateAdminUser('admin-1', 'admin-2')).resolves.toBeDefined()
  })

  it('updateUserRole blokuje gdy jest tylko 1 aktywny admin', async () => {
    const admin = makeAdminUser({ isActive: true })
    mockUserFindUnique.mockResolvedValue(admin)
    mockUserCount.mockResolvedValue(0)

    await expect(
      updateUserRole('admin-1', { role: 'MANAGER' }, 'inny'),
    ).rejects.toMatchObject({ code: 'LAST_ACTIVE_ADMIN_PROTECTED' })
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })

  it('updateUserRole nie blokuje zmiany na ADMIN→ADMIN (ta sama rola)', async () => {
    const admin = makeAdminUser({ isActive: true })
    mockUserFindUnique.mockResolvedValue(admin)
    // findUnique wywoływane ponownie przez getAdminUserById (idempotencja)
    mockUserFindUnique.mockResolvedValue(admin)

    await expect(
      updateUserRole('admin-1', { role: 'ADMIN' }, 'inny'),
    ).resolves.toBeDefined()
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })
})
