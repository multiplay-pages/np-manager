import type { FastifyInstance } from 'fastify'
import type { UserRole } from '@prisma/client'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import {
  createPortingRequestSchema,
  executePortingRequestExternalActionSchema,
  internalNotificationAttemptsQuerySchema,
  markPortingCommunicationSentSchema,
  portingRequestListQuerySchema,
  portingRequestSummaryQuerySchema,
  preparePortingCommunicationDraftSchema,
  retryInternalNotificationAttemptSchema,
  updatePortingRequestAssignmentSchema,
  updatePortingRequestCommercialOwnerSchema,
  updatePortingRequestDetailsSchema,
  updatePortingRequestPortDateSchema,
  updatePortingRequestStatusSchema,
} from './porting-requests.schema'
import {
  assignPortingRequestToMe,
  createPortingRequest,
  executePortingRequestExternalAction,
  exportPortingRequestToPliCbd,
  getPortingRequestAssignmentHistory,
  getPortingRequestIntegrationEvents,
  getPortingRequest,
  getPortingRequestByCaseNumber,
  listAssignablePortingRequestUsers,
  listCommercialOwnerCandidates,
  listPortingRequests,
  getPortingRequestsOperationalSummary,
  syncPortingRequestFromPliCbd,
  updatePortingRequestAssignment,
  updateCommercialOwner,
  updatePortingRequestDetails,
  updatePortingRequestPortDate,
  updatePortingRequestStatus,
} from './porting-requests.service'
import {
  createPortingCommunicationDraft,
  getPortingCommunicationHistory,
  markPortingCommunicationAsSent,
  previewPortingCommunication,
} from './porting-request-communication.service'
import {
  cancelPortingCommunication,
  getPortingCommunicationDeliveryAttempts,
  retryPortingCommunication,
  sendPortingCommunication,
} from './communication-delivery.service'
import { getPortingRequestTimeline } from './porting-events.service'
import { getPortingRequestCaseHistory } from './porting-request-case-history.service'
import { getPortingRequestInternalNotifications } from './porting-internal-notification-history.service'
import {
  getPortingRequestInternalNotificationAttempts,
  InternalNotificationRetryConflictError,
  retryInternalNotificationAttempt,
} from './porting-internal-notification-attempts.service'
import { getPortingRequestNotificationFailures } from './porting-notification-failure-history.service'
import { getPortingRequestDetailsHistory } from './porting-request-details-history.service'
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
import { requireCapability } from '../system-capabilities/require-capability.hook'
import type { PliCbdManualExportMessageType } from '@np-manager/shared'

export async function portingRequestsRouter(app: FastifyInstance): Promise<void> {
  const readRoles: UserRole[] = [
    'ADMIN',
    'BOK_CONSULTANT',
    'BACK_OFFICE',
    'MANAGER',
    'TECHNICAL',
    'LEGAL',
    'AUDITOR',
    'SALES',
  ]
  const writeRoles: UserRole[] = ['ADMIN', 'BOK_CONSULTANT', 'BACK_OFFICE', 'MANAGER']
  const assignmentWriteRoles: UserRole[] = ['ADMIN', 'BOK_CONSULTANT']
  const commercialOwnerWriteRoles: UserRole[] = ['ADMIN', 'BOK_CONSULTANT', 'MANAGER']
  const externalActionRoles: UserRole[] = ['ADMIN', 'BACK_OFFICE', 'MANAGER']
  const pliCbdRoles: UserRole[] = ['ADMIN']
  const internalNotificationDiagnosticRoles: UserRole[] = ['ADMIN']

  app.get('/', { preHandler: [authenticate, authorize(readRoles)] }, async (request, reply) => {
    const query = portingRequestListQuerySchema.parse(request.query)
    const result = await listPortingRequests(query, request.user.id)
    return reply.status(200).send({ success: true, data: result })
  })

  app.get(
    '/summary',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const query = portingRequestSummaryQuerySchema.parse(request.query)
      const result = await getPortingRequestsOperationalSummary(query, request.user.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get(
    '/assignment-users',
    { preHandler: [authenticate, authorize(assignmentWriteRoles)] },
    async (_request, reply) => {
      const result = await listAssignablePortingRequestUsers()
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get(
    '/commercial-owner-candidates',
    { preHandler: [authenticate, authorize(commercialOwnerWriteRoles)] },
    async (_request, reply) => {
      const result = await listCommercialOwnerCandidates()
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.patch<{ Params: { id: string } }>(
    '/:id/commercial-owner',
    { preHandler: [authenticate, authorize(commercialOwnerWriteRoles)] },
    async (request, reply) => {
      const body = updatePortingRequestCommercialOwnerSchema.parse(request.body)
      const result = await updateCommercialOwner(
        request.params.id,
        body,
        request.user.id,
        request.user.role as UserRole,
        request.ip,
        request.headers['user-agent'],
      )
      return reply.status(200).send({ success: true, data: { request: result } })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/case-history',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const result = await getPortingRequestCaseHistory(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/details-history',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const result = await getPortingRequestDetailsHistory(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/internal-notifications',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const result = await getPortingRequestInternalNotifications(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/internal-notification-attempts',
    { preHandler: [authenticate, authorize(internalNotificationDiagnosticRoles)] },
    async (request, reply) => {
      const query = internalNotificationAttemptsQuerySchema.parse(request.query)
      const result = await getPortingRequestInternalNotificationAttempts(
        request.params.id,
        query.limit,
      )
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.post<{ Params: { id: string; attemptId: string } }>(
    '/:id/internal-notification-attempts/:attemptId/retry',
    { preHandler: [authenticate, authorize(internalNotificationDiagnosticRoles)] },
    async (request, reply) => {
      const body = retryInternalNotificationAttemptSchema.parse(request.body ?? {})

      try {
        const result = await retryInternalNotificationAttempt(
          request.params.id,
          request.params.attemptId,
          body,
          request.user.id,
          request.ip,
          request.headers['user-agent'],
        )
        return reply.status(201).send({ success: true, data: result })
      } catch (error) {
        if (error instanceof InternalNotificationRetryConflictError) {
          return reply.status(409).send({
            success: false,
            error: {
              code: error.code,
              message: error.message,
              retryBlockedReasonCode: error.retryBlockedReasonCode,
            },
          })
        }

        throw error
      }
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/notification-failures',
    { preHandler: [authenticate, authorize(internalNotificationDiagnosticRoles)] },
    async (request, reply) => {
      const result = await getPortingRequestNotificationFailures(request.params.id)
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
    { preHandler: [authenticate, authorize(pliCbdRoles), requireCapability('pliCbd.capabilities.diagnostics')] },
    async (request, reply) => {
      const result = await getPortingRequestIntegrationEvents(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/pli-cbd-process',
    { preHandler: [authenticate, authorize(readRoles), requireCapability('pliCbd.capabilities.diagnostics')] },
    async (request, reply) => {
      const snapshot = await getPortingRequestProcessSnapshot(request.params.id)
      return reply.status(200).send({ success: true, data: snapshot })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/pli-cbd-drafts/e03',
    { preHandler: [authenticate, authorize(readRoles), requireCapability('pliCbd.capabilities.diagnostics')] },
    async (request, reply) => {
      const result = await buildE03DraftForPortingRequest(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/pli-cbd-drafts/e12',
    { preHandler: [authenticate, authorize(readRoles), requireCapability('pliCbd.capabilities.diagnostics')] },
    async (request, reply) => {
      const result = await buildE12DraftForPortingRequest(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/pli-cbd-drafts/e18',
    { preHandler: [authenticate, authorize(readRoles), requireCapability('pliCbd.capabilities.diagnostics')] },
    async (request, reply) => {
      const result = await buildE18DraftForPortingRequest(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/:id/pli-cbd-drafts/e23',
    { preHandler: [authenticate, authorize(readRoles), requireCapability('pliCbd.capabilities.diagnostics')] },
    async (request, reply) => {
      const result = await buildE23DraftForPortingRequest(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.get<{ Params: { id: string; messageType: string } }>(
    '/:id/pli-cbd-payloads/:messageType',
    { preHandler: [authenticate, authorize(readRoles), requireCapability('pliCbd.capabilities.diagnostics')] },
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
    { preHandler: [authenticate, authorize(readRoles), requireCapability('pliCbd.capabilities.diagnostics')] },
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
    '/:id/assignment-history',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const result = await getPortingRequestAssignmentHistory(request.params.id)
      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.patch<{ Params: { id: string } }>(
    '/:id/assignment',
    { preHandler: [authenticate, authorize(assignmentWriteRoles)] },
    async (request, reply) => {
      const body = updatePortingRequestAssignmentSchema.parse(request.body)
      const portingRequest = await updatePortingRequestAssignment(
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
    '/:id/assignment/assign-to-me',
    { preHandler: [authenticate, authorize(assignmentWriteRoles)] },
    async (request, reply) => {
      const portingRequest = await assignPortingRequestToMe(
        request.params.id,
        request.user.id,
        request.user.role as UserRole,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({ success: true, data: { request: portingRequest } })
    },
  )

  app.get<{ Params: { caseNumber: string } }>(
    '/by-case-number/:caseNumber',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const portingRequest = await getPortingRequestByCaseNumber(
        request.params.caseNumber,
        request.user.role as UserRole,
      )
      return reply.status(200).send({ success: true, data: { request: portingRequest } })
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
    '/:id/details',
    { preHandler: [authenticate, authorize(writeRoles)] },
    async (request, reply) => {
      const body = updatePortingRequestDetailsSchema.parse(request.body)
      const portingRequest = await updatePortingRequestDetails(
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

  app.patch<{ Params: { id: string } }>(
    '/:id/port-date',
    { preHandler: [authenticate, authorize(writeRoles)] },
    async (request, reply) => {
      const body = updatePortingRequestPortDateSchema.parse(request.body)
      const portingRequest = await updatePortingRequestPortDate(
        request.params.id,
        body.confirmedPortDate,
        request.user.id,
        request.user.role as UserRole,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({ success: true, data: { request: portingRequest } })
    },
  )

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
    { preHandler: [authenticate, authorize(externalActionRoles), requireCapability('pliCbd.capabilities.externalActions')] },
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

  app.post<{ Params: { id: string; communicationId: string } }>(
    '/:id/communications/:communicationId/send',
    { preHandler: [authenticate, authorize(writeRoles)] },
    async (request, reply) => {
      const result = await sendPortingCommunication(
        request.params.id,
        request.params.communicationId,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.post<{ Params: { id: string; communicationId: string } }>(
    '/:id/communications/:communicationId/retry',
    { preHandler: [authenticate, authorize(writeRoles)] },
    async (request, reply) => {
      const result = await retryPortingCommunication(
        request.params.id,
        request.params.communicationId,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.post<{ Params: { id: string; communicationId: string } }>(
    '/:id/communications/:communicationId/cancel',
    { preHandler: [authenticate, authorize(writeRoles)] },
    async (request, reply) => {
      const result = await cancelPortingCommunication(
        request.params.id,
        request.params.communicationId,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({ success: true, data: { communication: result } })
    },
  )

  app.get<{ Params: { id: string; communicationId: string } }>(
    '/:id/communications/:communicationId/delivery-attempts',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const result = await getPortingCommunicationDeliveryAttempts(
        request.params.id,
        request.params.communicationId,
      )

      return reply.status(200).send({ success: true, data: result })
    },
  )

  app.post<{ Params: { id: string; messageType: string } }>(
    '/:id/pli-cbd-exports/:messageType/manual',
    { preHandler: [authenticate, authorize(pliCbdRoles), requireCapability('pliCbd.capabilities.export')] },
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
    { preHandler: [authenticate, authorize(pliCbdRoles), requireCapability('pliCbd.capabilities.export')] },
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
    { preHandler: [authenticate, authorize(pliCbdRoles), requireCapability('pliCbd.capabilities.sync')] },
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
