import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { InternalNotificationDeliveryAttemptDto } from '@np-manager/shared'
import { InternalNotificationAttemptsPanel } from './InternalNotificationAttemptsPanel'

const ITEMS: InternalNotificationDeliveryAttemptDto[] = [
  {
    id: 'attempt-1',
    requestId: 'request-1',
    eventCode: 'STATUS_CHANGED',
    eventLabel: 'Zmiana statusu sprawy',
    attemptOrigin: 'PRIMARY',
    channel: 'EMAIL',
    recipient: 'bok@multiplay.pl',
    mode: 'REAL',
    outcome: 'FAILED',
    errorCode: 'SMTP_TIMEOUT',
    errorMessage: 'Timeout SMTP',
    failureKind: 'DELIVERY',
    retryOfAttemptId: null,
    retryCount: 0,
    isLatestForChain: true,
    triggeredByUserId: null,
    triggeredByDisplayName: null,
    canRetry: true,
    retryBlockedReasonCode: null,
    createdAt: '2026-04-11T10:00:00.000Z',
  },
  {
    id: 'attempt-2',
    requestId: 'request-1',
    eventCode: 'STATUS_CHANGED',
    eventLabel: 'Zmiana statusu sprawy',
    attemptOrigin: 'ERROR_FALLBACK',
    channel: 'EMAIL',
    recipient: 'fallback@np-manager.local',
    mode: 'STUB',
    outcome: 'STUBBED',
    errorCode: null,
    errorMessage: null,
    failureKind: null,
    retryOfAttemptId: null,
    retryCount: 0,
    isLatestForChain: true,
    triggeredByUserId: null,
    triggeredByDisplayName: null,
    canRetry: false,
    retryBlockedReasonCode: 'ORIGIN_NOT_RETRYABLE',
    createdAt: '2026-04-11T10:01:00.000Z',
  },
]

describe('InternalNotificationAttemptsPanel', () => {
  it('renders delivery attempts without retry actions', () => {
    const html = renderToStaticMarkup(
      <InternalNotificationAttemptsPanel items={ITEMS} isLoading={false} error={null} />,
    )

    expect(html).toContain('Proby dostarczenia notyfikacji')
    expect(html).toContain('Ledger wykonanych prob transportu')
    expect(html).toContain('Primary dispatch')
    expect(html).toContain('Error fallback')
    expect(html).toContain('bok@multiplay.pl')
    expect(html).toContain('Blad wysylki')
    expect(html).toContain('Blad transportu: Timeout SMTP')
    expect(html).not.toContain('Retryuj')
    expect(html).not.toContain('Ponow')
  })

  it('renders empty state for request without persisted attempts', () => {
    const html = renderToStaticMarkup(
      <InternalNotificationAttemptsPanel items={[]} isLoading={false} error={null} />,
    )

    expect(html).toContain('Brak zapisanych prob transportu w modelu attempts dla tej sprawy.')
  })
})
