import { z } from 'zod'
import type { UserRole } from '@prisma/client'

// ============================================================
// REQUEST SCHEMAS
// ============================================================

/** Dozwolone wartości ról — muszą odpowiadać Prisma enum UserRole */
const userRoleValues = [
  'ADMIN',
  'BOK_CONSULTANT',
  'BACK_OFFICE',
  'MANAGER',
  'TECHNICAL',
  'LEGAL',
  'AUDITOR',
] as const

/**
 * Schemat walidacji body dla POST /api/users.
 *
 * Hasło tymczasowe — administrator podaje hasło startowe,
 * użytkownik powinien je zmienić przy pierwszym logowaniu
 * (mechanizm wymuszenia zmiany hasła — przyszły sprint).
 */
export const createUserBodySchema = z.object({
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
  password: z
    .string({ required_error: 'Hasło tymczasowe jest wymagane' })
    .min(8, 'Hasło musi mieć minimum 8 znaków')
    .max(128, 'Hasło nie może przekraczać 128 znaków'),
})

export type CreateUserBody = z.infer<typeof createUserBodySchema>

// ============================================================
// RESPONSE TYPES
// ============================================================

/** Bezpieczny DTO użytkownika — BEZ passwordHash */
export interface UserDto {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  forcePasswordChange: boolean
  createdAt: Date
}

/** Pola wybierane z bazy — do reużycia w Prisma select */
export const USER_SAFE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  forcePasswordChange: true,
  createdAt: true,
} as const
