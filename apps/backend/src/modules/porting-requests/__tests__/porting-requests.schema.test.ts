import { describe, expect, it } from 'vitest'
import {
  createPortingRequestSchema,
  portingRequestListQuerySchema,
  portingRequestSummaryQuerySchema,
} from '../porting-requests.schema'

const VALID_UUID = '11111111-1111-4111-8111-111111111111'
const DONOR_UUID = '22222222-2222-4222-8222-222222222222'

function nextWeekday(offsetDays = 1): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  while ([0, 6].includes(date.getDay())) {
    date.setDate(date.getDate() + 1)
  }
  return date.toISOString().slice(0, 10)
}

function baseCreateBody(overrides: Record<string, unknown> = {}) {
  return {
    clientId: VALID_UUID,
    donorOperatorId: DONOR_UUID,
    numberType: 'FIXED_LINE',
    numberRangeKind: 'SINGLE',
    primaryNumber: '+48 22 123 45 67',
    portingMode: 'DAY',
    requestedPortDate: nextWeekday(),
    subscriberKind: 'INDIVIDUAL',
    subscriberFirstName: 'Jan',
    subscriberLastName: 'Kowalski',
    identityType: 'PESEL',
    identityValue: '90010112345',
    correspondenceAddress: 'Testowa 1, 00-001 Warszawa',
    hasPowerOfAttorney: true,
    linkedWholesaleServiceOnRecipientSide: false,
    contactChannel: 'EMAIL',
    ...overrides,
  }
}

describe('createPortingRequestSchema', () => {
  it.each(['END', 'EOP'])(
    'rejects %s mode without earliestAcceptablePortDate',
    (portingMode) => {
      const result = createPortingRequestSchema.safeParse(
        baseCreateBody({
          portingMode,
          requestedPortDate: undefined,
          earliestAcceptablePortDate: undefined,
        }),
      )

      expect(result.success).toBe(false)
      expect(result.error?.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['earliestAcceptablePortDate'],
            message: 'Dla trybu END/EOP wskaz najwczesniejsza akceptowalna date przeniesienia.',
          }),
        ]),
      )
    },
  )

  it('rejects DAY mode without requestedPortDate', () => {
    const result = createPortingRequestSchema.safeParse(
      baseCreateBody({ requestedPortDate: undefined }),
    )

    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['requestedPortDate'],
          message: 'Dla trybu DAY wskaz wnioskowany dzien przeniesienia.',
        }),
      ]),
    )
  })

  it('rejects DAY mode without power of attorney', () => {
    const result = createPortingRequestSchema.safeParse(
      baseCreateBody({ hasPowerOfAttorney: false }),
    )

    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['hasPowerOfAttorney'],
          message: 'Tryb DAY wymaga pelnomocnictwa.',
        }),
      ]),
    )
  })

  it('rejects DDI range when canonical end number is lower than canonical start number', () => {
    const result = createPortingRequestSchema.safeParse(
      baseCreateBody({
        numberRangeKind: 'DDI_RANGE',
        primaryNumber: undefined,
        rangeStart: '+48 22 555 10 10',
        rangeEnd: '22 555 10 09',
      }),
    )

    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['rangeEnd'],
          message: 'Numer koncowy zakresu nie moze byc mniejszy niz numer poczatkowy.',
        }),
      ]),
    )
  })
})

describe('portingRequestListQuerySchema - confirmedPortDate range validation', () => {
  it('accepts valid range (from < to)', () => {
    expect(() =>
      portingRequestListQuerySchema.parse({
        confirmedPortDateFrom: '2026-04-15',
        confirmedPortDateTo: '2026-04-30',
      }),
    ).not.toThrow()
  })

  it('accepts same-day range (from === to)', () => {
    expect(() =>
      portingRequestListQuerySchema.parse({
        confirmedPortDateFrom: '2026-04-22',
        confirmedPortDateTo: '2026-04-22',
      }),
    ).not.toThrow()
  })

  it('accepts from only', () => {
    expect(() =>
      portingRequestListQuerySchema.parse({ confirmedPortDateFrom: '2026-04-15' }),
    ).not.toThrow()
  })

  it('accepts to only', () => {
    expect(() =>
      portingRequestListQuerySchema.parse({ confirmedPortDateTo: '2026-04-30' }),
    ).not.toThrow()
  })

  it('rejects inverted range (from > to) with expected message', () => {
    const result = portingRequestListQuerySchema.safeParse({
      confirmedPortDateFrom: '2026-04-30',
      confirmedPortDateTo: '2026-04-15',
    })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.path.includes('confirmedPortDateTo'))
    expect(issue?.message).toBe('Data koncowa nie moze byc wczesniejsza niz data poczatkowa.')
  })
})

describe('portingRequestSummaryQuerySchema - confirmedPortDate range validation', () => {
  it('accepts valid range (from < to)', () => {
    expect(() =>
      portingRequestSummaryQuerySchema.parse({
        confirmedPortDateFrom: '2026-04-15',
        confirmedPortDateTo: '2026-04-30',
      }),
    ).not.toThrow()
  })

  it('accepts same-day range (from === to)', () => {
    expect(() =>
      portingRequestSummaryQuerySchema.parse({
        confirmedPortDateFrom: '2026-04-22',
        confirmedPortDateTo: '2026-04-22',
      }),
    ).not.toThrow()
  })

  it('rejects inverted range (from > to) with expected message', () => {
    const result = portingRequestSummaryQuerySchema.safeParse({
      confirmedPortDateFrom: '2026-04-30',
      confirmedPortDateTo: '2026-04-15',
    })
    expect(result.success).toBe(false)
    const issue = result.error?.issues.find((i) => i.path.includes('confirmedPortDateTo'))
    expect(issue?.message).toBe('Data koncowa nie moze byc wczesniejsza niz data poczatkowa.')
  })
})
