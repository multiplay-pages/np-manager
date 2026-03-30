import type { FastifyInstance } from 'fastify'
import type { UserRole } from '@prisma/client'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import {
  clientListQuerySchema,
  clientSearchQuerySchema,
  createClientSchema,
  updateClientSchema,
} from './clients.schema'
import {
  listClients,
  getClient,
  searchClients,
  createClient,
  updateClient,
} from './clients.service'

/**
 * Moduł tras kartoteki klientów.
 *
 * Trasy (wszystkie wymagają JWT):
 *   GET  /api/clients/search    — autocomplete (ADMIN, BOK, BACK_OFFICE, MANAGER)
 *   GET  /api/clients           — lista z paginacją (+ LEGAL, AUDITOR)
 *   GET  /api/clients/:id       — szczegóły (+ LEGAL, AUDITOR)
 *   POST /api/clients           — utwórz klienta (ADMIN, BOK, BACK_OFFICE, MANAGER)
 *   PATCH /api/clients/:id      — edytuj klienta (ADMIN, BOK, BACK_OFFICE, MANAGER)
 *
 * Uwaga: /search musi być zarejestrowany przed /:id — Fastify's find-my-way
 * daje priorytet trasom statycznym, ale zachowujemy kolejność dla czytelności.
 *
 * Rejestracja w app.ts:
 *   app.register(clientsRouter, { prefix: '/api/clients' })
 */
export async function clientsRouter(app: FastifyInstance): Promise<void> {
  const readRoles: UserRole[] = [
    'ADMIN', 'BOK_CONSULTANT', 'BACK_OFFICE', 'MANAGER', 'LEGAL', 'AUDITOR',
  ]
  const writeRoles: UserRole[] = ['ADMIN', 'BOK_CONSULTANT', 'BACK_OFFICE', 'MANAGER']
  const searchRoles: UserRole[] = ['ADMIN', 'BOK_CONSULTANT', 'BACK_OFFICE', 'MANAGER']

  // ============================================================
  // GET /search — autocomplete (statyczna trasa — przed /:id)
  // ============================================================

  app.get(
    '/search',
    { preHandler: [authenticate, authorize(searchRoles)] },
    async (request, reply) => {
      const { q } = clientSearchQuerySchema.parse(request.query)
      const items = await searchClients(q)
      return reply.status(200).send({ success: true, data: { items } })
    },
  )

  // ============================================================
  // GET / — lista klientów z paginacją i filtrowaniem
  // ============================================================

  app.get(
    '/',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const query = clientListQuerySchema.parse(request.query)
      const result = await listClients(query)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  // ============================================================
  // GET /:id — szczegóły klienta
  // ============================================================

  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const client = await getClient(request.params.id)
      return reply.status(200).send({ success: true, data: { client } })
    },
  )

  // ============================================================
  // POST / — utwórz klienta
  // ============================================================

  app.post(
    '/',
    { preHandler: [authenticate, authorize(writeRoles)] },
    async (request, reply) => {
      const body = createClientSchema.parse(request.body)
      const client = await createClient(
        body,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )
      return reply.status(201).send({ success: true, data: { client } })
    },
  )

  // ============================================================
  // PATCH /:id — edytuj klienta
  // ============================================================

  app.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, authorize(writeRoles)] },
    async (request, reply) => {
      const body = updateClientSchema.parse(request.body)
      const client = await updateClient(
        request.params.id,
        body,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )
      return reply.status(200).send({ success: true, data: { client } })
    },
  )
}
