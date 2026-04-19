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
})
