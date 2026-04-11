import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import type { UserRole } from '@np-manager/shared'
import {
  getGlobalNotificationFailureQueue,
  type GlobalFailureQueueOutcomeFilter,
  type GlobalFailureQueueSort,
} from './global-notification-failure-queue.service'

const globalFailureQueueRoles: UserRole[] = ['ADMIN', 'BOK_CONSULTANT', 'BACK_OFFICE', 'MANAGER']

const globalFailureQueueQuerySchema = z.object({
  outcome: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return ['FAILED', 'MISCONFIGURED'] as GlobalFailureQueueOutcomeFilter[]
      return val.split(',').filter((o): o is GlobalFailureQueueOutcomeFilter =>
        o === 'FAILED' || o === 'MISCONFIGURED',
      )
    }),
  canRetry: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => {
      if (val === 'true') return true
      if (val === 'false') return false
      return undefined
    }),
  sort: z.enum(['newest', 'retryAvailable']).default('newest') as z.ZodType<GlobalFailureQueueSort>,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function internalNotificationFailuresRouter(app: FastifyInstance) {
  app.get(
    '/',
    { preHandler: [authenticate, authorize(globalFailureQueueRoles)] },
    async (request, reply) => {
      const query = globalFailureQueueQuerySchema.parse(request.query)
      const result = await getGlobalNotificationFailureQueue({
        outcomes: query.outcome,
        canRetry: query.canRetry,
        sort: query.sort,
        limit: query.limit,
        offset: query.offset,
      })
      return reply.status(200).send({ success: true, data: result })
    },
  )
}
