import type { FastifyInstance } from 'fastify'
import type { UserRole } from '@prisma/client'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import {
  createPortingRequestSchema,
  portingRequestListQuerySchema,
  updatePortingRequestStatusSchema,
} from './porting-requests.schema'
import {
  createPortingRequest,
  exportPortingRequestToPliCbd,
  getPortingRequestIntegrationEvents,
  getPortingRequest,
  listPortingRequests,
  syncPortingRequestFromPliCbd,
  updatePortingRequestStatus,
} from './porting-requests.service'
import { getPortingRequestTimeline } from './porting-events.service'
import {
  buildE03DraftForPortingRequest,
  buildE12DraftForPortingRequest,
  getPortingRequestProcessSnapshot,
} from '../pli-cbd/fnp-process.service'

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
  const pliCbdRoles: UserRole[] = ['ADMIN']

  app.get(
    '/',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const query = portingRequestListQuerySchema.parse(request.query)
      const result = await listPortingRequests(query)
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
    '/:id',
    { preHandler: [authenticate, authorize(readRoles)] },
    async (request, reply) => {
      const portingRequest = await getPortingRequest(request.params.id)
      return reply.status(200).send({ success: true, data: { request: portingRequest } })
    },
  )

  app.post(
    '/',
    { preHandler: [authenticate, authorize(writeRoles)] },
    async (request, reply) => {
      const body = createPortingRequestSchema.parse(request.body)
      const portingRequest = await createPortingRequest(
        body,
        request.user.id,
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(201).send({ success: true, data: { request: portingRequest } })
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
        request.ip,
        request.headers['user-agent'],
      )

      return reply.status(200).send({ success: true, data: { request: portingRequest } })
    },
  )

  app.post<{ Params: { id: string } }>(
    '/:id/export',
    { preHandler: [authenticate, authorize(pliCbdRoles)] },
    async (request, reply) => {
      const portingRequest = await exportPortingRequestToPliCbd(
        request.params.id,
        request.user.id,
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
