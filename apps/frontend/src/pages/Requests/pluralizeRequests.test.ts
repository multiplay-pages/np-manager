import { describe, expect, it } from 'vitest'
import { pluralizeRequests } from './pluralizeRequests'

describe('pluralizeRequests', () => {
  it('uses "spraw" for 0', () => {
    expect(pluralizeRequests(0)).toBe('spraw')
  })

  it('uses "sprawa" for 1', () => {
    expect(pluralizeRequests(1)).toBe('sprawa')
  })

  it.each([2, 3, 4, 22, 23, 24, 102, 103, 104])('uses "sprawy" for %i', (n) => {
    expect(pluralizeRequests(n)).toBe('sprawy')
  })

  it.each([5, 6, 10, 11, 12, 13, 14, 15, 20, 21, 25, 100, 101, 112, 113, 114])(
    'uses "spraw" for %i',
    (n) => {
      expect(pluralizeRequests(n)).toBe('spraw')
    },
  )
})
