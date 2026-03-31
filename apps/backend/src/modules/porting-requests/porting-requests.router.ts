import type { FastifyInstance } from 'fastify'
import type { UserRole } from '@prisma/client'
import { authenticate } from '../../shared/middleware/authenticate'
import { authorize } from '../../shared/middleware/authorize'
import {
  createPortingRequestSchema,
  portingRequestListQuerySchema,
} from './porting-requests.schema'
import {
  createPortingRequest,
  getPortingRequest,
  listPortingRequests,
} from './porting-requests.service'

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
}
