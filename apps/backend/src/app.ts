import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { env } from './config/env'
import { loggerConfig } from './config/logger'
import { authRouter } from './modules/auth/auth.router'
import { usersRouter } from './modules/users/users.router'
import { clientsRouter } from './modules/clients/clients.router'
import { operatorsRouter } from './modules/operators/operators.router'
import { portingRequestsRouter } from './modules/porting-requests/porting-requests.router'
import { communicationTemplatesRouter } from './modules/communications/communication-templates.router'
import { adminUsersRouter } from './modules/admin-users/admin-users.router'
import { adminPortingNotificationSettingsRouter } from './modules/admin-settings/admin-porting-notification-settings.router'
import { adminNotificationFallbackSettingsRouter } from './modules/admin-settings/admin-notification-fallback-settings.router'
import { adminSystemModeSettingsRouter } from './modules/admin-settings/admin-system-mode-settings.router'
import { internalNotificationFailuresRouter } from './modules/porting-requests/internal-notification-failures.router'
import { systemCapabilitiesRouter } from './modules/system-capabilities/system-capabilities.router'
import { bootstrapSystemCapabilities } from './modules/system-capabilities/system-capabilities.bootstrap'
import { errorHandler } from './shared/errors/error-handler'
import { buildReadinessResult } from './shared/health/readiness'
import type { FastifyInstance } from 'fastify'

const REGISTERED_API_PREFIXES = [
  '/api/auth',
  '/api/users',
  '/api/clients',
  '/api/operators',
  '/api/porting-requests',
  '/api/admin',
  '/api/system',
] as const

export const REQUIRED_RUNTIME_ROUTES = [
  { method: 'POST', url: '/api/auth/login' },
  { method: 'GET', url: '/api/system/capabilities' },
  { method: 'GET', url: '/api/admin/system-mode-settings' },
  { method: 'PUT', url: '/api/admin/system-mode-settings' },
  { method: 'GET', url: '/api/porting-requests' },
  { method: 'GET', url: '/api/porting-requests/:id' },
  { method: 'POST', url: '/api/porting-requests/:id/communications/preview' },
  { method: 'POST', url: '/api/porting-requests/:id/communications/drafts' },
] as const

export function getRuntimeRouteDiagnostics(app: FastifyInstance) {
  const requiredRoutes = REQUIRED_RUNTIME_ROUTES.map((route) => ({
    ...route,
    registered: app.hasRoute({
      method: route.method,
      url: route.url,
    }),
  }))

  return {
    entrypoint: __filename,
    cwd: process.cwd(),
    apiPrefixes: [...REGISTERED_API_PREFIXES],
    requiredRoutes,
    routeTable: app.printRoutes(),
  }
}

function logStartupDiagnostics(app: FastifyInstance) {
  const diagnostics = getRuntimeRouteDiagnostics(app)

  app.log.info(
    {
      entrypoint: diagnostics.entrypoint,
      cwd: diagnostics.cwd,
      apiPrefixes: diagnostics.apiPrefixes,
      requiredRoutes: diagnostics.requiredRoutes,
    },
    'Backend startup diagnostics',
  )

  if (env.NODE_ENV !== 'production') {
    app.log.info(`Registered route table:\n${diagnostics.routeTable}`)
  }
}

/**
 * Buduje i konfiguruje instancje aplikacji Fastify.
 * Wyeksportowana funkcja ulatwia testowanie bez odpalania serwera.
 */
export async function buildApp() {
  const app = Fastify({
    logger: loggerConfig,
    genReqId: () => crypto.randomUUID(),
  })

  await app.register(cors, {
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  })

  app.setErrorHandler(errorHandler)

  await app.register(authRouter, { prefix: '/api/auth' })
  await app.register(usersRouter, { prefix: '/api/users' })
  await app.register(clientsRouter, { prefix: '/api/clients' })
  await app.register(operatorsRouter, { prefix: '/api/operators' })
  await app.register(portingRequestsRouter, { prefix: '/api/porting-requests' })
  await app.register(communicationTemplatesRouter, { prefix: '/api/admin' })
  await app.register(adminUsersRouter, { prefix: '/api/admin' })
  await app.register(adminPortingNotificationSettingsRouter, { prefix: '/api/admin' })
  await app.register(adminNotificationFallbackSettingsRouter, { prefix: '/api/admin' })
  await app.register(adminSystemModeSettingsRouter, { prefix: '/api/admin' })
  await app.register(internalNotificationFailuresRouter, { prefix: '/api/internal-notification-failures' })
  await app.register(systemCapabilitiesRouter, { prefix: '/api/system' })

  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      version: process.env['npm_package_version'] ?? '1.0.0',
    }
  })

  app.get('/health/ready', async (_request, reply) => {
    const readiness = await buildReadinessResult({
      environment: env.NODE_ENV,
      version: process.env['npm_package_version'] ?? '1.0.0',
    })

    return reply.status(readiness.status === 'ready' ? 200 : 503).send(readiness)
  })

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Podana sciezka API nie istnieje.',
      },
    })
  })

  return app
}

async function main() {
  const app = await buildApp()

  const shutdown = async (signal: string) => {
    app.log.info(`Otrzymano sygnal ${signal} - zamykanie serwera...`)
    try {
      await app.close()
      app.log.info('Serwer zamkniety pomyslnie.')
      process.exit(0)
    } catch (err) {
      app.log.error(err, 'Blad podczas zamykania serwera')
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  try {
    await app.ready()
    await bootstrapSystemCapabilities(app.log)
    logStartupDiagnostics(app)
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`NP-Manager backend uruchomiony na porcie ${env.PORT}`)
    app.log.info(`Srodowisko: ${env.NODE_ENV}`)
  } catch (err) {
    app.log.error(err, 'Blad uruchamiania serwera')
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Krytyczny blad startowy:', err)
    process.exit(1)
  })
}
