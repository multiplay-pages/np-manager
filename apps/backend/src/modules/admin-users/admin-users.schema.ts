import { z } from 'zod'
import type { UserRole, UserAdminActionType } from '@prisma/client'

// ============================================================
// ROLA — wartości zgodne z Prisma enum UserRole
// ============================================================

const userRoleValues = [
  'ADMIN',
  'BOK_CONSULTANT',
  'BACK_OFFICE',
  'MANAGER',
  'SALES',
  'TECHNICAL',
  'LEGAL',
  'AUDITOR',
] as const

// ============================================================
// REQUEST SCHEMAS
// ============================================================

/**
 * Query params dla GET /api/admin/users
 * Wspiera filtrowanie po roli, statusie aktywności i frazie tekstowej.
 */
export const adminUsersListQuerySchema = z.object({
  role: z.enum(userRoleValues).optional(),
  isActive: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  query: z.string().max(200, 'Fraza wyszukiwania nie może przekraczać 200 znaków').trim().optional(),
})

export type AdminUsersListQuery = z.infer<typeof adminUsersListQuerySchema>

/**
 * Body dla POST /api/admin/users — tworzenie konta przez admina.
 * Używa temporaryPassword (nie password) — semantycznie jasny kontrakt.
 */
export const createAdminUserBodySchema = z.object({
  email: z
    .string({ required_error: 'Adres e-mail jest wymagany' })
    .email('Nieprawidłowy format adresu e-mail')
    .max(200, 'Adres e-mail nie może przekraczać 200 znaków')
    .toLowerCase()
    .trim(),
  firstName: z
    .string({ required_error: 'Imię jest wymagane' })
    .min(1, 'Imię jest wymagane')
    .max(100, 'Imię nie może przekraczać 100 znaków')
    .trim(),
  lastName: z
    .string({ required_error: 'Nazwisko jest wymagane' })
    .min(1, 'Nazwisko jest wymagane')
    .max(100, 'Nazwisko nie może przekraczać 100 znaków')
    .trim(),
  role: z.enum(userRoleValues, {
    required_error: 'Rola jest wymagana',
    invalid_type_error: 'Nieprawidłowa rola użytkownika',
  }),
  temporaryPassword: z
    .string({ required_error: 'Hasło tymczasowe jest wymagane' })
    .min(8, 'Hasło musi mieć minimum 8 znaków')
    .max(128, 'Hasło nie może przekraczać 128 znaków'),
})

export type CreateAdminUserBody = z.infer<typeof createAdminUserBodySchema>

/** Body dla PATCH /api/admin/users/:id/role */
export const updateUserRoleBodySchema = z.object({
  role: z.enum(userRoleValues, {
    required_error: 'Rola jest wymagana',
    invalid_type_error: 'Nieprawidłowa rola użytkownika',
  }),
})

export type UpdateUserRoleBody = z.infer<typeof updateUserRoleBodySchema>

/** Body dla POST /api/admin/users/:id/reset-password */
export const resetUserPasswordBodySchema = z.object({
  temporaryPassword: z
    .string({ required_error: 'Hasło tymczasowe jest wymagane' })
    .min(8, 'Hasło musi mieć minimum 8 znaków')
    .max(128, 'Hasło nie może przekraczać 128 znaków'),
})

export type ResetUserPasswordBody = z.infer<typeof resetUserPasswordBodySchema>

// ============================================================
// PRISMA SELECTS
// ============================================================

/** Pola bezpieczne do zwracania w szczegółach użytkownika — BEZ passwordHash */
export const ADMIN_USER_DETAIL_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  forcePasswordChange: true,
  passwordChangedAt: true,
  lastLoginAt: true,
  deactivatedAt: true,
  deactivatedByUserId: true,
  reactivatedAt: true,
  reactivatedByUserId: true,
  createdAt: true,
  updatedAt: true,
} as const

/** Pola bezpieczne dla listy — bez zbędnych metadanych */
export const ADMIN_USER_LIST_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  forcePasswordChange: true,
  lastLoginAt: true,
  createdAt: true,
} as const

// ============================================================
// RESPONSE DTOs
// ============================================================

/** Element listy użytkowników w panelu admina */
export interface AdminUserListItemDto {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  forcePasswordChange: boolean
  lastLoginAt: Date | null
  createdAt: Date
}

/** Szczegóły użytkownika w panelu admina */
export interface AdminUserDetailDto {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  forcePasswordChange: boolean
  passwordChangedAt: Date | null
  lastLoginAt: Date | null
  deactivatedAt: Date | null
  deactivatedByUserId: string | null
  reactivatedAt: Date | null
  reactivatedByUserId: string | null
  createdAt: Date
  updatedAt: Date
}

/** Odpowiedź GET /api/admin/users */
export interface AdminUsersListResponseDto {
  users: AdminUserListItemDto[]
  total: number
}

/** Element historii administracyjnej */
export interface UserAdminAuditLogItemDto {
  id: string
  targetUserId: string
  actorUserId: string
  actionType: UserAdminActionType
  previousStateJson: Record<string, unknown> | null
  nextStateJson: Record<string, unknown> | null
  reason: string | null
  createdAt: Date
}

/** Odpowiedź POST /api/admin/users/:id/reset-password */
export interface ResetPasswordResponseDto {
  targetUserId: string
  forcePasswordChange: boolean
  message: string
}
