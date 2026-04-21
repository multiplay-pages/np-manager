import { describe, expect, it } from 'vitest'
import { getPortingUrgency, calculateDaysDiff } from './portingUrgency'

// NOW = wtorek 2026-04-21, godz. 11:00 Warsaw (09:00 UTC)
// ISO week: pon 2026-04-20 – ndz 2026-04-26
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
    // These all fail new Date() and hit the regex fallback.
    // Without the round-trip check they would be silently normalized by Date.UTC.
    expect(calculateDaysDiff('2026-13-40', NOW)).toBeNull()    // month 13
    expect(calculateDaysDiff('2026-02-31foo', NOW)).toBeNull() // day 31 in Feb (suffix breaks new Date)
    expect(calculateDaysDiff('2026-00-01', NOW)).toBeNull()    // month 0
    expect(calculateDaysDiff('2026-01-00', NOW)).toBeNull()    // day 0
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

  it('TODAY — czerwony i emfaza', () => {
    const u = getPortingUrgency('2026-04-21', NOW)
    expect(u.level).toBe('TODAY')
    expect(u.label).toBe('Dziś')
    expect(u.tone).toBe('red')
    expect(u.emphasized).toBe(true)
  })

  it('TOMORROW — amber, bez emfazy', () => {
    const u = getPortingUrgency('2026-04-22', NOW)
    expect(u.level).toBe('TOMORROW')
    expect(u.label).toBe('Jutro')
    expect(u.tone).toBe('amber')
    expect(u.emphasized).toBe(false)
  })

  it('THIS_WEEK — ten sam tydzień ISO (pon–ndz), po jutrze', () => {
    // czwartek (diff=2)
    expect(getPortingUrgency('2026-04-23', NOW).level).toBe('THIS_WEEK')
    // sobota (diff=4)
    expect(getPortingUrgency('2026-04-25', NOW).level).toBe('THIS_WEEK')
    // niedziela = ostatni dzień bieżącego tygodnia ISO (diff=5)
    expect(getPortingUrgency('2026-04-26', NOW).level).toBe('THIS_WEEK')

    const u = getPortingUrgency('2026-04-25', NOW)
    expect(u.label).toBe('W tym tygodniu')
    expect(u.tone).toBe('amber')
    expect(u.emphasized).toBe(false)
  })

  it('LATER — następny poniedziałek to już inny tydzień ISO', () => {
    // poniedziałek następnego tygodnia (diff=6) — nie „W tym tygodniu"
    expect(getPortingUrgency('2026-04-27', NOW).level).toBe('LATER')
    // wtorek następnego tygodnia (diff=7) — stary kod błędnie dawał THIS_WEEK
    expect(getPortingUrgency('2026-04-28', NOW).level).toBe('LATER')
    // dalej
    expect(getPortingUrgency('2026-04-30', NOW).level).toBe('LATER')

    const u = getPortingUrgency('2026-04-27', NOW)
    expect(u.label).toBe('Później')
    expect(u.emphasized).toBe(false)
  })

  it('OVERDUE — czerwony i emfaza', () => {
    const u = getPortingUrgency('2026-04-20', NOW)
    expect(u.level).toBe('OVERDUE')
    expect(u.label).toContain('Po terminie')
    expect(u.label).toContain('1 dzień')
    expect(u.tone).toBe('red')
    expect(u.emphasized).toBe(true)
  })

  it('OVERDUE — odmiana liczby dni', () => {
    expect(getPortingUrgency('2026-04-18', NOW).label).toContain('3 dni')
    expect(getPortingUrgency('2026-04-14', NOW).label).toContain('7 dni')
  })
})
