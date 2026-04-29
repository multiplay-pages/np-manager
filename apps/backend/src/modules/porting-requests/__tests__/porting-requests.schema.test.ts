import { describe, expect, it } from 'vitest'
import {
  portingRequestListQuerySchema,
  portingRequestSummaryQuerySchema,
} from '../porting-requests.schema'

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
