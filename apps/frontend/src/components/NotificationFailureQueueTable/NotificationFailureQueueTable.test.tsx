import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { GlobalNotificationFailureQueueItemDto } from '@np-manager/shared'
import { NotificationFailureQueueTable } from './NotificationFailureQueueTable'

function makeItem(
  overrides: Partial<GlobalNotificationFailureQueueItemDto> = {},
): GlobalNotificationFailureQueueItemDto {
  return {
    attemptId: 'attempt-1',
    requestId: 'request-abc-123',
    caseNumber: 'FNP-20260411-ABC123',
    eventCode: 'STATUS_CHANGED',
    eventLabel: 'Zmiana statusu sprawy',
    attemptOrigin: 'PRIMARY',
    channel: 'EMAIL',
    recipient: 'bok@test.pl',
    outcome: 'FAILED',
    failureKind: 'DELIVERY',
    retryCount: 0,
    canRetry: true,
    retryBlockedReasonCode: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function renderTable(
  props: Partial<ComponentProps<typeof NotificationFailureQueueTable>> = {},
) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <NotificationFailureQueueTable
        items={[]}
        isLoading={false}
        error={null}
        retryingAttemptIds={[]}
        onRetryAttempt={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('NotificationFailureQueueTable', () => {
  it('renders loading state', () => {
    const html = renderTable({ isLoading: true })
    expect(html).toContain('Ładowanie')
  })

  it('renders error state', () => {
    const html = renderTable({ error: 'Blad serwera' })
    expect(html).toContain('Blad serwera')
  })

  it('renders empty state', () => {
    const html = renderTable()
    expect(html).toContain('Brak problematycznych prób notyfikacji')
  })

  it('renders FAILED outcome badge', () => {
    const html = renderTable({ items: [makeItem({ outcome: 'FAILED' })] })
    expect(html).toContain('Błąd wysyłki')
  })

  it('renders MISCONFIGURED outcome badge', () => {
    const html = renderTable({
      items: [makeItem({ outcome: 'MISCONFIGURED', failureKind: 'CONFIGURATION' })],
    })
    expect(html).toContain('Błędna konfiguracja')
    expect(html).toContain('Konfiguracja')
  })

  it('renders canRetry=true as Gotowy do ponowienia', () => {
    const html = renderTable({ items: [makeItem({ canRetry: true, retryBlockedReasonCode: null })] })
    expect(html).toContain('Gotowy do ponowienia')
  })

  it('renders retry button for canRetry=true', () => {
    const html = renderTable({ items: [makeItem({ canRetry: true })] })

    expect(html).toContain('Ponów')
  })

  it('does not render retry button for canRetry=false', () => {
    const html = renderTable({
      items: [makeItem({ canRetry: false, retryBlockedReasonCode: 'RETRY_LIMIT_REACHED' })],
    })

    expect(html).not.toContain('Ponów')
  })

  it('renders business case number as request link', () => {
    const html = renderTable({
      items: [makeItem({ requestId: 'request-abc-123', caseNumber: 'FNP-20260411-ABC123' })],
    })

    expect(html).toContain('FNP-20260411-ABC123')
    expect(html).toContain('/requests/request-abc-123')
  })

  it('renders channel label and recipient', () => {
    const html = renderTable({
      items: [makeItem({ channel: 'TEAMS', recipient: 'https://teams.test/webhook' })],
    })

    expect(html).toContain('Teams')
    expect(html).toContain('https://teams.test/webhook')
  })

  it('renders readable retry blocked reason', () => {
    const html = renderTable({
      items: [
        makeItem({
          canRetry: false,
          retryBlockedReasonCode: 'ORIGIN_NOT_RETRYABLE',
        }),
      ],
    })

    expect(html).toContain('Tego typu proby nie mozna ponowic')
  })

  it('renders RETRY_LIMIT_REACHED as Limit wyczerpany', () => {
    const html = renderTable({
      items: [
        makeItem({ canRetry: false, retryBlockedReasonCode: 'RETRY_LIMIT_REACHED', retryCount: 3 }),
      ],
    })
    expect(html).toContain('Limit wyczerpany')
    expect(html).toContain('3 / 3')
  })

  it('renders MISCONFIGURED as Wymaga interwencji', () => {
    const html = renderTable({
      items: [makeItem({ outcome: 'MISCONFIGURED', failureKind: 'CONFIGURATION', canRetry: false })],
    })
    expect(html).toContain('Wymaga interwencji')
  })

  it('renders RETRY_BLOCKED_OTHER (NOT_LATEST_IN_CHAIN) as Zablokowany', () => {
    const html = renderTable({
      items: [
        makeItem({
          canRetry: false,
          retryBlockedReasonCode: 'NOT_LATEST_IN_CHAIN',
          failureKind: 'DELIVERY',
        }),
      ],
    })
    expect(html).toContain('Zablokowany')
  })

  it('MANUAL_INTERVENTION_REQUIRED row has orange accent class', () => {
    const html = renderTable({
      items: [makeItem({ outcome: 'MISCONFIGURED', failureKind: 'CONFIGURATION', canRetry: false })],
    })
    expect(html).toContain('border-l-orange-400')
  })

  it('renders link to RequestDetailPage', () => {
    const html = renderTable({ items: [makeItem({ requestId: 'request-abc-123' })] })
    expect(html).toContain('/requests/request-abc-123')
  })

  it('renders eventLabel', () => {
    const html = renderTable({ items: [makeItem({ eventLabel: 'Zmiana statusu sprawy' })] })
    expect(html).toContain('Zmiana statusu sprawy')
  })
})
