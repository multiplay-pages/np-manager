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

  it('accepts outcome filter', () => {
    const result = globalInternalNotificationAttemptsQuerySchema.parse({
      outcome: 'FAILED',
    })

    expect(result.outcome).toBe('FAILED')
  })

  it('accepts channel filter', () => {
    const result = globalInternalNotificationAttemptsQuerySchema.parse({
      channel: 'TEAMS',
    })

    expect(result.channel).toBe('TEAMS')
  })

  it('coerces retryableOnly=true to boolean true', () => {
    const result = globalInternalNotificationAttemptsQuerySchema.parse({
      retryableOnly: 'true',
    })

    expect(result.retryableOnly).toBe(true)
  })

  it('coerces retryableOnly=false to boolean false', () => {
    const result = globalInternalNotificationAttemptsQuerySchema.parse({
      retryableOnly: 'false',
    })

    expect(result.retryableOnly).toBe(false)
  })

  it('rejects unknown retryableOnly values', () => {
    expect(() =>
      globalInternalNotificationAttemptsQuerySchema.parse({
        retryableOnly: 'not-a-boolean',
      }),
    ).toThrow()
  })

  it('rejects unknown outcome values', () => {
    expect(() =>
      globalInternalNotificationAttemptsQuerySchema.parse({
        outcome: 'UNKNOWN',
      }),
    ).toThrow()
  })
})
