import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import {
  archiveCommunicationTemplateVersion,
  cloneCommunicationTemplateVersion,
  createCommunicationTemplate,
  createCommunicationTemplateVersion,
  getCommunicationTemplateByCode,
  getCommunicationTemplateVersions,
  listCommunicationTemplates,
  previewCommunicationTemplateVersionForRealCase,
  publishCommunicationTemplateVersion,
  updateCommunicationTemplateVersion,
} from './communication-templates.service'
import {
  communicationTemplateCodeSchema,
  createCommunicationTemplateSchema,
  createCommunicationTemplateVersionSchema,
  previewRealCaseSchema,
  updateCommunicationTemplateVersionSchema,
} from './communication-templates.schema'

export async function communicationTemplatesRouter(app: FastifyInstance): Promise<void> {
  const adminOnly = [authenticate, authorize(['ADMIN'])]

  app.get(
    '/communication-templates',
    { preHandler: adminOnly },
    async (_request, reply) => {
      const result = await listCommunicationTemplates()

      return reply.status(200).send({
        success: true,
        data: result,
      })
    },
  )

  app.get<{ Params: { code: string } }>(
    '/communication-templates/:code',
    { preHandler: adminOnly },
    async (request, reply) => {
      const code = communicationTemplateCodeSchema.parse(request.params.code)
      const template = await getCommunicationTemplateByCode(code)

      return reply.status(200).send({
        success: true,
        data: { template },
      })
    },
  )

  app.get<{ Params: { code: string } }>(
    '/communication-templates/:code/versions',
    { preHandler: adminOnly },
    async (request, reply) => {
      const code = communicationTemplateCodeSchema.parse(request.params.code)
      const versions = await getCommunicationTemplateVersions(code)

      return reply.status(200).send({
        success: true,
        data: versions,
      })
    },
  )

  app.post(
    '/communication-templates',
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

  app.post<{ Params: { code: string } }>(
    '/communication-templates/:code/versions',
    { preHandler: adminOnly },
    async (request, reply) => {
      const code = communicationTemplateCodeSchema.parse(request.params.code)
      const body = createCommunicationTemplateVersionSchema.parse(request.body)
      const version = await createCommunicationTemplateVersion(
        code,
        body,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(201).send({
        success: true,
        data: { version },
      })
    },
  )

  app.patch<{ Params: { versionId: string } }>(
    '/communication-template-versions/:versionId',
    { preHandler: adminOnly },
    async (request, reply) => {
      const body = updateCommunicationTemplateVersionSchema.parse(request.body)
      const version = await updateCommunicationTemplateVersion(
        request.params.versionId,
        body,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({
        success: true,
        data: { version },
      })
    },
  )

  app.post<{ Params: { versionId: string } }>(
    '/communication-template-versions/:versionId/publish',
    { preHandler: adminOnly },
    async (request, reply) => {
      const version = await publishCommunicationTemplateVersion(
        request.params.versionId,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({
        success: true,
        data: { version },
      })
    },
  )

  app.post<{ Params: { versionId: string } }>(
    '/communication-template-versions/:versionId/archive',
    { preHandler: adminOnly },
    async (request, reply) => {
      const version = await archiveCommunicationTemplateVersion(
        request.params.versionId,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({
        success: true,
        data: { version },
      })
    },
  )

  app.post<{ Params: { versionId: string } }>(
    '/communication-template-versions/:versionId/clone',
    { preHandler: adminOnly },
    async (request, reply) => {
      const version = await cloneCommunicationTemplateVersion(
        request.params.versionId,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(201).send({
        success: true,
        data: { version },
      })
    },
  )

  app.post<{ Params: { versionId: string } }>(
    '/communication-template-versions/:versionId/preview-real-case',
    { preHandler: adminOnly },
    async (request, reply) => {
      const body = previewRealCaseSchema.parse(request.body)
      const preview = await previewCommunicationTemplateVersionForRealCase(
        request.params.versionId,
        body,
      )

      return reply.status(200).send({
        success: true,
        data: { preview },
      })
    },
  )
}
