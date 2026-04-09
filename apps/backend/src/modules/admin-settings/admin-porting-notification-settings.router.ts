import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import { updatePortingNotificationSettingsBodySchema } from './admin-porting-notification-settings.schema'
import {
  getPortingNotificationSettings,
  updatePortingNotificationSettings,
} from './admin-porting-notification-settings.service'

export async function adminPortingNotificationSettingsRouter(
  app: FastifyInstance,
): Promise<void> {
  const adminOnly = [authenticate, authorize(['ADMIN'])]

  app.get(
    '/porting-notification-settings',
    { preHandler: adminOnly },
    async (_request, reply) => {
      const result = await getPortingNotificationSettings()

      return reply.status(200).send({
        success: true,
        data: result,
      })
    },
  )

  app.put(
    '/porting-notification-settings',
    { preHandler: adminOnly },
    async (request, reply) => {
      const body = updatePortingNotificationSettingsBodySchema.parse(request.body)
      const result = await updatePortingNotificationSettings(
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
