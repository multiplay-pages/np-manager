import { describe, expect, it } from 'vitest'
import { calculateDaysDiff, getPortingUrgency } from './portingUrgency'

// NOW = wtorek 2026-04-21, godz. 11:00 Warsaw (09:00 UTC)
// ISO week: pon 2026-04-20 - ndz 2026-04-26
const NOW = new Date('2026-04-21T09:00:00.000Z')

describe('calculateDaysDiff', () => {
  it('returns null for missing date', () => {
    expect(calculateDaysDiff(null, NOW)).toBeNull()
    expect(calculateDaysDiff(undefined, NOW)).toBeNull()
    expect(calculateDaysDiff('', NOW)).toBeNull()
  })

  it('returns 0 for same day (Warsaw tz)', () => {
    expect(calculateDaysDiff('2026-04-21', NOW)).toBe(0)
    expect(calculateDaysDiff('2026-04-21T08:00:00.000Z', NOW)).toBe(0)
  })

  it('returns 1 for tomorrow', () => {
    expect(calculateDaysDiff('2026-04-22', NOW)).toBe(1)
  })

  it('returns negative for past dates', () => {
    expect(calculateDaysDiff('2026-04-20', NOW)).toBe(-1)
    expect(calculateDaysDiff('2026-04-10', NOW)).toBe(-11)
  })

  it('handles ISO timestamps with time component', () => {
    expect(calculateDaysDiff('2026-04-23T12:00:00.000Z', NOW)).toBe(2)
  })

  it('handles garbage input gracefully', () => {
    expect(calculateDaysDiff('not-a-date', NOW)).toBeNull()
  })

  it('rejects out-of-range month/day fallback values as null (not normalized)', () => {
    expect(calculateDaysDiff('2026-13-40', NOW)).toBeNull()
    expect(calculateDaysDiff('2026-02-31foo', NOW)).toBeNull()
    expect(calculateDaysDiff('2026-00-01', NOW)).toBeNull()
    expect(calculateDaysDiff('2026-01-00', NOW)).toBeNull()
  })
})

describe('getPortingUrgency', () => {
  it('NONE when no date', () => {
    const urgency = getPortingUrgency(null, NOW)
    expect(urgency.level).toBe('NONE')
    expect(urgency.label).toBe('Brak daty')
    expect(urgency.tone).toBe('neutral')
    expect(urgency.emphasized).toBe(false)
  })

  it('TODAY uses red emphasis', () => {
    const urgency = getPortingUrgency('2026-04-21', NOW)
    expect(urgency.level).toBe('TODAY')
    expect(urgency.label).toBe('Dzis')
    expect(urgency.tone).toBe('red')
    expect(urgency.emphasized).toBe(true)
  })

  it('TOMORROW uses amber without emphasis', () => {
    const urgency = getPortingUrgency('2026-04-22', NOW)
    expect(urgency.level).toBe('TOMORROW')
    expect(urgency.label).toBe('Jutro')
    expect(urgency.tone).toBe('amber')
    expect(urgency.emphasized).toBe(false)
  })

  it('THIS_WEEK covers the current ISO week after tomorrow', () => {
    expect(getPortingUrgency('2026-04-23', NOW).level).toBe('THIS_WEEK')
    expect(getPortingUrgency('2026-04-25', NOW).level).toBe('THIS_WEEK')
    expect(getPortingUrgency('2026-04-26', NOW).level).toBe('THIS_WEEK')

    const urgency = getPortingUrgency('2026-04-25', NOW)
    expect(urgency.label).toBe('W tym tygodniu')
    expect(urgency.tone).toBe('amber')
    expect(urgency.emphasized).toBe(false)
  })

  it('LATER starts with the next ISO week', () => {
    expect(getPortingUrgency('2026-04-27', NOW).level).toBe('LATER')
    expect(getPortingUrgency('2026-04-28', NOW).level).toBe('LATER')
    expect(getPortingUrgency('2026-04-30', NOW).level).toBe('LATER')

    const urgency = getPortingUrgency('2026-04-27', NOW)
    expect(urgency.label).toBe('Pozniej')
    expect(urgency.emphasized).toBe(false)
  })

  it('OVERDUE uses red emphasis and day count', () => {
    const urgency = getPortingUrgency('2026-04-20', NOW)
    expect(urgency.level).toBe('OVERDUE')
    expect(urgency.label).toContain('Po terminie')
    expect(urgency.label).toContain('1 dzien')
    expect(urgency.tone).toBe('red')
    expect(urgency.emphasized).toBe(true)
  })

  it('OVERDUE pluralizes multi-day offsets', () => {
    expect(getPortingUrgency('2026-04-18', NOW).label).toContain('3 dni')
    expect(getPortingUrgency('2026-04-14', NOW).label).toContain('7 dni')
  })
})
