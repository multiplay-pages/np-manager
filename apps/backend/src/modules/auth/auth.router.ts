import type { FastifyInstance } from 'fastify'
import { loginBodySchema, changePasswordBodySchema } from './auth.schema'
import { login, getMe, changePassword } from './auth.service'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'

/**
 * Moduł tras autoryzacji.
 *
 * Trasy:
 *   POST /api/auth/login       — logowanie (publiczne)
 *   GET  /api/auth/me          — dane zalogowanego użytkownika (wymaga JWT)
 *   PATCH /api/auth/change-password — zmiana własnego hasła (wymaga JWT)
 *   GET  /api/auth/admin-only  — endpoint testowy (wymaga ADMIN)
 *
 * Rejestracja w app.ts:
 *   app.register(authRouter, { prefix: '/api/auth' })
 */
export async function authRouter(app: FastifyInstance): Promise<void> {
  // ============================================================
  // POST /api/auth/login
  // ============================================================

  /**
   * Logowanie — zwraca token JWT i dane użytkownika.
   *
   * Body: { email: string, password: string }
   *
   * Odpowiedź 200: { token: string, user: AuthUserDto }
   * Odpowiedź 400: błędny format body (Zod)
   * Odpowiedź 401: nieprawidłowe dane logowania
   */
  app.post('/login', async (request, reply) => {
    // Walidacja Zod — rzuca ZodError obsługiwany przez globalny errorHandler → 400
    const body = loginBodySchema.parse(request.body)

    // IP i User-Agent do audytu
    const ipAddress = request.ip
    const userAgent = request.headers['user-agent']

    // Wstrzyknięcie signToken — izolacja serwisu od frameworka
    const result = await login(body, (payload) => app.jwt.sign(payload), ipAddress, userAgent)

    return reply.status(200).send({
      success: true,
      data: result,
    })
  })

  // ============================================================
  // GET /api/auth/me
  // ============================================================

  /**
   * Zwraca dane aktualnie zalogowanego użytkownika.
   *
   * Wymaga: nagłówek Authorization: Bearer <token>
   *
   * Odpowiedź 200: { user: AuthUserDto }
   * Odpowiedź 401: brak/wygasły/nieprawidłowy token, konto dezaktywowane
   */
  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    // request.user jest typowany przez jwt.d.ts (id + role)
    const user = await getMe(request.user.id)

    return reply.status(200).send({
      success: true,
      data: { user },
    })
  })

  // ============================================================
  // PATCH /api/auth/change-password
  // ============================================================

  /**
   * Zmiana własnego hasła przez zalogowanego użytkownika.
   *
   * Body: { currentPassword: string, newPassword: string }
   *
   * Odpowiedź 200: { message: string }
   * Odpowiedź 400: błędne obecne hasło / niedozwolone nowe hasło / validation error
   * Odpowiedź 401: brak lub nieprawidłowa sesja
   */
  app.patch('/change-password', { preHandler: [authenticate] }, async (request, reply) => {
    const body = changePasswordBodySchema.parse(request.body)
    const result = await changePassword(
      request.user.id,
      body,
      request.ip,
      request.headers['user-agent'],
    )

    return reply.status(200).send({
      success: true,
      data: result,
    })
  })

  // ============================================================
  // GET /api/auth/admin-only  (endpoint testowy)
  // ============================================================

  /**
   * Testowy endpoint dostępny wyłącznie dla roli ADMIN.
   * Służy do weryfikacji działania middleware authorize.
   */
  app.get(
    '/admin-only',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      return reply.status(200).send({
        success: true,
        data: {
          message: 'Masz dostęp administratora.',
          userId: request.user.id,
          role: request.user.role,
        },
      })
    },
  )
}
