import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockQueryRaw } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
}))

vi.mock('../config/database', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}))

vi.mock('../modules/auth/auth.router', () => ({
  authRouter: async () => {},
}))

vi.mock('../modules/users/users.router', () => ({
  usersRouter: async () => {},
}))

vi.mock('../modules/clients/clients.router', () => ({
  clientsRouter: async () => {},
}))

vi.mock('../modules/operators/operators.router', () => ({
  operatorsRouter: async () => {},
}))

vi.mock('../modules/porting-requests/porting-requests.router', () => ({
  portingRequestsRouter: async () => {},
}))

import { buildApp } from '../app'

describe('health and readiness endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryRaw.mockReset()
    mockQueryRaw.mockResolvedValueOnce([{ '?column?': 1 }]).mockResolvedValueOnce([
      { table_name: 'porting_request_case_history' },
    ])
  })

  it('GET /health returns liveness without checking DB', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        status: 'ok',
        environment: 'test',
      })
      expect(mockQueryRaw).not.toHaveBeenCalled()
    } finally {
      await app.close()
    }
  })

  it('GET /health/ready returns 200 when DB is ready', async () => {
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({
        status: 'ready',
        environment: 'test',
        checks: {
          db: {
            status: 'up',
            message: 'Database connection is ready.',
          },
        },
      })
      expect(mockQueryRaw).toHaveBeenCalledTimes(2)
    } finally {
      await app.close()
    }
  })

  it('GET /health/ready returns 503 when DB is unavailable', async () => {
    mockQueryRaw.mockReset()
    mockQueryRaw.mockRejectedValue(new Error('db unavailable'))
    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      })

      expect(response.statusCode).toBe(503)
      expect(response.json()).toMatchObject({
        status: 'not_ready',
        environment: 'test',
        checks: {
          db: {
            status: 'down',
            message: 'Database connection is unavailable.',
          },
        },
      })
    } finally {
      await app.close()
    }
  })

  it('GET /health/ready returns 503 when required schema table is missing', async () => {
    mockQueryRaw.mockReset()
    mockQueryRaw
      .mockResolvedValueOnce([{ '?column?': 1 }])
      .mockResolvedValueOnce([])

    const app = await buildApp()

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      })

      expect(response.statusCode).toBe(503)
      expect(response.json()).toMatchObject({
        status: 'not_ready',
        environment: 'test',
        checks: {
          db: {
            status: 'down',
            message:
              'Database schema is incomplete. Missing required tables: porting_request_case_history.',
          },
        },
      })
    } finally {
      await app.close()
    }
  })
})
