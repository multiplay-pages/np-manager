import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RequestOperationalDetailsPanel } from './RequestOperationalDetailsPanel'

describe('RequestOperationalDetailsPanel', () => {
  it('renders operational data in read-only mode with mistake-flow guidance', () => {
    const html = renderToStaticMarkup(
      <RequestOperationalDetailsPanel
        correspondenceAddress="ul. Testowa 1, 00-001 Warszawa"
        contactChannel="EMAIL"
        internalNotes="Notatka"
        requestDocumentNumber="DOC-1"
      />,
    )

    expect(html).toContain('Dane operacyjne są tylko do podglądu')
    expect(html).toContain('anuluj sprawę z powodem i załóż nową poprawną sprawę')
    expect(html).toContain('DOC-1')
    expect(html).toContain('Email')
    expect(html).toContain('ul. Testowa 1, 00-001 Warszawa')
    expect(html).toContain('Notatka')
    expect(html).not.toContain('>Edytuj<')
    expect(html).not.toContain('Zapisz zmiany')
    expect(html).not.toContain('<form')
  })
})
