import { describe, expect, it } from 'vitest'
import { deriveOperationalStatus } from './notificationFailureQueueOperationalStatus'

function makeInput(
  overrides: Partial<Parameters<typeof deriveOperationalStatus>[0]> = {},
): Parameters<typeof deriveOperationalStatus>[0] {
  return {
    outcome: 'FAILED',
    failureKind: 'DELIVERY',
    canRetry: true,
    retryBlockedReasonCode: null,
    ...overrides,
  }
}

describe('deriveOperationalStatus', () => {
  it('MISCONFIGURED outcome → MANUAL_INTERVENTION_REQUIRED', () => {
    expect(deriveOperationalStatus(makeInput({ outcome: 'MISCONFIGURED', failureKind: null }))).toBe(
      'MANUAL_INTERVENTION_REQUIRED',
    )
  })

  it('FAILED + CONFIGURATION failureKind → MANUAL_INTERVENTION_REQUIRED', () => {
    expect(
      deriveOperationalStatus(makeInput({ outcome: 'FAILED', failureKind: 'CONFIGURATION' })),
    ).toBe('MANUAL_INTERVENTION_REQUIRED')
  })

  it('FAILED + POLICY failureKind → MANUAL_INTERVENTION_REQUIRED', () => {
    expect(
      deriveOperationalStatus(makeInput({ outcome: 'FAILED', failureKind: 'POLICY' })),
    ).toBe('MANUAL_INTERVENTION_REQUIRED')
  })

  it('FAILED + DELIVERY + canRetry=true → RETRY_AVAILABLE', () => {
    expect(
      deriveOperationalStatus(
        makeInput({ outcome: 'FAILED', failureKind: 'DELIVERY', canRetry: true }),
      ),
    ).toBe('RETRY_AVAILABLE')
  })

  it('FAILED + DELIVERY + RETRY_LIMIT_REACHED → RETRY_BLOCKED_EXHAUSTED', () => {
    expect(
      deriveOperationalStatus(
        makeInput({
          outcome: 'FAILED',
          failureKind: 'DELIVERY',
          canRetry: false,
          retryBlockedReasonCode: 'RETRY_LIMIT_REACHED',
        }),
      ),
    ).toBe('RETRY_BLOCKED_EXHAUSTED')
  })

  it('FAILED + DELIVERY + NOT_LATEST_IN_CHAIN → RETRY_BLOCKED_OTHER', () => {
    expect(
      deriveOperationalStatus(
        makeInput({
          outcome: 'FAILED',
          failureKind: 'DELIVERY',
          canRetry: false,
          retryBlockedReasonCode: 'NOT_LATEST_IN_CHAIN',
        }),
      ),
    ).toBe('RETRY_BLOCKED_OTHER')
  })

  it('FAILED + DELIVERY + ORIGIN_NOT_RETRYABLE → RETRY_BLOCKED_OTHER', () => {
    expect(
      deriveOperationalStatus(
        makeInput({
          outcome: 'FAILED',
          failureKind: 'DELIVERY',
          canRetry: false,
          retryBlockedReasonCode: 'ORIGIN_NOT_RETRYABLE',
        }),
      ),
    ).toBe('RETRY_BLOCKED_OTHER')
  })

  it('FAILED + null failureKind + canRetry=true → RETRY_AVAILABLE', () => {
    expect(
      deriveOperationalStatus(
        makeInput({ outcome: 'FAILED', failureKind: null, canRetry: true }),
      ),
    ).toBe('RETRY_AVAILABLE')
  })

  it('edge case: MISCONFIGURED + canRetry=true → still MANUAL_INTERVENTION_REQUIRED', () => {
    expect(
      deriveOperationalStatus(
        makeInput({ outcome: 'MISCONFIGURED', canRetry: true, retryBlockedReasonCode: null }),
      ),
    ).toBe('MANUAL_INTERVENTION_REQUIRED')
  })

  it('FAILED + null failureKind + RETRY_LIMIT_REACHED → RETRY_BLOCKED_EXHAUSTED', () => {
    expect(
      deriveOperationalStatus(
        makeInput({
          outcome: 'FAILED',
          failureKind: null,
          canRetry: false,
          retryBlockedReasonCode: 'RETRY_LIMIT_REACHED',
        }),
      ),
    ).toBe('RETRY_BLOCKED_EXHAUSTED')
  })

  it('FAILED + CONFIGURATION + canRetry=true → MANUAL_INTERVENTION_REQUIRED (config takes priority)', () => {
    expect(
      deriveOperationalStatus(
        makeInput({ outcome: 'FAILED', failureKind: 'CONFIGURATION', canRetry: true }),
      ),
    ).toBe('MANUAL_INTERVENTION_REQUIRED')
  })
})
