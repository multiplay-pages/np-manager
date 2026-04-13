import { describe, expect, it } from 'vitest'
import { globalFailureQueueQuerySchema } from '../internal-notification-failures.router'

describe('globalFailureQueueQuerySchema', () => {
  it.each([
    'RETRY_AVAILABLE',
    'RETRY_BLOCKED_EXHAUSTED',
    'RETRY_BLOCKED_OTHER',
    'MANUAL_INTERVENTION_REQUIRED',
  ] as const)('accepts operationalStatus=%s', (operationalStatus) => {
    const result = globalFailureQueueQuerySchema.parse({ operationalStatus })

    expect(result.operationalStatus).toBe(operationalStatus)
    expect(result.outcome).toEqual(['FAILED', 'MISCONFIGURED'])
  })
})
