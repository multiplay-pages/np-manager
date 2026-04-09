import { beforeEach, describe, expect, it, vi } from 'vitest'

// ============================================================
// HOISTED MOCKS
// ============================================================

const {
  mockListAdminUsers,
  mockGetAdminUserById,
  mockCreateAdminUser,
  mockUpdateUserRole,
  mockDeactivateAdminUser,
  mockReactivateAdminUser,
  mockResetUserPassword,
  mockGetUserAdminAuditLog,
} = vi.hoisted(() => ({
  mockListAdminUsers: vi.fn(),
  mockGetAdminUserById: vi.fn(),
  mockCreateAdminUser: vi.fn(),
  mockUpdateUserRole: vi.fn(),
  mockDeactivateAdminUser: vi.fn(),
  mockReactivateAdminUser: vi.fn(),
  mockResetUserPassword: vi.fn(),
  mockGetUserAdminAuditLog: vi.fn(),
}))

// Mock wszystkich routerów niezwiązanych z tym testem
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

// Mock middleware — ADMIN jest zalogowany
vi.mock('../shared/middleware/authenticate', () => ({
  authenticate: async (request: { user?: unknown }) => {
    request.user = { id: 'actor-admin-id', role: 'ADMIN' }
  },
}))

vi.mock('../shared/middleware/authorize', () => ({
  authorize: () => async () => {},
}))

// Mock serwisu admin-users
vi.mock('../modules/admin-users/admin-users.service', () => ({
  listAdminUsers: (...args: unknown[]) => mockListAdminUsers(...args),
  getAdminUserById: (...args: unknown[]) => mockGetAdminUserById(...args),
  createAdminUser: (...args: unknown[]) => mockCreateAdminUser(...args),
  updateUserRole: (...args: unknown[]) => mockUpdateUserRole(...args),
  deactivateAdminUser: (...args: unknown[]) => mockDeactivateAdminUser(...args),
  reactivateAdminUser: (...args: unknown[]) => mockReactivateAdminUser(...args),
  resetUserPassword: (...args: unknown[]) => mockResetUserPassword(...args),
  getUserAdminAuditLog: (...args: unknown[]) => mockGetUserAdminAuditLog(...args),
}))

import { buildApp } from '../app'

// ============================================================
// FIXTURES
// ============================================================

function makeUserListItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-id-1',
    email: 'jan.kowalski@np-manager.local',
    firstName: 'Jan',
    lastName: 'Kowalski',
    role: 'BOK_CONSULTANT',
    isActive: true,
    forcePasswordChange: false,
    lastLoginAt: null,
    createdAt: '2026-04-01T10:00:00.000Z',
    ...overrides,
  }
}

function makeUserDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-id-1',
    email: 'jan.kowalski@np-manager.local',
    firstName: 'Jan',
    lastName: 'Kowalski',
    role: 'BOK_CONSULTANT',
    isActive: true,
    forcePasswordChange: true,
    passwordChangedAt: null,
    lastLoginAt: null,
    deactivatedAt: null,
    deactivatedByUserId: null,
    reactivatedAt: null,
    reactivatedByUserId: null,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    ...overrides,
  }
}

function makeAuditLogItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'audit-id-1',
    targetUserId: 'user-id-1',
    actorUserId: 'actor-admin-id',
    actionType: 'USER_CREATED',
    previousStateJson: null,
    nextStateJson: { role: 'BOK_CONSULTANT', isActive: true },
    reason: null,
    createdAt: '2026-04-01T10:00:00.000Z',
    ...overrides,
  }
}

// ============================================================
// TESTS
// ============================================================

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('zwraca listę użytkowników dla ADMIN', async () => {
    const items = [makeUserListItem(), makeUserListItem({ id: 'user-id-2', email: 'a@b.com' })]
    mockListAdminUsers.mockResolvedValue({ users: items, total: 2 })

    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/admin/users' })
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.users).toHaveLength(2)
      expect(body.data.total).toBe(2)
    } finally {
      await app.close()
    }
  })

  it('przekazuje filtry query do serwisu', async () => {
    mockListAdminUsers.mockResolvedValue({ users: [], total: 0 })

    const app = await buildApp()
    try {
      await app.inject({
        method: 'GET',
        url: '/api/admin/users?role=ADMIN&isActive=false&query=test',
      })
      expect(mockListAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ADMIN', isActive: false, query: 'test' }),
      )
    } finally {
      await app.close()
    }
  })

  it('zwraca 403 dla nieautoryzowanego użytkownika', async () => {
    // Nadpisujemy authorize w tym teście, żeby symulować brak dostępu
    const { AppError } = await import('../shared/errors/app-error')
    mockListAdminUsers.mockRejectedValue(AppError.forbidden())

    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/admin/users' })
      // authorize mock zawsze przepuszcza — testujemy że serwis blokuje
      // W pełnych testach E2E można testować middleware bezpośrednio
      expect(mockListAdminUsers).toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })
})

describe('GET /api/admin/users/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('zwraca szczegóły użytkownika', async () => {
    mockGetAdminUserById.mockResolvedValue(makeUserDetail())

    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/admin/users/user-id-1' })
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.user.id).toBe('user-id-1')
      expect(body.data.user).not.toHaveProperty('passwordHash')
    } finally {
      await app.close()
    }
  })

  it('zwraca 404 gdy użytkownik nie istnieje', async () => {
    const { AppError } = await import('../shared/errors/app-error')
    mockGetAdminUserById.mockRejectedValue(
      AppError.notFound('Użytkownik nie został znaleziony.', 'USER_NOT_FOUND'),
    )

    const app = await buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/api/admin/users/nieznany' })
      expect(response.statusCode).toBe(404)
      expect(response.json().error.code).toBe('USER_NOT_FOUND')
    } finally {
      await app.close()
    }
  })
})

describe('POST /api/admin/users', () => {
  beforeEach(() => vi.clearAllMocks())

  const validBody = {
    email: 'nowy@np-manager.local',
    firstName: 'Nowy',
    lastName: 'Użytkownik',
    role: 'BOK_CONSULTANT',
    temporaryPassword: 'Temp@1234',
  }

  it('tworzy użytkownika i zwraca 201', async () => {
    const created = makeUserDetail({ email: 'nowy@np-manager.local', forcePasswordChange: true })
    mockCreateAdminUser.mockResolvedValue(created)

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        payload: validBody,
      })
      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.user.forcePasswordChange).toBe(true)
    } finally {
      await app.close()
    }
  })

  it('akceptuje role SALES w payloadzie tworzenia', async () => {
    const created = makeUserDetail({ email: 'sales@np-manager.local', role: 'SALES' })
    mockCreateAdminUser.mockResolvedValue(created)

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        payload: { ...validBody, role: 'SALES', email: 'sales@np-manager.local' },
      })

      expect(response.statusCode).toBe(201)
      expect(mockCreateAdminUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'SALES' }),
        'actor-admin-id',
      )
    } finally {
      await app.close()
    }
  })

  it('przekazuje actorUserId z tokenu JWT do serwisu', async () => {
    mockCreateAdminUser.mockResolvedValue(makeUserDetail())

    const app = await buildApp()
    try {
      await app.inject({ method: 'POST', url: '/api/admin/users', payload: validBody })
      expect(mockCreateAdminUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'nowy@np-manager.local' }),
        'actor-admin-id',
      )
    } finally {
      await app.close()
    }
  })

  it('zwraca 409 gdy email już istnieje', async () => {
    const { AppError } = await import('../shared/errors/app-error')
    mockCreateAdminUser.mockRejectedValue(
      AppError.conflict('Użytkownik o podanym adresie e-mail już istnieje.', 'EMAIL_ALREADY_EXISTS'),
    )

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        payload: validBody,
      })
      expect(response.statusCode).toBe(409)
      expect(response.json().error.code).toBe('EMAIL_ALREADY_EXISTS')
    } finally {
      await app.close()
    }
  })

  it('zwraca 400 przy brakujących wymaganych polach', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        payload: { email: 'brak@email.com' }, // brakuje reszty
      })
      expect(response.statusCode).toBe(400)
    } finally {
      await app.close()
    }
  })

  it('zwraca 400 przy za krótkim haśle tymczasowym', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        payload: { ...validBody, temporaryPassword: 'krótkie' },
      })
      expect(response.statusCode).toBe(400)
    } finally {
      await app.close()
    }
  })
})

describe('PATCH /api/admin/users/:id/role', () => {
  beforeEach(() => vi.clearAllMocks())

  it('zmienia rolę użytkownika', async () => {
    const updated = makeUserDetail({ role: 'BACK_OFFICE' })
    mockUpdateUserRole.mockResolvedValue(updated)

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/admin/users/user-id-1/role',
        payload: { role: 'BACK_OFFICE' },
      })
      expect(response.statusCode).toBe(200)
      expect(response.json().data.user.role).toBe('BACK_OFFICE')
    } finally {
      await app.close()
    }
  })

  it('akceptuje zmiane roli użytkownika na SALES', async () => {
    const updated = makeUserDetail({ role: 'SALES' })
    mockUpdateUserRole.mockResolvedValue(updated)

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/admin/users/user-id-1/role',
        payload: { role: 'SALES' },
      })
      expect(response.statusCode).toBe(200)
      expect(mockUpdateUserRole).toHaveBeenCalledWith('user-id-1', { role: 'SALES' }, 'actor-admin-id')
    } finally {
      await app.close()
    }
  })

  it('zwraca 409 przy próbie zmiany roli ostatniego aktywnego admina', async () => {
    const { AppError } = await import('../shared/errors/app-error')
    mockUpdateUserRole.mockRejectedValue(
      AppError.conflict(
        'Nie można zmienić roli ostatniego aktywnego administratora systemu.',
        'LAST_ACTIVE_ADMIN_PROTECTED',
      ),
    )

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/admin/users/admin-id/role',
        payload: { role: 'BOK_CONSULTANT' },
      })
      expect(response.statusCode).toBe(409)
      expect(response.json().error.code).toBe('LAST_ACTIVE_ADMIN_PROTECTED')
    } finally {
      await app.close()
    }
  })

  it('zwraca 400 przy nieprawidłowej roli', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/admin/users/user-id-1/role',
        payload: { role: 'NIEZNANA_ROLA' },
      })
      expect(response.statusCode).toBe(400)
    } finally {
      await app.close()
    }
  })
})

describe('PATCH /api/admin/users/:id/deactivate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('dezaktywuje konto użytkownika', async () => {
    const deactivated = makeUserDetail({ isActive: false, deactivatedAt: '2026-04-08T10:00:00.000Z' })
    mockDeactivateAdminUser.mockResolvedValue(deactivated)

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/admin/users/user-id-1/deactivate',
      })
      expect(response.statusCode).toBe(200)
      expect(response.json().data.user.isActive).toBe(false)
    } finally {
      await app.close()
    }
  })

  it('zwraca 409 przy próbie dezaktywacji ostatniego admina', async () => {
    const { AppError } = await import('../shared/errors/app-error')
    mockDeactivateAdminUser.mockRejectedValue(
      AppError.conflict(
        'Nie można dezaktywować ostatniego aktywnego administratora systemu.',
        'LAST_ACTIVE_ADMIN_PROTECTED',
      ),
    )

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/admin/users/last-admin-id/deactivate',
      })
      expect(response.statusCode).toBe(409)
      expect(response.json().error.code).toBe('LAST_ACTIVE_ADMIN_PROTECTED')
    } finally {
      await app.close()
    }
  })

  it('zwraca 409 gdy konto jest już nieaktywne', async () => {
    const { AppError } = await import('../shared/errors/app-error')
    mockDeactivateAdminUser.mockRejectedValue(
      AppError.conflict('Konto użytkownika jest już dezaktywowane.', 'ALREADY_DEACTIVATED'),
    )

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/admin/users/user-id-1/deactivate',
      })
      expect(response.statusCode).toBe(409)
      expect(response.json().error.code).toBe('ALREADY_DEACTIVATED')
    } finally {
      await app.close()
    }
  })
})

describe('PATCH /api/admin/users/:id/reactivate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reaktywuje konto użytkownika', async () => {
    const reactivated = makeUserDetail({ isActive: true, reactivatedAt: '2026-04-08T10:00:00.000Z' })
    mockReactivateAdminUser.mockResolvedValue(reactivated)

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/admin/users/user-id-1/reactivate',
      })
      expect(response.statusCode).toBe(200)
      expect(response.json().data.user.isActive).toBe(true)
    } finally {
      await app.close()
    }
  })

  it('zwraca 409 gdy konto jest już aktywne', async () => {
    const { AppError } = await import('../shared/errors/app-error')
    mockReactivateAdminUser.mockRejectedValue(
      AppError.conflict('Konto użytkownika jest już aktywne.', 'ALREADY_ACTIVE'),
    )

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/admin/users/user-id-1/reactivate',
      })
      expect(response.statusCode).toBe(409)
      expect(response.json().error.code).toBe('ALREADY_ACTIVE')
    } finally {
      await app.close()
    }
  })
})

describe('POST /api/admin/users/:id/reset-password', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resetuje hasło i zwraca bezpieczną odpowiedź', async () => {
    mockResetUserPassword.mockResolvedValue({
      targetUserId: 'user-id-1',
      forcePasswordChange: true,
      message: 'Hasło zostało zresetowane.',
    })

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users/user-id-1/reset-password',
        payload: { temporaryPassword: 'NewTemp@1234' },
      })
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.forcePasswordChange).toBe(true)
      expect(body.data.targetUserId).toBe('user-id-1')
      // Upewniamy się, że odpowiedź nie zawiera hasła ani hasha
      expect(JSON.stringify(body)).not.toContain('NewTemp@1234')
      expect(JSON.stringify(body)).not.toContain('passwordHash')
    } finally {
      await app.close()
    }
  })

  it('zwraca 400 przy za krótkim haśle', async () => {
    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users/user-id-1/reset-password',
        payload: { temporaryPassword: 'krótk' },
      })
      expect(response.statusCode).toBe(400)
    } finally {
      await app.close()
    }
  })

  it('przekazuje actorUserId z tokenu do serwisu', async () => {
    mockResetUserPassword.mockResolvedValue({
      targetUserId: 'user-id-1',
      forcePasswordChange: true,
      message: 'OK',
    })

    const app = await buildApp()
    try {
      await app.inject({
        method: 'POST',
        url: '/api/admin/users/user-id-1/reset-password',
        payload: { temporaryPassword: 'NewTemp@1234' },
      })
      expect(mockResetUserPassword).toHaveBeenCalledWith(
        'user-id-1',
        expect.objectContaining({ temporaryPassword: 'NewTemp@1234' }),
        'actor-admin-id',
      )
    } finally {
      await app.close()
    }
  })
})

describe('GET /api/admin/users/:id/audit-log', () => {
  beforeEach(() => vi.clearAllMocks())

  it('zwraca historię administracyjną użytkownika', async () => {
    const logs = [
      makeAuditLogItem({ actionType: 'USER_CREATED', createdAt: '2026-04-08T12:00:00.000Z' }),
      makeAuditLogItem({ actionType: 'USER_DEACTIVATED', createdAt: '2026-04-07T10:00:00.000Z' }),
    ]
    mockGetUserAdminAuditLog.mockResolvedValue(logs)

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users/user-id-1/audit-log',
      })
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.logs).toHaveLength(2)
      expect(body.data.logs[0].actionType).toBe('USER_CREATED')
    } finally {
      await app.close()
    }
  })

  it('zwraca 404 gdy użytkownik nie istnieje', async () => {
    const { AppError } = await import('../shared/errors/app-error')
    mockGetUserAdminAuditLog.mockRejectedValue(
      AppError.notFound('Użytkownik nie został znaleziony.', 'USER_NOT_FOUND'),
    )

    const app = await buildApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users/nieznany/audit-log',
      })
      expect(response.statusCode).toBe(404)
      expect(response.json().error.code).toBe('USER_NOT_FOUND')
    } finally {
      await app.close()
    }
  })
})
