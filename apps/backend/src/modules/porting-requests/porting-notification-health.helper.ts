// This helper computes notification health diagnostics from failure events.
// Single place of truth for all health computation logic.

export type NotificationHealthStatus = 'OK' | 'FAILED' | 'MISCONFIGURED' | 'MIXED'
export type NotificationFailureOutcome = 'FAILED' | 'MISCONFIGURED'

export interface NotificationFailureEventData {
  description: string | null
  occurredAt: Date
}

export interface NotificationHealthResult {
  status: NotificationHealthStatus
  failureCount: number
  failedCount: number
  misconfiguredCount: number
  lastFailureAt: string | null
  lastFailureOutcome: NotificationFailureOutcome | null
}

function detectOutcome(description: string | null): NotificationFailureOutcome | null {
  if (!description) return null
  // Check MISCONFIGURED first since it does not contain 'FAILED' as substring.
  if (description.includes('MISCONFIGURED')) return 'MISCONFIGURED'
  if (description.includes('FAILED')) return 'FAILED'
  return null
}

export function computeNotificationHealth(
  events: NotificationFailureEventData[],
): NotificationHealthResult {
  if (events.length === 0) {
    return {
      status: 'OK',
      failureCount: 0,
      failedCount: 0,
      misconfiguredCount: 0,
      lastFailureAt: null,
      lastFailureOutcome: null,
    }
  }

  let failedCount = 0
  let misconfiguredCount = 0
  let lastFailureAt: Date | null = null
  let lastFailureOutcome: NotificationFailureOutcome | null = null

  for (const event of events) {
    const outcome = detectOutcome(event.description)
    if (outcome === 'FAILED') failedCount++
    else if (outcome === 'MISCONFIGURED') misconfiguredCount++

    if (lastFailureAt === null || event.occurredAt > lastFailureAt) {
      lastFailureAt = event.occurredAt
      lastFailureOutcome = outcome
    }
  }

  let status: NotificationHealthStatus
  if (failedCount > 0 && misconfiguredCount > 0) {
    status = 'MIXED'
  } else if (failedCount > 0) {
    status = 'FAILED'
  } else if (misconfiguredCount > 0) {
    status = 'MISCONFIGURED'
  } else {
    // All events had unrecognized descriptions - treat as failures
    status = 'FAILED'
  }

  return {
    status,
    failureCount: events.length,
    failedCount,
    misconfiguredCount,
    lastFailureAt: lastFailureAt ? lastFailureAt.toISOString() : null,
    lastFailureOutcome,
  }
}
