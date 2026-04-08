import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import {
  adminUsersListQuerySchema,
  createAdminUserBodySchema,
  updateUserRoleBodySchema,
  resetUserPasswordBodySchema,
} from './admin-users.schema'
import {
  listAdminUsers,
  getAdminUserById,
  createAdminUser,
  updateUserRole,
  deactivateAdminUser,
  reactivateAdminUser,
  resetUserPassword,
  getUserAdminAuditLog,
} from './admin-users.service'

/**
 * Moduł tras administracji użytkownikami.
 *
 * Wszystkie endpointy wymagają roli ADMIN.
 * Rejestracja w app.ts: app.register(adminUsersRouter, { prefix: '/api/admin' })
 *
 * Trasy:
 *   GET   /api/admin/users                        — lista użytkowników z filtrami
 *   GET   /api/admin/users/:id                    — szczegóły użytkownika
 *   POST  /api/admin/users                        — tworzenie użytkownika
 *   PATCH /api/admin/users/:id/role               — zmiana roli
 *   PATCH /api/admin/users/:id/deactivate         — dezaktywacja konta
 *   PATCH /api/admin/users/:id/reactivate         — reaktywacja konta
 *   POST  /api/admin/users/:id/reset-password     — reset hasła przez admina
 *   GET   /api/admin/users/:id/audit-log          — historia administracyjna użytkownika
 */
export async function adminUsersRouter(app: FastifyInstance): Promise<void> {
  const adminOnly = [authenticate, authorize(['ADMIN'])]

  // ============================================================
  // GET /api/admin/users
  // ============================================================

  app.get(
    '/users',
    { preHandler: adminOnly },
    async (request, reply) => {
      const query = adminUsersListQuerySchema.parse(request.query)
      const result = await listAdminUsers(query)

      return reply.status(200).send({
        success: true,
        data: result,
      })
    },
  )

  // ============================================================
  // GET /api/admin/users/:id
  // ============================================================

  app.get<{ Params: { id: string } }>(
    '/users/:id',
    { preHandler: adminOnly },
    async (request, reply) => {
      const user = await getAdminUserById(request.params.id)

      return reply.status(200).send({
        success: true,
        data: { user },
      })
    },
  )

  // ============================================================
  // POST /api/admin/users
  // ============================================================

  app.post(
    '/users',
    { preHandler: adminOnly },
    async (request, reply) => {
      const body = createAdminUserBodySchema.parse(request.body)
      const user = await createAdminUser(body, request.user.id)

      return reply.status(201).send({
        success: true,
        data: { user },
      })
    },
  )

  // ============================================================
  // PATCH /api/admin/users/:id/role
  // ============================================================

  app.patch<{ Params: { id: string } }>(
    '/users/:id/role',
    { preHandler: adminOnly },
    async (request, reply) => {
      const body = updateUserRoleBodySchema.parse(request.body)
      const user = await updateUserRole(request.params.id, body, request.user.id)

      return reply.status(200).send({
        success: true,
        data: { user },
      })
    },
  )

  // ============================================================
  // PATCH /api/admin/users/:id/deactivate
  // ============================================================

  app.patch<{ Params: { id: string } }>(
    '/users/:id/deactivate',
    { preHandler: adminOnly },
    async (request, reply) => {
      const user = await deactivateAdminUser(request.params.id, request.user.id)

      return reply.status(200).send({
        success: true,
        data: { user },
      })
    },
  )

  // ============================================================
  // PATCH /api/admin/users/:id/reactivate
  // ============================================================

  app.patch<{ Params: { id: string } }>(
    '/users/:id/reactivate',
    { preHandler: adminOnly },
    async (request, reply) => {
      const user = await reactivateAdminUser(request.params.id, request.user.id)

      return reply.status(200).send({
        success: true,
        data: { user },
      })
    },
  )

  // ============================================================
  // POST /api/admin/users/:id/reset-password
  // ============================================================

  app.post<{ Params: { id: string } }>(
    '/users/:id/reset-password',
    { preHandler: adminOnly },
    async (request, reply) => {
      const body = resetUserPasswordBodySchema.parse(request.body)
      const result = await resetUserPassword(request.params.id, body, request.user.id)

      return reply.status(200).send({
        success: true,
        data: result,
      })
    },
  )

  // ============================================================
  // GET /api/admin/users/:id/audit-log
  // ============================================================

  app.get<{ Params: { id: string } }>(
    '/users/:id/audit-log',
    { preHandler: adminOnly },
    async (request, reply) => {
      const logs = await getUserAdminAuditLog(request.params.id)

      return reply.status(200).send({
        success: true,
        data: { logs },
      })
    },
  )
}
