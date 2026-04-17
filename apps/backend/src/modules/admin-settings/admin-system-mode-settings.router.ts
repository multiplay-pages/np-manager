import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import { updateSystemModeSettingsBodySchema } from './admin-system-mode-settings.schema'
import {
  getSystemModeSettings,
  updateSystemModeSettings,
} from './admin-system-mode-settings.service'

export async function adminSystemModeSettingsRouter(app: FastifyInstance): Promise<void> {
  const adminOnly = [authenticate, authorize(['ADMIN'])]

  app.get('/system-mode-settings', { preHandler: adminOnly }, async (_request, reply) => {
    const result = await getSystemModeSettings()

    return reply.status(200).send({
      success: true,
      data: result,
    })
  })

  app.put('/system-mode-settings', { preHandler: adminOnly }, async (request, reply) => {
    const body = updateSystemModeSettingsBodySchema.parse(request.body)
    const result = await updateSystemModeSettings(
      body,
      request.user.id,
      request.ip,
      request.headers['user-agent'],
    )

    return reply.status(200).send({
      success: true,
      data: result,
    })
  })
}
