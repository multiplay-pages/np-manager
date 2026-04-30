import { describe, it, expect } from 'vitest'
import { getRequestRowHighlight, rowHighlightClasses } from './requestRowHighlight'

const NOW = new Date('2026-04-30T12:00:00.000Z')

function makeRequest(
  statusInternal: string,
  confirmedPortDate: string | null = null,
) {
  return { statusInternal, confirmedPortDate } as {
    statusInternal: Parameters<typeof getRequestRowHighlight>[0]['statusInternal']
    confirmedPortDate: string | null
  }
}

describe('getRequestRowHighlight', () => {
  it('PORTED with past date -> ported (calm blue)', () => {
    expect(getRequestRowHighlight(makeRequest('PORTED', '2026-04-01'), NOW)).toBe('ported')
  })

  it('PORTED with no date -> ported (calm blue, overrides no-date)', () => {
    expect(getRequestRowHighlight(makeRequest('PORTED', null), NOW)).toBe('ported')
  })

  it('PORTED with overdue date -> ported (calm blue, overrides overdue)', () => {
    expect(getRequestRowHighlight(makeRequest('PORTED', '2026-01-01'), NOW)).toBe('ported')
  })

  it('active case with today date -> today (blue)', () => {
    expect(getRequestRowHighlight(makeRequest('CONFIRMED', '2026-04-30'), NOW)).toBe('today')
  })

  it('active case with tomorrow date -> tomorrow (yellow)', () => {
    expect(getRequestRowHighlight(makeRequest('SUBMITTED', '2026-05-01'), NOW)).toBe('tomorrow')
  })

  it('active case with day after tomorrow -> none', () => {
    expect(getRequestRowHighlight(makeRequest('PENDING_DONOR', '2026-05-02'), NOW)).toBe('none')
  })

  it('active case with overdue date -> overdue (alarm red)', () => {
    expect(getRequestRowHighlight(makeRequest('SUBMITTED', '2026-04-01'), NOW)).toBe('overdue')
  })

  it('active case with no date -> none', () => {
    expect(getRequestRowHighlight(makeRequest('SUBMITTED', null), NOW)).toBe('none')
  })

  it('active case with date far in future -> none', () => {
    expect(getRequestRowHighlight(makeRequest('CONFIRMED', '2026-06-15'), NOW)).toBe('none')
  })

  it('CANCELLED -> closed (neutral)', () => {
    expect(getRequestRowHighlight(makeRequest('CANCELLED', '2026-04-01'), NOW)).toBe('closed')
  })

  it('REJECTED -> closed (neutral)', () => {
    expect(getRequestRowHighlight(makeRequest('REJECTED', null), NOW)).toBe('closed')
  })

  it('CANCELLED with overdue date -> closed, not overdue', () => {
    expect(getRequestRowHighlight(makeRequest('CANCELLED', '2026-04-01'), NOW)).toBe('closed')
  })

  it('REJECTED with today date -> closed, not today', () => {
    expect(getRequestRowHighlight(makeRequest('REJECTED', '2026-04-30'), NOW)).toBe('closed')
  })
})

describe('rowHighlightClasses', () => {
  it('ported -> bg-sky-50', () => {
    expect(rowHighlightClasses('ported')).toBe('bg-sky-50')
  })

  it('overdue -> bg-red-50', () => {
    expect(rowHighlightClasses('overdue')).toBe('bg-red-50')
  })

  it('today -> bg-blue-50', () => {
    expect(rowHighlightClasses('today')).toBe('bg-blue-50')
  })

  it('tomorrow -> bg-yellow-50', () => {
    expect(rowHighlightClasses('tomorrow')).toBe('bg-yellow-50')
  })

  it('closed -> bg-gray-50/50', () => {
    expect(rowHighlightClasses('closed')).toBe('bg-gray-50/50')
  })

  it('none -> empty string', () => {
    expect(rowHighlightClasses('none')).toBe('')
  })
})
