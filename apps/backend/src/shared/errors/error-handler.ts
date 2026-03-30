import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from './app-error'

/**
 * Globalny handler błędów dla Fastify.
 *
 * Hierarchia obsługi:
 * 1. AppError       — znany błąd biznesowy → zwraca ustrukturyzowaną odpowiedź
 * 2. ZodError       — błąd walidacji Zod → 400 z detalami pól
 * 3. FastifyError   — błąd frameworka (np. walidacja schematu) → 400
 * 4. Pozostałe      — nieznany błąd → 500 (bez stack trace w odpowiedzi)
 *
 * Zasada: stack trace NIGDY nie trafia do klienta. Tylko do logu serwera.
 */
export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  // 1. Znany błąd aplikacyjny
  if (error instanceof AppError) {
    if (!error.isOperational) {
      request.log.error({ err: error }, 'Błąd nieoperacyjny (bug)')
    }

    reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    })
    return
  }

  // 2. Błąd walidacji Zod
  if (error instanceof ZodError) {
    reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Nieprawidłowe dane wejściowe. Sprawdź zaznaczone pola.',
        details: error.flatten().fieldErrors,
      },
    })
    return
  }

  // 3. Błąd walidacji schematu Fastify (JSON Schema)
  const fastifyError = error as FastifyError
  if (fastifyError.validation) {
    reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Nieprawidłowe dane żądania.',
        details: fastifyError.validation,
      },
    })
    return
  }

  // 4. Błąd 404 Fastify (nie znaleziono trasy)
  if (fastifyError.statusCode === 404) {
    reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Nie znaleziono zasobu.',
      },
    })
    return
  }

  // 5. Nieznany błąd — loguj pełny stack, klientowi zwróć ogólny komunikat
  request.log.error({ err: error }, 'Nieobsłużony błąd serwera')

  reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Wystąpił błąd serwera. Spróbuj ponownie lub skontaktuj się z administratorem.',
    },
  })
}
