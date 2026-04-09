import { describe, expect, it } from 'vitest'

import { formatInternalNotification } from '../internal-notification-formatter'
import { PORTING_NOTIFICATION_EVENT } from '../porting-notification-events'

describe('formatInternalNotification', () => {
  // ============================================================
  // STATUS_CHANGED
  // ============================================================

  it('formats STATUS_CHANGED subject correctly', () => {
    const { subject } = formatInternalNotification(
      PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      'FNP-2026-AAA111',
      { newStatus: 'CONFIRMED' },
    )

    expect(subject).toContain('[NP-Manager]')
    expect(subject).toContain('Zmiana statusu sprawy')
    expect(subject).toContain('FNP-2026-AAA111')
  })

  it('formats STATUS_CHANGED text with new and old status', () => {
    const { text } = formatInternalNotification(
      PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      'FNP-2026-AAA111',
      { newStatus: 'CONFIRMED', oldStatus: 'PENDING_DONOR' },
    )

    expect(text).toContain('Nowy status sprawy: CONFIRMED')
    expect(text).toContain('Poprzedni status: PENDING_DONOR')
    expect(text).toContain('FNP-2026-AAA111')
  })

  it('formats STATUS_CHANGED without oldStatus (omits previous status line)', () => {
    const { text } = formatInternalNotification(
      PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      'FNP-2026-AAA111',
      { newStatus: 'PORTED' },
    )

    expect(text).toContain('Nowy status sprawy: PORTED')
    expect(text).not.toContain('Poprzedni status')
  })

  it('formats STATUS_CHANGED with dash when metadata missing', () => {
    const { text } = formatInternalNotification(
      PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      'FNP-2026-AAA111',
    )

    expect(text).toContain('Nowy status sprawy: —')
  })

  // ============================================================
  // COMMERCIAL_OWNER_CHANGED
  // ============================================================

  it('formats COMMERCIAL_OWNER_CHANGED subject correctly', () => {
    const { subject } = formatInternalNotification(
      PORTING_NOTIFICATION_EVENT.COMMERCIAL_OWNER_CHANGED,
      'FNP-2026-BBB222',
      { newOwnerName: 'Jan Kowalski' },
    )

    expect(subject).toContain('[NP-Manager]')
    expect(subject).toContain('Zmiana opiekuna handlowego')
    expect(subject).toContain('FNP-2026-BBB222')
  })

  it('formats COMMERCIAL_OWNER_CHANGED text with new owner name', () => {
    const { text } = formatInternalNotification(
      PORTING_NOTIFICATION_EVENT.COMMERCIAL_OWNER_CHANGED,
      'FNP-2026-BBB222',
      { newOwnerName: 'Jan Kowalski' },
    )

    expect(text).toContain('Nowy opiekun handlowy: Jan Kowalski')
  })

  it('formats COMMERCIAL_OWNER_CHANGED when owner is removed (no ownerName in metadata)', () => {
    const { text } = formatInternalNotification(
      PORTING_NOTIFICATION_EVENT.COMMERCIAL_OWNER_CHANGED,
      'FNP-2026-BBB222',
      {},
    )

    expect(text).toContain('usuniety')
  })

  it('formats COMMERCIAL_OWNER_CHANGED when metadata is undefined', () => {
    const { text } = formatInternalNotification(
      PORTING_NOTIFICATION_EVENT.COMMERCIAL_OWNER_CHANGED,
      'FNP-2026-BBB222',
    )

    expect(text).toContain('usuniety')
  })

  // ============================================================
  // REQUEST_CREATED
  // ============================================================

  it('formats REQUEST_CREATED subject correctly', () => {
    const { subject } = formatInternalNotification(
      PORTING_NOTIFICATION_EVENT.REQUEST_CREATED,
      'FNP-2026-CCC333',
    )

    expect(subject).toContain('[NP-Manager]')
    expect(subject).toContain('Nowa sprawa portowania')
    expect(subject).toContain('FNP-2026-CCC333')
  })

  it('formats REQUEST_CREATED text body', () => {
    const { text } = formatInternalNotification(
      PORTING_NOTIFICATION_EVENT.REQUEST_CREATED,
      'FNP-2026-CCC333',
    )

    expect(text).toContain('Zarejestrowano nowa sprawe portowania')
    expect(text).toContain('FNP-2026-CCC333')
  })

  // ============================================================
  // INNE EVENTY (generic fallback)
  // ============================================================

  it('formats E03_SENT using generic fallback text', () => {
    const { text } = formatInternalNotification(
      PORTING_NOTIFICATION_EVENT.E03_SENT,
      'FNP-2026-DDD444',
    )

    expect(text).toContain('Wyslano E03')
  })

  it('formats CASE_REJECTED using generic fallback text', () => {
    const { subject, text } = formatInternalNotification(
      PORTING_NOTIFICATION_EVENT.CASE_REJECTED,
      'FNP-2026-EEE555',
    )

    expect(subject).toContain('Sprawa zostala odrzucona')
    expect(text).toContain('Sprawa zostala odrzucona')
  })

  // ============================================================
  // WSPOLNE WYMAGANIA
  // ============================================================

  it('includes case number in both subject and text for all events', () => {
    const caseNumber = 'FNP-2026-XTEST'

    for (const event of Object.values(PORTING_NOTIFICATION_EVENT)) {
      const { subject, text } = formatInternalNotification(event, caseNumber)
      expect(subject).toContain(caseNumber)
      expect(text).toContain(caseNumber)
    }
  })

  it('always includes NP-Manager system footer', () => {
    const { text } = formatInternalNotification(
      PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
      'FNP-2026-FOOTER',
    )

    expect(text).toContain('NP-Manager')
    expect(text).toContain('automatycznie')
  })
})
