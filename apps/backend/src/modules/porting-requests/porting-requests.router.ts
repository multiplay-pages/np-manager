import type { FastifyInstance } from 'fastify'
import type { UserRole } from '@prisma/client'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import {
  createPortingRequestSchema,
  executePortingRequestExternalActionSchema,
  markPortingCommunicationSentSchema,
  portingRequestListQuerySchema,
  preparePortingCommunicationDraftSchema,
  updatePortingRequestStatusSchema,
} from './porting-requests.schema'
import {
  createPortingRequest,
  executePortingRequestExternalAction,
  exportPortingRequestToPliCbd,
  getPortingRequestIntegrationEvents,
  getPortingRequest,
  listPortingRequests,
  syncPortingRequestFromPliCbd,
  updatePortingRequestStatus,
} from './porting-requests.service'
import {
  createPortingCommunicationDraft,
  getPortingCommunicationHistory,
  markPortingCommunicationAsSent,
  previewPortingCommunication,
} from './porting-request-communication.service'
import { getPortingRequestTimeline } from './porting-events.service'
import { getPortingRequestCaseHistory } from './porting-request-case-history.service'
import {
  buildE03DraftForPortingRequest,
  buildE12DraftForPortingRequest,
  buildE18DraftForPortingRequest,
  buildE23DraftForPortingRequest,
  getPortingRequestProcessSnapshot,
} from '../pli-cbd/fnp-process.service'
import {
  buildTechnicalPayloadForPortingRequest,
  type PliCbdTechnicalPayloadMessageType,
} from '../pli-cbd/pli-cbd-technical-payload.service'
import { buildXmlPreviewForPortingRequest } from '../pli-cbd/pli-cbd-xml-preview.service'
import { triggerManualPliCbdExport } from '../pli-cbd/pli-cbd-export.service'
import type { PliCbdManualExportMessageType } from '@np-manager/shared'

export async function portingRequestsRouter(app: FastifyInstance): Promise<void> {
  const readRoles: UserRole[] = [
    'ADMIN',
    'BOK_CONSULTANT',
    'BACK_OFFICE',
    'MANAGER',
    'LEGAL',
    'AUDITOR',
  ]
  const writeRoles: UserRole[] = ['ADMIN', 'BOK_CONSULTANT', 'BACK_OFFICE', 'MANAGER']
  const externalActionRoles: UserRole[] = ['ADMIN', 'BACK_OFFICE', 'MANAGER']
  const pliCbdRoles: UserRole[] = ['ADMIN']

  app.get('/', { preHandler: [authenticate, authorize(readRoles)] }, async (request, reply) => {
    const query = portingRequestListQuerySchema.parse(request.query)
    const result = await listPortingRequests(query)
    return reply.status(200).send({ success: true, data: result })
  })

  app.get<{ Params: { id: string } }>(
    '/:id/case-history',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const result = await getPortingRequestCaseHistory(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/timeline',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const result = await getPortingRequestTimeline(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/communications',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const result = await getPortingCommunicationHistory(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/integration-events',
    { preHandler: [authenticate, authorize(pliCbdRoles)] },
    async (request, reply) => {
      const result = await getPortingRequestIntegrationEvents(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/pli-cbd-process',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const snapshot = await getPortingRequestProcessSnapshot(request.params.id)
      return reply.status(200).send({ success: true, data: snapshot })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/pli-cbd-drafts/e03',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const result = await buildE03DraftForPortingRequest(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/pli-cbd-drafts/e12',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const result = await buildE12DraftForPortingRequest(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/pli-cbd-drafts/e18',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const result = await buildE18DraftForPortingRequest(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/pli-cbd-drafts/e23',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const result = await buildE23DraftForPortingRequest(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string; messageType: string } }>(
    '/:id/pli-cbd-payloads/:messageType',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const normalizedMessageType = request.params.messageType.toUpperCase()

      if (
        normalizedMessageType !== 'E03' &&
        normalizedMessageType !== 'E12' &&
        normalizedMessageType !== 'E18' &&
        normalizedMessageType !== 'E23'
      ) {
        return reply.status(400).send({
          success: false,
          error: {
            message: `Nieobslugiwany typ payloadu technicznego: ${request.params.messageType}.`,
            code: 'PLI_CBD_TECHNICAL_PAYLOAD_MESSAGE_UNSUPPORTED',
          },
        })
      }

      const result = await buildTechnicalPayloadForPortingRequest(
        request.params.id,
        normalizedMessageType as PliCbdTechnicalPayloadMessageType,
      )

      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string; messageType: string } }>(
    '/:id/pli-cbd-xml/:messageType',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const normalizedMessageType = request.params.messageType.toUpperCase()

      if (
        normalizedMessageType !== 'E03' &&
        normalizedMessageType !== 'E12' &&
        normalizedMessageType !== 'E18' &&
        normalizedMessageType !== 'E23'
      ) {
        return reply.status(400).send({
          success: false,
          error: {
            message: `Nieobslugiwany typ XML preview: ${request.params.messageType}.`,
            code: 'PLI_CBD_XML_PREVIEW_MESSAGE_UNSUPPORTED',
          },
        })
      }

      const result = await buildXmlPreviewForPortingRequest(
        request.params.id,
        normalizedMessageType as PliCbdTechnicalPayloadMessageType,
      )

      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const portingRequest = await getPortingRequest(request.params.id, request.user.role as UserRole)
      return reply.status(200).send({ success: true, data: { request: portingRequest } })
    },
  )

  app.post('/', { preHandler: [authenticate, authorize(writeRoles)] }, async (request, reply) => {
    const body = createPortingRequestSchema.parse(request.body)
    const portingRequest = await createPortingRequest(
      body,
      request.user.id,
      request.user.role as UserRole,
      request.ip,
      request.headers['user-agent'],
    )

    return reply.status(201).send({ success: true, data: { request: portingRequest } })
  })

  app.patch<{ Params: { id: string } }>(
    '/:id/status',
    { preHandler: [authenticate, authorize(writeRoles)] },
    async (request, reply) => {
      const body = updatePortingRequestStatusSchema.parse(request.body)
      const portingRequest = await updatePortingRequestStatus(
        request.params.id,
        body,
        request.user.id,
        request.user.role as UserRole,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({ success: true, data: { request: portingRequest } })
    },
  )

  app.post<{ Params: { id: string } }>(
    '/:id/external-actions',
    { preHandler: [authenticate, authorize(externalActionRoles)] },
    async (request, reply) => {
      const body = executePortingRequestExternalActionSchema.parse(request.body)
      const result = await executePortingRequestExternalAction(
        request.params.id,
        body,
        request.user.id,
        request.user.role as UserRole,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.post<{ Params: { id: string } }>(
    '/:id/communications/preview',
    { preHandler: [authenticate, authorize(writeRoles)] },
    async (request, reply) => {
      const body = preparePortingCommunicationDraftSchema.parse(request.body)
      const result = await previewPortingCommunication(
        request.params.id,
        body,
        request.user.role as UserRole,
      )
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.post<{ Params: { id: string } }>(
    '/:id/communications/drafts',
    { preHandler: [authenticate, authorize(writeRoles)] },
    async (request, reply) => {
      const body = preparePortingCommunicationDraftSchema.parse(request.body)
      const result = await createPortingCommunicationDraft(
        request.params.id,
        body,
        request.user.id,
        request.user.role as UserRole,
        request.ip,
        request.headers['user-agent'],
      )
      return reply.status(201).send({ success: true, data: { communication: result } })
    },
  )

  app.patch<{ Params: { id: string; communicationId: string } }>(
    '/:id/communications/:communicationId/mark-sent',
    { preHandler: [authenticate, authorize(writeRoles)] },
    async (request, reply) => {
      const body = markPortingCommunicationSentSchema.parse(request.body ?? {})
      const result = await markPortingCommunicationAsSent(
        request.params.id,
        request.params.communicationId,
        request.user.role as UserRole,
        request.user.id,
        body,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({ success: true, data: { communication: result } })
    },
  )

  app.post<{ Params: { id: string; messageType: string } }>(
    '/:id/pli-cbd-exports/:messageType/manual',
    { preHandler: [authenticate, authorize(pliCbdRoles)] },
    async (request, reply) => {
      const normalizedMessageType = request.params.messageType.toUpperCase()

      if (
        normalizedMessageType !== 'E03' &&
        normalizedMessageType !== 'E12' &&
        normalizedMessageType !== 'E18' &&
        normalizedMessageType !== 'E23'
      ) {
        return reply.status(400).send({
          success: false,
          error: {
            message: `Nieobslugiwany typ komunikatu: ${request.params.messageType}.`,
            code: 'PLI_CBD_MANUAL_EXPORT_MESSAGE_UNSUPPORTED',
          },
        })
      }

      const result = await triggerManualPliCbdExport(
        request.params.id,
        normalizedMessageType as PliCbdManualExportMessageType,
        request.user.id,
      )

      return reply.status(200).send({ success: true, data: { exportResult: result } })
    },
  )

  app.post<{ Params: { id: string } }>(
    '/:id/export',
    { preHandler: [authenticate, authorize(pliCbdRoles)] },
    async (request, reply) => {
      const portingRequest = await exportPortingRequestToPliCbd(
        request.params.id,
        request.user.id,
        request.user.role as UserRole,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({
        success: true,
        data: {
          request: portingRequest,
          meta: {
            mode: 'MANUAL_FOUNDATION_TRIGGER',
          },
        },
      })
    },
  )

  app.post<{ Params: { id: string } }>(
    '/:id/sync',
    { preHandler: [authenticate, authorize(pliCbdRoles)] },
    async (request, reply) => {
      const portingRequest = await syncPortingRequestFromPliCbd(
        request.params.id,
        request.user.id,
        request.user.role as UserRole,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({
        success: true,
        data: {
          request: portingRequest,
          meta: {
            mode: 'MANUAL_FOUNDATION_TRIGGER',
          },
        },
      })
    },
  )
}
