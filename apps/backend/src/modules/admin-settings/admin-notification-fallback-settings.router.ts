import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import { updateNotificationFallbackSettingsBodySchema } from './admin-notification-fallback-settings.schema'
import {
  getNotificationFallbackSettings,
  updateNotificationFallbackSettings,
} from './admin-notification-fallback-settings.service'

export async function adminNotificationFallbackSettingsRouter(
  app: FastifyInstance,
): Promise<void> {
  const adminOnly = [authenticate, authorize(['ADMIN'])]

  app.get(
    '/notification-fallback-settings',
    { preHandler: adminOnly },
    async (_request, reply) => {
      const result = await getNotificationFallbackSettings()

      return reply.status(200).send({
        success: true,
        data: result,
      })
    },
  )

  app.put(
    '/notification-fallback-settings',
    { preHandler: adminOnly },
    async (request, reply) => {
      const body = updateNotificationFallbackSettingsBodySchema.parse(request.body)
      const result = await updateNotificationFallbackSettings(
        body,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({
        success: true,
        data: result,
      })
    },
  )
}
