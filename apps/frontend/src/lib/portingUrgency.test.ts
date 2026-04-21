import { describe, expect, it } from 'vitest'
import { getPortingUrgency, calculateDaysDiff } from './portingUrgency'

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
})

describe('getPortingUrgency', () => {
  it('NONE when no date', () => {
    const u = getPortingUrgency(null, NOW)
    expect(u.level).toBe('NONE')
    expect(u.label).toBe('Brak daty')
    expect(u.tone).toBe('neutral')
    expect(u.emphasized).toBe(false)
  })

  it('TODAY with red + emphasized', () => {
    const u = getPortingUrgency('2026-04-21', NOW)
    expect(u.level).toBe('TODAY')
    expect(u.label).toBe('Dziś')
    expect(u.tone).toBe('red')
    expect(u.emphasized).toBe(true)
  })

  it('TOMORROW with amber', () => {
    const u = getPortingUrgency('2026-04-22', NOW)
    expect(u.level).toBe('TOMORROW')
    expect(u.label).toBe('Jutro')
    expect(u.tone).toBe('amber')
    expect(u.emphasized).toBe(false)
  })

  it('THIS_WEEK for 2-7 days out', () => {
    expect(getPortingUrgency('2026-04-23', NOW).level).toBe('THIS_WEEK')
    expect(getPortingUrgency('2026-04-28', NOW).level).toBe('THIS_WEEK')
    const u = getPortingUrgency('2026-04-25', NOW)
    expect(u.label).toBe('W tym tygodniu')
    expect(u.tone).toBe('amber')
  })

  it('LATER for > 7 days out', () => {
    const u = getPortingUrgency('2026-04-30', NOW)
    expect(u.level).toBe('LATER')
    expect(u.label).toBe('Później')
    expect(u.emphasized).toBe(false)
  })

  it('OVERDUE for past date', () => {
    const u = getPortingUrgency('2026-04-20', NOW)
    expect(u.level).toBe('OVERDUE')
    expect(u.label).toContain('Po terminie')
    expect(u.label).toContain('1 dzień')
    expect(u.tone).toBe('red')
    expect(u.emphasized).toBe(true)
  })

  it('OVERDUE uses plural for multiple days', () => {
    expect(getPortingUrgency('2026-04-18', NOW).label).toContain('3 dni')
    expect(getPortingUrgency('2026-04-14', NOW).label).toContain('7 dni')
  })
})
