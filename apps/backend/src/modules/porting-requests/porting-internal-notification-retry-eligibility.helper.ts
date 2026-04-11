import type {
  InternalNotificationRetryBlockedReasonCodeDto,
} from '@np-manager/shared'

interface RetryEligibilityAttempt {
  attemptOrigin: string
  outcome: string
  isLatestForChain: boolean
  retryCount: number
}

export interface InternalNotificationRetryEligibility {
  canRetry: boolean
  retryBlockedReasonCode: InternalNotificationRetryBlockedReasonCodeDto | null
}

export function resolveInternalNotificationRetryEligibility(
  attempt: RetryEligibilityAttempt,
): InternalNotificationRetryEligibility {
  if (attempt.attemptOrigin !== 'PRIMARY' && attempt.attemptOrigin !== 'RETRY') {
    return {
      canRetry: false,
      retryBlockedReasonCode: 'ORIGIN_NOT_RETRYABLE',
    }
  }

  if (attempt.outcome !== 'FAILED' && attempt.outcome !== 'MISCONFIGURED') {
    return {
      canRetry: false,
      retryBlockedReasonCode: 'OUTCOME_NOT_RETRYABLE',
    }
  }

  if (!attempt.isLatestForChain) {
    return {
      canRetry: false,
      retryBlockedReasonCode: 'NOT_LATEST_IN_CHAIN',
    }
  }

  if (attempt.retryCount >= 3) {
    return {
      canRetry: false,
      retryBlockedReasonCode: 'RETRY_LIMIT_REACHED',
    }
  }

  return {
    canRetry: true,
    retryBlockedReasonCode: null,
  }
}
