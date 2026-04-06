import { describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../error-handler'

function createReply() {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
  }
}

function createRequest() {
  return {
    log: {
      error: vi.fn(),
    },
  }
}

describe('errorHandler', () => {
  it('maps Prisma initialization failures to DATABASE_UNAVAILABLE 503', () => {
    const request = createRequest()
    const reply = createReply()
    const error = Object.assign(new Error('db down'), {
      name: 'PrismaClientInitializationError',
    })

    errorHandler(error, request as never, reply as never)

    expect(reply.status).toHaveBeenCalledWith(503)
    expect(reply.send).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Usluga jest chwilowo niedostepna. Sprobuj ponownie za chwile.',
      },
    })
  })
})
