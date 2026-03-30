import { z } from 'zod'

// ============================================================
// REQUEST SCHEMAS
// ============================================================

/**
 * Schemat walidacji body dla POST /api/auth/login.
 * Minimalne walidacje formatu — nie ujawniamy tu logiki biznesowej.
 */
export const loginBodySchema = z.object({
  email: z
    .string({ required_error: 'Adres e-mail jest wymagany' })
    .email('Nieprawidłowy format adresu e-mail')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Hasło jest wymagane' })
    .min(1, 'Hasło jest wymagane'),
})

export type LoginBody = z.infer<typeof loginBodySchema>

// ============================================================
// RESPONSE TYPES
// ============================================================

/** Dane użytkownika zwracane w odpowiedziach auth — BEZ passwordHash */
export interface AuthUserDto {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

/** Odpowiedź POST /api/auth/login */
export interface LoginResponseDto {
  token: string
  user: AuthUserDto
}

// ============================================================
// JWT PAYLOAD
// ============================================================

/**
 * Payload wpisywany do tokenu JWT.
 * Zawiera wyłącznie dane potrzebne do autoryzacji requestów.
 * NIE zawiera: email, imię, adresu, danych wrażliwych.
 */
export interface JwtTokenPayload {
  id: string
  role: string
}
