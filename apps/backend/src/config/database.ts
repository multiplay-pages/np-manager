import { PrismaClient } from '@prisma/client'
import { env } from './env'

/**
 * Singleton Prisma Client.
 *
 * W trybie development: loguje zapytania SQL do konsoli (poziom query).
 * W trybie production:  loguje tylko błędy i ostrzeżenia.
 *
 * Singleton zapobiega tworzeniu wielu połączeń z bazą podczas hot reload (dev).
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ],
  })

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
