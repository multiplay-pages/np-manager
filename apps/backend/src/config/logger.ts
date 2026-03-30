import type { FastifyBaseLogger } from 'fastify'
import { env } from './env'

/**
 * Konfiguracja loggera Pino dla Fastify.
 *
 * W trybie development: czytelny output z kolorami (pino-pretty).
 * W trybie production:  JSON structured logging (wydajny, do agregatora logów).
 */
export const loggerConfig =
  env.NODE_ENV === 'development'
    ? {
        level: env.LOG_LEVEL,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            messageFormat: '[{context}] {msg}',
          },
        },
      }
    : {
        level: env.LOG_LEVEL,
        // Produkcja: czysty JSON — bez transportu (najwydajniejszy)
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie'],
          censor: '[REDACTED]',
        },
      }

// Typ pomocniczy do użycia loggera poza kontekstem Fastify
export type AppLogger = FastifyBaseLogger
