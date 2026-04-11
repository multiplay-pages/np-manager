import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { GlobalNotificationFailureQueueItemDto } from '@np-manager/shared'
import { NotificationFailureQueueTable } from './NotificationFailureQueueTable'

function makeItem(
  overrides: Partial<GlobalNotificationFailureQueueItemDto> = {},
): GlobalNotificationFailureQueueItemDto {
  return {
    attemptId: 'attempt-1',
    requestId: 'request-abc-123',
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

function render(ui: React.ReactElement) {
  return renderToStaticMarkup(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('NotificationFailureQueueTable', () => {
  it('renders loading state', () => {
    const html = render(<NotificationFailureQueueTable items={[]} isLoading error={null} />)
    expect(html).toContain('Ładowanie')
  })

  it('renders error state', () => {
    const html = render(
      <NotificationFailureQueueTable items={[]} isLoading={false} error="Blad serwera" />,
    )
    expect(html).toContain('Blad serwera')
  })

  it('renders empty state', () => {
    const html = render(<NotificationFailureQueueTable items={[]} isLoading={false} error={null} />)
    expect(html).toContain('Brak problematycznych prób notyfikacji')
  })

  it('renders FAILED outcome badge', () => {
    const html = render(
      <NotificationFailureQueueTable
        items={[makeItem({ outcome: 'FAILED' })]}
        isLoading={false}
        error={null}
      />,
    )
    expect(html).toContain('Błąd wysyłki')
  })

  it('renders MISCONFIGURED outcome badge', () => {
    const html = render(
      <NotificationFailureQueueTable
        items={[makeItem({ outcome: 'MISCONFIGURED', failureKind: 'CONFIGURATION' })]}
        isLoading={false}
        error={null}
      />,
    )
    expect(html).toContain('Błędna konfiguracja')
    expect(html).toContain('Konfiguracja')
  })

  it('renders canRetry=true as Dostepny', () => {
    const html = render(
      <NotificationFailureQueueTable
        items={[makeItem({ canRetry: true, retryBlockedReasonCode: null })]}
        isLoading={false}
        error={null}
      />,
    )
    expect(html).toContain('Dostępny')
  })

  it('renders RETRY_LIMIT_REACHED as Wyczerpany', () => {
    const html = render(
      <NotificationFailureQueueTable
        items={[
          makeItem({ canRetry: false, retryBlockedReasonCode: 'RETRY_LIMIT_REACHED', retryCount: 3 }),
        ]}
        isLoading={false}
        error={null}
      />,
    )
    expect(html).toContain('Wyczerpany')
    expect(html).toContain('3 / 3')
  })

  it('renders link to RequestDetailPage', () => {
    const html = render(
      <NotificationFailureQueueTable
        items={[makeItem({ requestId: 'request-abc-123' })]}
        isLoading={false}
        error={null}
      />,
    )
    expect(html).toContain('/requests/request-abc-123')
  })

  it('renders eventLabel', () => {
    const html = render(
      <NotificationFailureQueueTable
        items={[makeItem({ eventLabel: 'Zmiana statusu sprawy' })]}
        isLoading={false}
        error={null}
      />,
    )
    expect(html).toContain('Zmiana statusu sprawy')
  })
})
