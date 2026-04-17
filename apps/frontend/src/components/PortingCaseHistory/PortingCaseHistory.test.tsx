import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PortingCaseHistory } from './PortingCaseHistory'

describe('PortingCaseHistory', () => {
  it('uses manual-mode-safe empty state copy', () => {
    const html = renderToStaticMarkup(<PortingCaseHistory items={[]} isLoading={false} />)

    expect(html).toContain('Brak wpisow w historii statusu tej sprawy')
    expect(html).toContain('Komunikacja i powiadomienia')
    expect(html).not.toContain('PLI CBD')
  })
})
