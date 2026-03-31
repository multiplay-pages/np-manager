import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import { listOperators, createOperator } from './operators.service'

// ============================================================
// SCHEMATY WALIDACJI
// ============================================================

const listQuerySchema = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

const createOperatorBodySchema = z.object({
  name: z
    .string({ required_error: 'Nazwa operatora jest wymagana' })
    .min(1, 'Nazwa operatora jest wymagana')
    .max(200)
    .trim(),
  shortName: z
    .string({ required_error: 'Skrócona nazwa jest wymagana' })
    .min(1, 'Skrócona nazwa jest wymagana')
    .max(100)
    .trim(),
  routingNumber: z
    .string({ required_error: 'Numer rozliczeniowy jest wymagany' })
    .min(1, 'Numer rozliczeniowy jest wymagany')
    .max(20)
    .trim()
    .toUpperCase(),
  isRecipientDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

// ============================================================
// ROUTER
// ============================================================

/**
 * Moduł tras słownika operatorów.
 *
 *   GET  /api/operators          — lista aktywnych operatorów (każdy zalogowany)
 *   POST /api/operators          — utwórz operatora (tylko ADMIN)
 *
 * Polityka dostępu — świadoma decyzja projektowa:
 *   GET jest otwarty dla wszystkich uwierzytelnionych ról (nie tylko ADMIN),
 *   ponieważ BOK_CONSULTANT, BACK_OFFICE i MANAGER muszą widzieć listę
 *   operatorów przy tworzeniu wniosków portowania (dropdowny w formularzach).
 *   Zarządzanie słownikiem (POST/PATCH/DELETE) pozostaje wyłącznie dla ADMIN.
 *
 * Rejestracja w app.ts:
 *   app.register(operatorsRouter, { prefix: '/api/operators' })
 */
export async function operatorsRouter(app: FastifyInstance): Promise<void> {
  // ============================================================
  // GET / — lista operatorów
  // ============================================================

  app.get(
    '/',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { includeInactive } = listQuerySchema.parse(request.query)
      const operators = await listOperators(includeInactive)
      return reply.status(200).send({ success: true, data: { operators } })
    },
  )

  // ============================================================
  // POST / — utwórz operatora (tylko ADMIN)
  // ============================================================

  app.post(
    '/',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      const body = createOperatorBodySchema.parse(request.body)
      const operator = await createOperator(body)
      return reply.status(201).send({ success: true, data: { operator } })
    },
  )
}
