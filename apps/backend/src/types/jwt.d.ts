/**
 * Augmentacja typów @fastify/jwt.
 *
 * Definiuje kształt payloadu JWT i obiektu request.user.
 * Token zawiera wyłącznie id i role — minimum potrzebne do autoryzacji,
 * bez wrażliwych danych (email, imię, etc.).
 *
 * Plik musi być widoczny dla tsc (objęty przez "include" w tsconfig).
 */
import type {} from '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    /** Dane wpisywane do tokenu przy jwt.sign() */
    payload: {
      id: string
      role: string
    }
    /** Dane dostępne jako request.user po jwtVerify() */
    user: {
      id: string
      role: string
    }
  }
}
