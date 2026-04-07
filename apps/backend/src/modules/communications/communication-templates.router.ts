import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import {
  activateCommunicationTemplate,
  createCommunicationTemplate,
  deactivateCommunicationTemplate,
  getCommunicationTemplateById,
  listCommunicationTemplates,
  updateCommunicationTemplate,
} from './communication-templates.service'
import {
  createCommunicationTemplateSchema,
  updateCommunicationTemplateSchema,
} from './communication-templates.schema'

export async function communicationTemplatesRouter(app: FastifyInstance): Promise<void> {
  const adminOnly = [authenticate, authorize(['ADMIN'])]

  app.get(
    '/',
    { preHandler: adminOnly },
    async (_request, reply) => {
      const result = await listCommunicationTemplates()

      return reply.status(200).send({
        success: true,
        data: result,
      })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: adminOnly },
    async (request, reply) => {
      const template = await getCommunicationTemplateById(request.params.id)

      return reply.status(200).send({
        success: true,
        data: { template },
      })
    },
  )

  app.post(
    '/',
    { preHandler: adminOnly },
    async (request, reply) => {
      const body = createCommunicationTemplateSchema.parse(request.body)
      const template = await createCommunicationTemplate(
        body,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(201).send({
        success: true,
        data: { template },
      })
    },
  )

  app.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: adminOnly },
    async (request, reply) => {
      const body = updateCommunicationTemplateSchema.parse(request.body)
      const template = await updateCommunicationTemplate(
        request.params.id,
        body,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({
        success: true,
        data: { template },
      })
    },
  )

  app.post<{ Params: { id: string } }>(
    '/:id/activate',
    { preHandler: adminOnly },
    async (request, reply) => {
      const template = await activateCommunicationTemplate(
        request.params.id,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({
        success: true,
        data: { template },
      })
    },
  )

  app.post<{ Params: { id: string } }>(
    '/:id/deactivate',
    { preHandler: adminOnly },
    async (request, reply) => {
      const template = await deactivateCommunicationTemplate(
        request.params.id,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({
        success: true,
        data: { template },
      })
    },
  )
}
