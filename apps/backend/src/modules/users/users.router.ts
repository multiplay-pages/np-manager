import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import { createUserBodySchema } from './users.schema'
import { listUsers, createUser, deactivateUser } from './users.service'

/**
 * Moduł tras zarządzania użytkownikami.
 *
 * Wszystkie endpointy wymagają:
 *   1. authenticate — weryfikacja JWT
 *   2. authorize(['ADMIN']) — wyłącznie administrator
 *
 * Trasy:
 *   GET   /api/users              — lista użytkowników
 *   POST  /api/users              — utworzenie użytkownika
 *   PATCH /api/users/:id/deactivate — dezaktywacja konta
 *
 * Rejestracja w app.ts:
 *   app.register(usersRouter, { prefix: '/api/users' })
 */
export async function usersRouter(app: FastifyInstance): Promise<void> {
  // Wspólne preHandlery dla całego modułu
  const adminOnly = [authenticate, authorize(['ADMIN'])]

  // ============================================================
  // GET /api/users
  // ============================================================

  app.get(
    '/',
    { preHandler: adminOnly },
    async (_request, reply) => {
      const users = await listUsers()

      return reply.status(200).send({
        success: true,
        data: { users },
      })
    },
  )

  // ============================================================
  // POST /api/users
  // ============================================================

  app.post(
    '/',
    { preHandler: adminOnly },
    async (request, reply) => {
      const body = createUserBodySchema.parse(request.body)

      const user = await createUser(
        body,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(201).send({
        success: true,
        data: { user },
      })
    },
  )

  // ============================================================
  // PATCH /api/users/:id/deactivate
  // ============================================================

  app.patch<{ Params: { id: string } }>(
    '/:id/deactivate',
    { preHandler: adminOnly },
    async (request, reply) => {
      const user = await deactivateUser(
        request.params.id,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({
        success: true,
        data: { user },
      })
    },
  )
}
