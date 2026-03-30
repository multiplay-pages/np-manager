import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { env } from './config/env'
import { loggerConfig } from './config/logger'
import { errorHandler } from './shared/errors/error-handler'
import { authRouter } from './modules/auth/auth.router'
import { usersRouter } from './modules/users/users.router'
import { clientsRouter } from './modules/clients/clients.router'
import { operatorsRouter } from './modules/operators/operators.router'

/**
 * Buduje i konfiguruje instancję aplikacji Fastify.
 * Wyeksportowana funkcja umożliwia łatwe testowanie (test helper tworzy osobną instancję).
 */
export async function buildApp() {
  const app = Fastify({
    logger: loggerConfig,
    // Generuj unikalny requestId dla każdego żądania (przydatne w logach i błędach 500)
    genReqId: () => crypto.randomUUID(),
  })

  // ============================================================
  // Pluginy globalne
  // ============================================================

  await app.register(cors, {
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })

  // JWT — musi być zarejestrowany przed routerami używającymi jwtVerify/jwt.sign
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  })

  // ============================================================
  // Globalny error handler
  // ============================================================
  app.setErrorHandler(errorHandler)

  // ============================================================
  // Moduły API
  // ============================================================

  await app.register(authRouter, { prefix: '/api/auth' })
  await app.register(usersRouter, { prefix: '/api/users' })
  await app.register(clientsRouter, { prefix: '/api/clients' })
  await app.register(operatorsRouter, { prefix: '/api/operators' })

  // ============================================================
  // Trasy systemowe
  // ============================================================

  /** Health check — używany przez load balancer i monitoring */
  app.get('/health', async (_request, _reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      version: process.env['npm_package_version'] ?? '1.0.0',
    }
  })

  /** Obsługa nieznanych tras — zwraca 404 z ustrukturyzowaną odpowiedzią */
  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Podana ścieżka API nie istnieje.',
      },
    })
  })

  return app
}

/**
 * Punkt startowy aplikacji.
 * Uruchamia serwer i obsługuje graceful shutdown.
 */
async function main() {
  const app = await buildApp()

  const shutdown = async (signal: string) => {
    app.log.info(`Otrzymano sygnał ${signal} — zamykanie serwera...`)
    try {
      await app.close()
      app.log.info('Serwer zamknięty pomyślnie.')
      process.exit(0)
    } catch (err) {
      app.log.error(err, 'Błąd podczas zamykania serwera')
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`NP-Manager backend uruchomiony na porcie ${env.PORT}`)
    app.log.info(`Środowisko: ${env.NODE_ENV}`)
  } catch (err) {
    app.log.error(err, 'Błąd uruchamiania serwera')
    process.exit(1)
  }
}

// Uruchom tylko jeśli to jest plik główny (nie import w testach)
main().catch((err) => {
  console.error('Krytyczny błąd startowy:', err)
  process.exit(1)
})
