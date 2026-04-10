import { SYSTEM_SETTING_KEYS, type NotificationFallbackReadiness } from '@np-manager/shared'
import { prisma } from '../../config/database'
import type { InternalNotificationDispatchResult } from './internal-notification.adapter'
import type { NotificationFailureOutcome } from './porting-notification-health.helper'

export interface NotificationFallbackPolicy {
  fallbackEnabled: boolean
  fallbackRecipientEmail: string
  fallbackRecipientName: string
  applyToFailed: boolean
  applyToMisconfigured: boolean
  readiness: NotificationFallbackReadiness
}

export type NotificationErrorFallbackReason =
  | 'TRIGGERED'
  | 'NO_FAILURE_OUTCOMES'
  | 'POLICY_DISABLED'
  | 'POLICY_INCOMPLETE'
  | 'OUTCOME_NOT_ENABLED'

export interface NotificationErrorFallbackDecision {
  shouldTrigger: boolean
  reason: NotificationErrorFallbackReason
  failureOutcomes: NotificationFailureOutcome[]
  matchedOutcomes: NotificationFailureOutcome[]
}

const FALLBACK_SETTING_DEFAULTS = {
  fallbackEnabled: 'false',
  fallbackRecipientEmail: '',
  fallbackRecipientName: '',
  applyToFailed: 'true',
  applyToMisconfigured: 'true',
} as const

export async function resolveNotificationFallbackPolicy(): Promise<NotificationFallbackPolicy> {
  const [enabledRaw, recipientEmail, recipientName, applyToFailedRaw, applyToMisconfiguredRaw] =
    await Promise.all([
      readSetting(SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_ENABLED, FALLBACK_SETTING_DEFAULTS.fallbackEnabled),
      readSetting(
        SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_EMAIL,
        FALLBACK_SETTING_DEFAULTS.fallbackRecipientEmail,
      ),
      readSetting(
        SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_NAME,
        FALLBACK_SETTING_DEFAULTS.fallbackRecipientName,
      ),
      readSetting(
        SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_FAILED,
        FALLBACK_SETTING_DEFAULTS.applyToFailed,
      ),
      readSetting(
        SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_MISCONFIGURED,
        FALLBACK_SETTING_DEFAULTS.applyToMisconfigured,
      ),
    ])

  const fallbackEnabled = parseBooleanSetting(enabledRaw)
  const applyToFailed = parseBooleanSetting(applyToFailedRaw)
  const applyToMisconfigured = parseBooleanSetting(applyToMisconfiguredRaw)

  return {
    fallbackEnabled,
    fallbackRecipientEmail: recipientEmail.trim(),
    fallbackRecipientName: recipientName.trim(),
    applyToFailed,
    applyToMisconfigured,
    readiness: computeReadiness(fallbackEnabled, recipientEmail),
  }
}

export function extractFailureOutcomesFromDispatch(
  results: InternalNotificationDispatchResult[],
): NotificationFailureOutcome[] {
  const outcomes = new Set<NotificationFailureOutcome>()

  for (const result of results) {
    if (result.outcome === 'FAILED' || result.outcome === 'MISCONFIGURED') {
      outcomes.add(result.outcome)
    }
  }

  return [...outcomes]
}

export function decideNotificationErrorFallback(
  policy: NotificationFallbackPolicy,
  failureOutcomes: NotificationFailureOutcome[],
): NotificationErrorFallbackDecision {
  if (failureOutcomes.length === 0) {
    return {
      shouldTrigger: false,
      reason: 'NO_FAILURE_OUTCOMES',
      failureOutcomes,
      matchedOutcomes: [],
    }
  }

  if (policy.readiness === 'DISABLED') {
    return {
      shouldTrigger: false,
      reason: 'POLICY_DISABLED',
      failureOutcomes,
      matchedOutcomes: [],
    }
  }

  if (policy.readiness === 'INCOMPLETE') {
    return {
      shouldTrigger: false,
      reason: 'POLICY_INCOMPLETE',
      failureOutcomes,
      matchedOutcomes: [],
    }
  }

  const matchedOutcomes = failureOutcomes.filter((outcome) => {
    if (outcome === 'FAILED') return policy.applyToFailed
    return policy.applyToMisconfigured
  })

  if (matchedOutcomes.length === 0) {
    return {
      shouldTrigger: false,
      reason: 'OUTCOME_NOT_ENABLED',
      failureOutcomes,
      matchedOutcomes: [],
    }
  }

  return {
    shouldTrigger: true,
    reason: 'TRIGGERED',
    failureOutcomes,
    matchedOutcomes,
  }
}

async function readSetting(key: string, fallbackValue: string): Promise<string> {
  const result = await prisma.systemSetting.findUnique({
    where: { key },
    select: { value: true },
  })

  return result?.value ?? fallbackValue
}

function parseBooleanSetting(rawValue: string): boolean {
  const normalized = rawValue.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
}

function computeReadiness(
  fallbackEnabled: boolean,
  fallbackRecipientEmail: string,
): NotificationFallbackReadiness {
  if (!fallbackEnabled) return 'DISABLED'
  if (!fallbackRecipientEmail.trim()) return 'INCOMPLETE'
  return 'READY'
}
