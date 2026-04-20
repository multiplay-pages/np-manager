import type { FastifyInstance } from 'fastify'
import type { UserRole } from '@prisma/client'
import type {
  InternalNotificationAttemptChannelDto,
  InternalNotificationAttemptOutcomeDto,
} from '@np-manager/shared'
import { z } from 'zod'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import { getGlobalInternalNotificationAttempts } from './global-internal-notification-attempts.service'

const globalAttemptsReadRoles: UserRole[] = ['ADMIN', 'BOK_CONSULTANT', 'BACK_OFFICE', 'MANAGER']

const internalNotificationAttemptOutcomeValues = [
  'SENT',
  'STUBBED',
  'DISABLED',
  'MISCONFIGURED',
  'FAILED',
  'SKIPPED',
] as const satisfies readonly [
  InternalNotificationAttemptOutcomeDto,
  ...InternalNotificationAttemptOutcomeDto[],
]

const internalNotificationAttemptChannelValues = ['EMAIL', 'TEAMS'] as const satisfies readonly [
  InternalNotificationAttemptChannelDto,
  ...InternalNotificationAttemptChannelDto[],
]

export const globalInternalNotificationAttemptsQuerySchema = z.object({
  outcome: z.enum(internalNotificationAttemptOutcomeValues).optional(),
  channel: z.enum(internalNotificationAttemptChannelValues).optional(),
  retryableOnly: z.coerce.boolean().optional(),
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
        outcome: query.outcome,
        channel: query.channel,
        retryableOnly: query.retryableOnly,
        limit: query.limit,
        offset: query.offset,
      })

      return reply.status(200).send({ success: true, data: result })
    },
  )
}
