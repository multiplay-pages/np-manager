import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { NotificationFailureHistoryItemDto } from '@np-manager/shared'
import { NotificationFailureHistoryPanel } from './NotificationFailureHistoryPanel'

const ITEMS: NotificationFailureHistoryItemDto[] = [
  {
    id: 'failure-1',
    occurredAt: '2026-04-09T10:05:00.000Z',
    outcome: 'FAILED',
    channel: 'EMAIL',
    message: 'Nie udalo sie wyslac notyfikacji przez e-mail do bok@multiplay.pl.',
    technicalDetailsPreview: 'Tryb: REAL | HTTP 500',
    isConfigurationIssue: false,
    isDeliveryIssue: true,
  },
  {
    id: 'failure-2',
    occurredAt: '2026-04-09T09:50:00.000Z',
    outcome: 'MISCONFIGURED',
    channel: 'TEAMS',
    message: 'Notyfikacja przez Teams nie zostala poprawnie skonfigurowana.',
    technicalDetailsPreview: 'Tryb: REAL | Brak konfiguracji webhooka.',
    isConfigurationIssue: true,
    isDeliveryIssue: false,
  },
]

describe('NotificationFailureHistoryPanel', () => {
  it('renders failure items with labels and details', () => {
    const html = renderToStaticMarkup(
      <NotificationFailureHistoryPanel items={ITEMS} isLoading={false} error={null} />,
    )

    expect(html).toContain('Ostatnie problemy notyfikacji')
    expect(html).toContain('Błąd wysyłki')
    expect(html).toContain('Błąd konfiguracji')
    expect(html).toContain('FAILED')
    expect(html).toContain('MISCONFIGURED')
    expect(html).toContain('Szczegóły techniczne: Tryb: REAL | HTTP 500')
  })

  it('renders empty state when no failures exist', () => {
    const html = renderToStaticMarkup(
      <NotificationFailureHistoryPanel items={[]} isLoading={false} error={null} />,
    )

    expect(html).toContain('Brak zarejestrowanych problemów notyfikacji.')
  })
})
