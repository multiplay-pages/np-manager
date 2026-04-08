import bcrypt from 'bcrypt'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import type {
  AdminUsersListQuery,
  CreateAdminUserBody,
  UpdateUserRoleBody,
  ResetUserPasswordBody,
  AdminUserListItemDto,
  AdminUserDetailDto,
  AdminUsersListResponseDto,
  UserAdminAuditLogItemDto,
  ResetPasswordResponseDto,
} from './admin-users.schema'
import { ADMIN_USER_DETAIL_SELECT, ADMIN_USER_LIST_SELECT } from './admin-users.schema'

const BCRYPT_ROUNDS = 12

// ============================================================
// HELPERS — ochrona ostatniego aktywnego ADMIN-a
// ============================================================

/**
 * Liczy aktywnych adminów z opcjonalnym wykluczeniem jednego ID.
 * Używane do ochrony przed zablokowaniem systemu przez usunięcie wszystkich adminów.
 */
async function countActiveAdmins(excludeUserId?: string): Promise<number> {
  return prisma.user.count({
    where: {
      role: 'ADMIN',
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  })
}

/**
 * Rzuca błąd jeśli podany użytkownik jest ostatnim aktywnym adminem
 * i operacja skutkowałaby utratą dostępu do systemu.
 */
async function assertNotLastActiveAdmin(userId: string, message: string): Promise<void> {
  const otherActiveAdmins = await countActiveAdmins(userId)
  if (otherActiveAdmins === 0) {
    throw AppError.conflict(message, 'LAST_ACTIVE_ADMIN_PROTECTED')
  }
}

// ============================================================
// LIST USERS
// ============================================================

/**
 * Zwraca paginowaną listę użytkowników z możliwością filtrowania.
 *
 * Filtry:
 * - role     — filtr po roli
 * - isActive — aktywne lub nieaktywne konta
 * - query    — wyszukiwanie po e-mailu, imieniu lub nazwisku (case-insensitive)
 *
 * Sortowanie: aktywni pierwsi, potem alfabetycznie po nazwisku i imieniu.
 */
export async function listAdminUsers(
  query: AdminUsersListQuery,
): Promise<AdminUsersListResponseDto> {
  const where: Prisma.UserWhereInput = {}

  if (query.role !== undefined) {
    where.role = query.role
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive
  }

  if (query.query) {
    const q = query.query
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: ADMIN_USER_LIST_SELECT,
      orderBy: [{ isActive: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    }),
    prisma.user.count({ where }),
  ])

  return { users: users as AdminUserListItemDto[], total }
}

// ============================================================
// GET USER DETAIL
// ============================================================

/**
 * Zwraca pełne dane użytkownika dla panelu admina.
 * Nie zawiera passwordHash — select jawnie wyklucza wrażliwe pola.
 */
export async function getAdminUserById(userId: string): Promise<AdminUserDetailDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: ADMIN_USER_DETAIL_SELECT,
  })

  if (!user) {
    throw AppError.notFound('Użytkownik nie został znaleziony.', 'USER_NOT_FOUND')
  }

  return user as AdminUserDetailDto
}

// ============================================================
// CREATE USER
// ============================================================

/**
 * Tworzy nowe konto użytkownika przez admina.
 *
 * Nowe konto zawsze dostaje:
 * - isActive = true
 * - forcePasswordChange = true (wymuszenie zmiany hasła przy 1. logowaniu)
 *
 * Zapisuje zdarzenie USER_CREATED w audit logu.
 */
export async function createAdminUser(
  body: CreateAdminUserBody,
  actorUserId: string,
): Promise<AdminUserDetailDto> {
  const existing = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true },
  })

  if (existing) {
    throw AppError.conflict(
      'Użytkownik o podanym adresie e-mail już istnieje.',
      'EMAIL_ALREADY_EXISTS',
    )
  }

  const passwordHash = await bcrypt.hash(body.temporaryPassword, BCRYPT_ROUNDS)

  const user = await prisma.user.create({
    data: {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role,
      passwordHash,
      isActive: true,
      forcePasswordChange: true,
    },
    select: ADMIN_USER_DETAIL_SELECT,
  })

  await prisma.userAdminAuditLog.create({
    data: {
      targetUserId: user.id,
      actorUserId,
      actionType: 'USER_CREATED',
      nextStateJson: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        forcePasswordChange: user.forcePasswordChange,
      },
    },
  })

  return user as AdminUserDetailDto
}

// ============================================================
// UPDATE ROLE
// ============================================================

/**
 * Zmienia rolę użytkownika.
 *
 * Blokuje zmianę roli ostatniego aktywnego ADMIN-a na inną —
 * chroni przed zablokowaniem dostępu do systemu.
 *
 * Zapisuje zdarzenie USER_ROLE_CHANGED w audit logu.
 */
export async function updateUserRole(
  userId: string,
  body: UpdateUserRoleBody,
  actorUserId: string,
): Promise<AdminUserDetailDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  })

  if (!user) {
    throw AppError.notFound('Użytkownik nie został znaleziony.', 'USER_NOT_FOUND')
  }

  // Idempotencja — rola się nie zmieniła
  if (user.role === body.role) {
    return getAdminUserById(userId)
  }

  // Ochrona ostatniego aktywnego admina
  if (user.role === 'ADMIN' && body.role !== 'ADMIN' && user.isActive) {
    await assertNotLastActiveAdmin(
      userId,
      'Nie można zmienić roli ostatniego aktywnego administratora systemu.',
    )
  }

  const previousRole = user.role

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: body.role },
    select: ADMIN_USER_DETAIL_SELECT,
  })

  await prisma.userAdminAuditLog.create({
    data: {
      targetUserId: userId,
      actorUserId,
      actionType: 'USER_ROLE_CHANGED',
      previousStateJson: { role: previousRole },
      nextStateJson: { role: body.role },
    },
  })

  return updatedUser as AdminUserDetailDto
}

// ============================================================
// DEACTIVATE USER
// ============================================================

/**
 * Dezaktywuje konto użytkownika (soft delete — isActive = false).
 *
 * Blokuje:
 * - dezaktywację własnego konta
 * - dezaktywację ostatniego aktywnego ADMIN-a
 *
 * Zapisuje zdarzenie USER_DEACTIVATED w audit logu.
 */
export async function deactivateAdminUser(
  userId: string,
  actorUserId: string,
): Promise<AdminUserDetailDto> {
  if (userId === actorUserId) {
    throw AppError.badRequest(
      'Nie można dezaktywować własnego konta.',
      'CANNOT_DEACTIVATE_SELF',
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  })

  if (!user) {
    throw AppError.notFound('Użytkownik nie został znaleziony.', 'USER_NOT_FOUND')
  }

  if (!user.isActive) {
    throw AppError.conflict(
      'Konto użytkownika jest już dezaktywowane.',
      'ALREADY_DEACTIVATED',
    )
  }

  // Ochrona ostatniego aktywnego admina
  if (user.role === 'ADMIN') {
    await assertNotLastActiveAdmin(
      userId,
      'Nie można dezaktywować ostatniego aktywnego administratora systemu.',
    )
  }

  const now = new Date()

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      deactivatedAt: now,
      deactivatedByUserId: actorUserId,
    },
    select: ADMIN_USER_DETAIL_SELECT,
  })

  await prisma.userAdminAuditLog.create({
    data: {
      targetUserId: userId,
      actorUserId,
      actionType: 'USER_DEACTIVATED',
      previousStateJson: { isActive: true },
      nextStateJson: { isActive: false, deactivatedAt: now.toISOString() },
    },
  })

  return updatedUser as AdminUserDetailDto
}

// ============================================================
// REACTIVATE USER
// ============================================================

/**
 * Reaktywuje konto użytkownika (przywraca isActive = true).
 * Zapisuje zdarzenie USER_REACTIVATED w audit logu.
 */
export async function reactivateAdminUser(
  userId: string,
  actorUserId: string,
): Promise<AdminUserDetailDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
  })

  if (!user) {
    throw AppError.notFound('Użytkownik nie został znaleziony.', 'USER_NOT_FOUND')
  }

  if (user.isActive) {
    throw AppError.conflict(
      'Konto użytkownika jest już aktywne.',
      'ALREADY_ACTIVE',
    )
  }

  const now = new Date()

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: true,
      reactivatedAt: now,
      reactivatedByUserId: actorUserId,
    },
    select: ADMIN_USER_DETAIL_SELECT,
  })

  await prisma.userAdminAuditLog.create({
    data: {
      targetUserId: userId,
      actorUserId,
      actionType: 'USER_REACTIVATED',
      previousStateJson: { isActive: false },
      nextStateJson: { isActive: true, reactivatedAt: now.toISOString() },
    },
  })

  return updatedUser as AdminUserDetailDto
}

// ============================================================
// RESET PASSWORD
// ============================================================

/**
 * Admin ustawia użytkownikowi hasło tymczasowe.
 *
 * Po resecie:
 * - passwordHash jest zaktualizowany
 * - forcePasswordChange = true (wymuszenie zmiany przy następnym logowaniu)
 * - passwordChangedAt = teraz
 *
 * Audit log NIE zawiera hasła ani jego hashu — tylko metadane operacji.
 */
export async function resetUserPassword(
  userId: string,
  body: ResetUserPasswordBody,
  actorUserId: string,
): Promise<ResetPasswordResponseDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
  })

  if (!user) {
    throw AppError.notFound('Użytkownik nie został znaleziony.', 'USER_NOT_FOUND')
  }

  const passwordHash = await bcrypt.hash(body.temporaryPassword, BCRYPT_ROUNDS)
  const now = new Date()

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      forcePasswordChange: true,
      passwordChangedAt: now,
    },
  })

  // Audit log — brak hasła, brak hasha, tylko metadane
  await prisma.userAdminAuditLog.create({
    data: {
      targetUserId: userId,
      actorUserId,
      actionType: 'USER_PASSWORD_RESET',
      nextStateJson: {
        forcePasswordChange: true,
        passwordResetAt: now.toISOString(),
      },
    },
  })

  return {
    targetUserId: userId,
    forcePasswordChange: true,
    message:
      'Hasło zostało zresetowane. Użytkownik będzie musiał zmienić hasło przy następnym logowaniu.',
  }
}

// ============================================================
// GET AUDIT LOG
// ============================================================

/**
 * Zwraca historię administracyjnych działań dla danego użytkownika.
 * Posortowana malejąco po dacie — najnowsze zdarzenia pierwsze.
 */
export async function getUserAdminAuditLog(
  userId: string,
): Promise<UserAdminAuditLogItemDto[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })

  if (!user) {
    throw AppError.notFound('Użytkownik nie został znaleziony.', 'USER_NOT_FOUND')
  }

  const logs = await prisma.userAdminAuditLog.findMany({
    where: { targetUserId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      targetUserId: true,
      actorUserId: true,
      actionType: true,
      previousStateJson: true,
      nextStateJson: true,
      reason: true,
      createdAt: true,
    },
  })

  return logs.map((log) => ({
    ...log,
    previousStateJson: (log.previousStateJson ?? null) as Record<string, unknown> | null,
    nextStateJson: (log.nextStateJson ?? null) as Record<string, unknown> | null,
  }))
}
