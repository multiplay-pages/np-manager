import type { FastifyRequest, FastifyReply } from 'fastify'
import type { UserRole } from '@prisma/client'
import { AppError } from '../errors/app-error'
import { logAuditEvent } from '../audit/audit.service'

/**
 * Fabryka middleware autoryzacji opartej na rolach (RBAC).
 *
 * Przyjmuje tablicę dozwolonych ról i zwraca Fastify preHandler,
 * który sprawdza czy request.user.role mieści się w podanym zbiorze.
 *
 * Wymaga wcześniejszego wywołania middleware `authenticate`
 * (request.user musi być ustawiony).
 *
 * Użycie:
 *   app.get('/admin', { preHandler: [authenticate, authorize(['ADMIN'])] }, handler)
 *
 * @param allowedRoles - tablica ról, które mają dostęp do endpointu
 */
export function authorize(allowedRoles: UserRole[]) {
  const allowedSet = new Set<string>(allowedRoles)

  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const { id: userId, role } = request.user

    if (allowedSet.has(role)) {
      return
    }

    // Loguj próbę nieautoryzowanego dostępu — fire-and-forget
    logAuditEvent({
      action: 'SECURITY_ALERT',
      userId,
      entityType: 'system',
      entityId: 'access_denied',
      newValue: `FORBIDDEN: role=${role}, required=${allowedRoles.join(',')}`,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']?.slice(0, 500),
    }).catch(() => {})

    throw AppError.forbidden()
  }
}
