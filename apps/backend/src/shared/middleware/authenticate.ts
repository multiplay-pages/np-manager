import type { FastifyRequest, FastifyReply } from 'fastify'
import { AppError } from '../errors/app-error'

/**
 * Fastify preHandler — weryfikacja JWT Bearer token.
 *
 * Oczekiwany nagłówek: Authorization: Bearer <token>
 *
 * Przy sukcesie:
 *   request.user = { id: string, role: string }  ← zdekodowany payload
 *
 * Przy błędzie (brak tokenu, wygasły, nieprawidłowy podpis):
 *   throw AppError.unauthorized() → HTTP 401
 *
 * Użycie w routerze:
 *   app.get('/protected', { preHandler: [authenticate] }, handler)
 *
 * Uwaga: middleware korzysta z request.jwtVerify() udostępnianego przez
 * plugin @fastify/jwt — musi być on zarejestrowany w app przed użyciem
 * tego middleware.
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    // Każdy błąd weryfikacji (brak, wygasły, zły podpis) → 401
    // Nie ujawniamy szczegółów przyczyny.
    throw AppError.unauthorized()
  }
}
