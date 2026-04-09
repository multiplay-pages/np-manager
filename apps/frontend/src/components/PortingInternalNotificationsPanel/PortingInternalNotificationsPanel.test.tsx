import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PortingInternalNotificationHistoryItemDto } from '@np-manager/shared'
import { PortingInternalNotificationsPanel } from './PortingInternalNotificationsPanel'

const ITEMS: PortingInternalNotificationHistoryItemDto[] = [
  {
    id: 'entry-1',
    entryType: 'USER_NOTIFICATION',
    eventCode: 'STATUS_CHANGED',
    eventLabel: 'Zmiana statusu sprawy',
    channel: 'IN_APP',
    recipient: 'Anna Handlowa (anna@np-manager.local)',
    outcome: 'CREATED',
    mode: null,
    message: 'Status sprawy zostal zmieniony na: PORTED.',
    errorMessage: null,
    createdAt: '2026-04-09T10:00:00.000Z',
  },
  {
    id: 'entry-2',
    entryType: 'TRANSPORT_AUDIT',
    eventCode: 'STATUS_CHANGED',
    eventLabel: 'Zmiana statusu sprawy',
    channel: 'EMAIL',
    recipient: 'bok@multiplay.pl',
    outcome: 'FAILED',
    mode: 'REAL',
    message: 'EMAIL -> bok@multiplay.pl: FAILED (tryb: REAL)',
    errorMessage: 'HTTP 500',
    createdAt: '2026-04-09T10:01:00.000Z',
  },
]

describe('PortingInternalNotificationsPanel', () => {
  it('renders internal notification history entries', () => {
    const html = renderToStaticMarkup(
      <PortingInternalNotificationsPanel items={ITEMS} isLoading={false} error={null} />,
    )

    expect(html).toContain('Historia powiadomien wewnetrznych')
    expect(html).toContain('Zmiana statusu sprawy')
    expect(html).toContain('Anna Handlowa (anna@np-manager.local)')
    expect(html).toContain('E-mail')
    expect(html).toContain('FAILED')
    expect(html).toContain('Blad transportu: HTTP 500')
  })

  it('renders empty state when there is no history', () => {
    const html = renderToStaticMarkup(
      <PortingInternalNotificationsPanel items={[]} isLoading={false} error={null} />,
    )

    expect(html).toContain('Brak historii powiadomien wewnetrznych dla tej sprawy.')
  })
})
