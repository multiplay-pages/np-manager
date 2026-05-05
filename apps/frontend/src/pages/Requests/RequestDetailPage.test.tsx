import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  RequestCreatedSuccessBanner,
  clearCreatedRequestNavigationState,
  isCreatedRequestNavigationState,
} from './RequestDetailPage'

describe('RequestDetailPage create-flow state', () => {
  it('shows create success only for explicit createdRequest navigation state', () => {
    expect(isCreatedRequestNavigationState({ createdRequest: true })).toBe(true)
    expect(isCreatedRequestNavigationState({ createdRequest: false })).toBe(false)
    expect(isCreatedRequestNavigationState({})).toBe(false)
    expect(isCreatedRequestNavigationState(null)).toBe(false)
  })

  it('clears createdRequest while preserving unrelated navigation state', () => {
    expect(
      clearCreatedRequestNavigationState({
        createdRequest: true,
        fromList: true,
        listSearch: '?status=DRAFT',
      }),
    ).toEqual({
      fromList: true,
      listSearch: '?status=DRAFT',
    })
  })

  it('renders a clear operator-facing create success banner', () => {
    const html = renderToStaticMarkup(<RequestCreatedSuccessBanner />)

    expect(html).toContain('Sprawa zostala utworzona')
    expect(html).toContain('Co dalej ze sprawa')
    expect(html).toContain('Akcje statusu')
  })
})
