import { describe, expect, it } from 'vitest'
import {
  computeNotificationHealth,
  type NotificationFailureEventData,
} from '../porting-notification-health.helper'

function makeEvent(
  description: string | null,
  occurredAt: Date = new Date('2026-04-09T10:00:00.000Z'),
): NotificationFailureEventData {
  return { description, occurredAt }
}

describe('computeNotificationHealth', () => {
  it('returns OK status when no events', () => {
    const result = computeNotificationHealth([])
    expect(result.status).toBe('OK')
    expect(result.failureCount).toBe(0)
    expect(result.failedCount).toBe(0)
    expect(result.misconfiguredCount).toBe(0)
    expect(result.lastFailureAt).toBeNull()
    expect(result.lastFailureOutcome).toBeNull()
  })

  it('returns FAILED status for events with FAILED description', () => {
    const events = [makeEvent('Dispatch to email FAILED')]
    const result = computeNotificationHealth(events)
    expect(result.status).toBe('FAILED')
    expect(result.failureCount).toBe(1)
    expect(result.failedCount).toBe(1)
    expect(result.misconfiguredCount).toBe(0)
    expect(result.lastFailureOutcome).toBe('FAILED')
    expect(result.lastFailureAt).not.toBeNull()
  })

  it('returns MISCONFIGURED status for events with MISCONFIGURED description', () => {
    const events = [makeEvent('Dispatch to email MISCONFIGURED — adapter disabled')]
    const result = computeNotificationHealth(events)
    expect(result.status).toBe('MISCONFIGURED')
    expect(result.failureCount).toBe(1)
    expect(result.failedCount).toBe(0)
    expect(result.misconfiguredCount).toBe(1)
    expect(result.lastFailureOutcome).toBe('MISCONFIGURED')
  })

  it('returns MIXED status when both FAILED and MISCONFIGURED events exist', () => {
    const events = [
      makeEvent('Dispatch to email FAILED', new Date('2026-04-09T08:00:00.000Z')),
      makeEvent('Dispatch to teams MISCONFIGURED', new Date('2026-04-09T09:00:00.000Z')),
    ]
    const result = computeNotificationHealth(events)
    expect(result.status).toBe('MIXED')
    expect(result.failureCount).toBe(2)
    expect(result.failedCount).toBe(1)
    expect(result.misconfiguredCount).toBe(1)
  })

  it('picks the most recent event for lastFailureAt and lastFailureOutcome', () => {
    const earlier = new Date('2026-04-09T08:00:00.000Z')
    const later = new Date('2026-04-09T12:00:00.000Z')
    const events = [
      makeEvent('Dispatch FAILED', earlier),
      makeEvent('Dispatch MISCONFIGURED', later),
    ]
    const result = computeNotificationHealth(events)
    expect(result.lastFailureAt).toBe(later.toISOString())
    expect(result.lastFailureOutcome).toBe('MISCONFIGURED')
  })

  it('returns FAILED status when all events have unrecognized descriptions', () => {
    const events = [makeEvent('Some unknown error message'), makeEvent(null)]
    const result = computeNotificationHealth(events)
    expect(result.status).toBe('FAILED')
    expect(result.failureCount).toBe(2)
    expect(result.failedCount).toBe(0)
    expect(result.misconfiguredCount).toBe(0)
  })

  it('counts multiple events of the same type correctly', () => {
    const events = [
      makeEvent('Dispatch FAILED', new Date('2026-04-09T08:00:00.000Z')),
      makeEvent('Dispatch FAILED', new Date('2026-04-09T09:00:00.000Z')),
      makeEvent('Dispatch FAILED', new Date('2026-04-09T10:00:00.000Z')),
    ]
    const result = computeNotificationHealth(events)
    expect(result.status).toBe('FAILED')
    expect(result.failureCount).toBe(3)
    expect(result.failedCount).toBe(3)
    expect(result.misconfiguredCount).toBe(0)
  })

  it('lastFailureAt is an ISO string', () => {
    const date = new Date('2026-04-09T10:30:00.000Z')
    const result = computeNotificationHealth([makeEvent('FAILED', date)])
    expect(result.lastFailureAt).toBe('2026-04-09T10:30:00.000Z')
  })
})
