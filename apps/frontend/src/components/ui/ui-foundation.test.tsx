// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ActionMenu,
  AlertBanner,
  Badge,
  Button,
  DataField,
  DisclosureCard,
  EmptyState,
  SectionCard,
} from './index'

describe('ui foundation components', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders SectionCard header, description, action and body', () => {
    const html = renderToStaticMarkup(
      <SectionCard title="Dane sprawy" description="Najwazniejsze dane" action={<button>Akcja</button>}>
        Tresc sekcji
      </SectionCard>,
    )

    expect(html).toContain('Dane sprawy')
    expect(html).toContain('Najwazniejsze dane')
    expect(html).toContain('Akcja')
    expect(html).toContain('Tresc sekcji')
  })

  it('renders DisclosureCard as native details with focusable summary', () => {
    const html = renderToStaticMarkup(
      <DisclosureCard title="Diagnostyka" description="Dane techniczne">
        XML payload
      </DisclosureCard>,
    )

    expect(html).toContain('<details')
    expect(html).toContain('<summary')
    expect(html).toContain('Diagnostyka')
    expect(html).toContain('XML payload')
  })

  it('renders EmptyState with optional action', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Brak danych" description="Nie znaleziono rekordow." action={<button>Dodaj</button>} />,
    )

    expect(html).toContain('Brak danych')
    expect(html).toContain('Nie znaleziono rekordow.')
    expect(html).toContain('Dodaj')
  })

  it('uses alert role only for danger banners', () => {
    render(<AlertBanner tone="danger" title="Blad" description="Nie udalo sie zapisac." />)

    expect(screen.getByRole('alert').textContent).toContain('Blad')
    cleanup()

    render(<AlertBanner tone="info" title="Informacja" />)

    expect(screen.getByRole('status').textContent).toContain('Informacja')
  })

  it('renders DataField empty value with fallback text', () => {
    const html = renderToStaticMarkup(
      <dl>
        <DataField label="Numer dokumentu" value={null} emptyText="Brak" mono />
      </dl>,
    )

    expect(html).toContain('Numer dokumentu')
    expect(html).toContain('Brak')
    expect(html).toContain('font-mono')
  })

  it('keeps Button loading state backwards-compatible and disabled', () => {
    render(
      <Button isLoading loadingLabel="Zapisywanie">
        Zapisz
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Zapisywanie' })
    expect(button).toHaveProperty('disabled', true)
    expect(button.getAttribute('aria-busy')).toBe('true')
  })

  it('supports optional Badge leading dot without changing label text', () => {
    const html = renderToStaticMarkup(
      <Badge tone="amber" leadingDot>
        Wymaga reakcji
      </Badge>,
    )

    expect(html).toContain('Wymaga reakcji')
    expect(html).toContain('rounded-full')
  })

  it('opens ActionMenu, runs enabled action and closes menu', () => {
    const onOpen = vi.fn()

    render(
      <ActionMenu
        items={[
          { label: 'Otworz', onClick: onOpen },
          { label: 'Usun', tone: 'danger', onClick: vi.fn() },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Akcje' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Otworz' }))

    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('closes ActionMenu on Escape', () => {
    render(<ActionMenu items={[{ label: 'Otworz', onClick: vi.fn() }]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Akcje' }))
    expect(screen.getByRole('menu')).not.toBeNull()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
