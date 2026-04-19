import type { FastifyInstance } from 'fastify'
import type { UserRole } from '@prisma/client'
import { z } from 'zod'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import { getGlobalInternalNotificationAttempts } from './global-internal-notification-attempts.service'

const globalAttemptsReadRoles: UserRole[] = ['ADMIN', 'BOK_CONSULTANT', 'BACK_OFFICE', 'MANAGER']

export const globalInternalNotificationAttemptsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function internalNotificationAttemptsRouter(app: FastifyInstance): Promise<void> {
  app.get(
    '/',
    { preHandler: [authenticate, authorize(globalAttemptsReadRoles)] },
    async (request, reply) => {
      const query = globalInternalNotificationAttemptsQuerySchema.parse(request.query)
      const result = await getGlobalInternalNotificationAttempts({
        limit: query.limit,
        offset: query.offset,
      })

      return reply.status(200).send({ success: true, data: result })
    },
  )
}
