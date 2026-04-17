import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../shared/middleware/authenticate'
import { resolveSystemCapabilities } from './system-capabilities.service'

/**
 * Router udostępniający capabilities systemu.
 *
 * GET /api/system/capabilities — zwraca aktualny snapshot trybu systemu
 * i dostępnych modułów (frontend czyta to przy bootstrapie).
 *
 * Wymagane uwierzytelnienie (każda rola). Celem jest odfiltrowanie
 * anonimowych klientów; żaden role check nie jest potrzebny, bo
 * odpowiedź nie zawiera danych wrażliwych.
 */
export async function systemCapabilitiesRouter(app: FastifyInstance): Promise<void> {
  app.get(
    '/capabilities',
    { preHandler: [authenticate] },
    async (_request, reply) => {
      const capabilities = await resolveSystemCapabilities()
      return reply.status(200).send({ success: true, data: capabilities })
    },
  )
}
