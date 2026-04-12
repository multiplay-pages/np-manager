import type { GlobalNotificationFailureQueueItemDto } from '@np-manager/shared'

export type OperationalStatus =
  | 'RETRY_AVAILABLE'
  | 'RETRY_BLOCKED_EXHAUSTED'
  | 'RETRY_BLOCKED_OTHER'
  | 'MANUAL_INTERVENTION_REQUIRED'

type StatusInput = Pick<
  GlobalNotificationFailureQueueItemDto,
  'outcome' | 'failureKind' | 'canRetry' | 'retryBlockedReasonCode'
>

export function deriveOperationalStatus(item: StatusInput): OperationalStatus {
  // MISCONFIGURED outcome or configuration/policy failure kind signals that retrying
  // alone won't help — the operator needs to fix a config or policy first.
  // Note: failureKind=POLICY is an operational heuristic for v1. Policy failures
  // often require human decisions (e.g. operator rule changes), not just a retry.
  if (
    item.outcome === 'MISCONFIGURED' ||
    item.failureKind === 'CONFIGURATION' ||
    item.failureKind === 'POLICY'
  ) {
    return 'MANUAL_INTERVENTION_REQUIRED'
  }

  if (item.canRetry) return 'RETRY_AVAILABLE'
  if (item.retryBlockedReasonCode === 'RETRY_LIMIT_REACHED') return 'RETRY_BLOCKED_EXHAUSTED'
  return 'RETRY_BLOCKED_OTHER'
}

export const OPERATIONAL_STATUS_CONFIG: Record<
  OperationalStatus,
  { label: string; badgeClass: string; rowAccentClass: string }
> = {
  RETRY_AVAILABLE: {
    label: 'Gotowy do ponowienia',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    rowAccentClass: 'border-l-4 border-l-emerald-400',
  },
  RETRY_BLOCKED_EXHAUSTED: {
    label: 'Limit wyczerpany',
    badgeClass: 'bg-red-100 text-red-700',
    rowAccentClass: 'border-l-4 border-l-red-400',
  },
  RETRY_BLOCKED_OTHER: {
    label: 'Zablokowany',
    badgeClass: 'bg-gray-100 text-gray-600',
    rowAccentClass: '',
  },
  MANUAL_INTERVENTION_REQUIRED: {
    label: 'Wymaga interwencji',
    badgeClass: 'bg-orange-100 text-orange-700',
    rowAccentClass: 'border-l-4 border-l-orange-400',
  },
}
