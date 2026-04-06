import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { env } from '../../config/env'
import { AppError } from './app-error'

function isPrismaDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P1001' || error.code === 'P1002')
  ) {
    return true
  }

  return error instanceof Error && error.name === 'PrismaClientInitializationError'
}

/**
 * Globalny handler bledow dla Fastify.
 *
 * Hierarchia obslugi:
 * 1. AppError       - znany blad biznesowy -> zwraca ustrukturyzowana odpowiedz
 * 2. ZodError       - blad walidacji Zod -> 400 z detalami pol
 * 3. FastifyError   - blad frameworka (np. walidacja schematu) -> 400
 * 4. Prisma init    - baza danych niedostepna -> 503 z czytelnym komunikatem
 * 5. Pozostale      - nieznany blad -> 500 (bez stack trace w odpowiedzi)
 *
 * Zasada: stack trace NIGDY nie trafia do klienta. Tylko do logu serwera.
 */
export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof AppError) {
    if (!error.isOperational) {
      request.log.error({ err: error }, 'Blad nieoperacyjny (bug)')
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

  if (error instanceof ZodError) {
    reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Nieprawidlowe dane wejsciowe. Sprawdz zaznaczone pola.',
        details: error.flatten().fieldErrors,
      },
    })
    return
  }

  const fastifyError = error as FastifyError

  if (fastifyError.validation) {
    reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Nieprawidlowe dane zadania.',
        details: fastifyError.validation,
      },
    })
    return
  }

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

  if (isPrismaDatabaseUnavailableError(error)) {
    request.log.error({ err: error }, 'Baza danych jest niedostepna')

    reply.status(503).send({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message:
          env.NODE_ENV === 'development'
            ? 'Backend dziala, ale nie moze polaczyc sie z lokalna baza danych. Uruchom PostgreSQL, a nastepnie wykonaj migracje i seed.'
            : 'Usluga jest chwilowo niedostepna. Sprobuj ponownie za chwile.',
      },
    })
    return
  }

  request.log.error({ err: error }, 'Nieobsluzony blad serwera')

  reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Wystapil blad serwera. Sprobuj ponownie lub skontaktuj sie z administratorem.',
    },
  })
}
