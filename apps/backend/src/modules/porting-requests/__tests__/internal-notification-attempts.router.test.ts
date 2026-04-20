import { describe, expect, it } from 'vitest'
import { globalInternalNotificationAttemptsQuerySchema } from '../internal-notification-attempts.router'

describe('globalInternalNotificationAttemptsQuerySchema', () => {
  it('uses default pagination', () => {
    const result = globalInternalNotificationAttemptsQuerySchema.parse({})

    expect(result).toEqual({
      limit: 50,
      offset: 0,
    })
  })

  it('coerces limit and offset query params', () => {
    const result = globalInternalNotificationAttemptsQuerySchema.parse({
      limit: '25',
      offset: '50',
    })

    expect(result).toEqual({
      limit: 25,
      offset: 50,
    })
  })

  it('accepts operational filters', () => {
    const result = globalInternalNotificationAttemptsQuerySchema.parse({
      outcome: 'FAILED',
      channel: 'TEAMS',
      retryableOnly: 'true',
    })

    expect(result).toEqual({
      outcome: 'FAILED',
      channel: 'TEAMS',
      retryableOnly: true,
      limit: 50,
      offset: 0,
    })
  })

  it('treats retryableOnly=false as no retryable-only filter', () => {
    const result = globalInternalNotificationAttemptsQuerySchema.parse({
      retryableOnly: 'false',
    })

    expect(result.retryableOnly).toBe(false)
  })

  it('rejects unknown outcome values', () => {
    expect(() =>
      globalInternalNotificationAttemptsQuerySchema.parse({
        outcome: 'UNKNOWN',
      }),
    ).toThrow()
  })
})
