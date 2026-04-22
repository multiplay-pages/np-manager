import { describe, expect, it } from 'vitest'
import { getPortingOperationalHint } from './portingOperationalHint'

describe('getPortingOperationalHint', () => {
  it('maps DRAFT to a missing-documents hint', () => {
    expect(
      getPortingOperationalHint({
        statusInternal: 'DRAFT',
        confirmedPortDate: null,
      }),
    ).toEqual({
      label: 'Czeka na dokumenty',
      tone: 'amber',
    })
  })

  it('maps SUBMITTED to a confirmation hint', () => {
    expect(
      getPortingOperationalHint({
        statusInternal: 'SUBMITTED',
        confirmedPortDate: null,
      }),
    ).toEqual({
      label: 'Wymaga potwierdzenia',
      tone: 'brand',
    })
  })

  it('prioritizes missing donor date for pending donor cases without a date', () => {
    expect(
      getPortingOperationalHint({
        statusInternal: 'PENDING_DONOR',
        confirmedPortDate: null,
      }),
    ).toEqual({
      label: 'Brak daty od dawcy',
      tone: 'amber',
    })
  })

  it('returns confirmation hint when donor response already has a date', () => {
    expect(
      getPortingOperationalHint({
        statusInternal: 'PENDING_DONOR',
        confirmedPortDate: '2026-04-30',
      }),
    ).toEqual({
      label: 'Wymaga potwierdzenia',
      tone: 'brand',
    })
  })

  it('maps confirmed requests with a date to client contact hint', () => {
    expect(
      getPortingOperationalHint({
        statusInternal: 'CONFIRMED',
        confirmedPortDate: '2026-04-30',
      }),
    ).toEqual({
      label: 'Do kontaktu z klientem',
      tone: 'brand',
    })
  })

  it('maps ERROR to intervention hint', () => {
    expect(
      getPortingOperationalHint({
        statusInternal: 'ERROR',
        confirmedPortDate: null,
      }),
    ).toEqual({
      label: 'Wymaga interwencji',
      tone: 'red',
    })
  })

  it('maps terminal statuses to no-further-action hint', () => {
    expect(
      getPortingOperationalHint({
        statusInternal: 'PORTED',
        confirmedPortDate: '2026-04-30',
      }),
    ).toEqual({
      label: 'Brak dalszych akcji',
      tone: 'neutral',
    })
  })
})
