// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { InternalNotificationDeliveryAttemptDto } from '@np-manager/shared'
import { InternalNotificationAttemptsPanel } from './InternalNotificationAttemptsPanel'

const { retryInternalNotificationAttemptMock } = vi.hoisted(() => ({
  retryInternalNotificationAttemptMock: vi.fn(),
}))

vi.mock('@/services/portingRequests.api', () => ({
  retryInternalNotificationAttempt: (...args: unknown[]) =>
    retryInternalNotificationAttemptMock(...args),
}))

function buildAttempt(
  overrides: Partial<InternalNotificationDeliveryAttemptDto> = {},
): InternalNotificationDeliveryAttemptDto {
  return {
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
    ...overrides,
  }
}

const ITEMS: InternalNotificationDeliveryAttemptDto[] = [
  buildAttempt(),
  buildAttempt({
    id: 'attempt-2',
    attemptOrigin: 'ERROR_FALLBACK',
    recipient: 'fallback@np-manager.local',
    mode: 'STUB',
    outcome: 'STUBBED',
    errorCode: null,
    errorMessage: null,
    failureKind: null,
    canRetry: false,
    retryBlockedReasonCode: 'ORIGIN_NOT_RETRYABLE',
    createdAt: '2026-04-11T10:01:00.000Z',
  }),
]

function renderPanel(props: {
  items?: InternalNotificationDeliveryAttemptDto[]
  onRefreshAttempts?: () => Promise<void> | void
}) {
  return render(
    <InternalNotificationAttemptsPanel
      requestId="request-1"
      items={props.items ?? ITEMS}
      isLoading={false}
      error={null}
      onRefreshAttempts={props.onRefreshAttempts ?? vi.fn()}
    />,
  )
}

describe('InternalNotificationAttemptsPanel', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    retryInternalNotificationAttemptMock.mockResolvedValue({
      sourceAttempt: ITEMS[0],
      retryAttempt: buildAttempt({ id: 'attempt-retry-1', attemptOrigin: 'RETRY' }),
      chain: {
        rootAttemptId: 'attempt-1',
        latestAttemptId: 'attempt-retry-1',
        retryCount: 1,
        latestOutcome: 'SENT',
        isLatestSuccessful: true,
      },
    })
  })

  it('renders delivery attempts and keeps base panel content intact', () => {
    const html = renderToStaticMarkup(
      <InternalNotificationAttemptsPanel
        requestId="request-1"
        items={ITEMS}
        isLoading={false}
        error={null}
        onRefreshAttempts={vi.fn()}
      />,
    )

    expect(html).toContain('Proby dostarczenia notyfikacji')
    expect(html).toContain('Ledger wykonanych prob transportu')
    expect(html).toContain('Primary dispatch')
    expect(html).toContain('Error fallback')
    expect(html).toContain('bok@multiplay.pl')
    expect(html).toContain('Blad wysylki')
    expect(html).toContain('Blad transportu: Timeout SMTP')
  })

  it('renders retry button for eligible attempt', () => {
    renderPanel({})

    expect(screen.getByRole('button', { name: 'Ponow' })).toBeTruthy()
  })

  it('does not render retry button for non-eligible attempt', () => {
    renderPanel({
      items: [
        buildAttempt({
          canRetry: false,
          retryBlockedReasonCode: 'OUTCOME_NOT_RETRYABLE',
          outcome: 'SENT',
          failureKind: null,
          errorMessage: null,
        }),
      ],
    })

    expect(screen.queryByRole('button', { name: 'Ponow' })).toBeNull()
  })

  it('calls retry endpoint after clicking retry', async () => {
    renderPanel({})

    fireEvent.click(screen.getByRole('button', { name: 'Ponow' }))

    await waitFor(() => {
      expect(retryInternalNotificationAttemptMock).toHaveBeenCalledWith('request-1', 'attempt-1')
    })
  })

  it('shows loading state only for clicked retry button', async () => {
    let resolveRetry: () => void = () => {}
    retryInternalNotificationAttemptMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRetry = () => resolve({})
      }),
    )

    renderPanel({
      items: [buildAttempt(), buildAttempt({ id: 'attempt-2', recipient: 'ops@multiplay.pl' })],
    })

    const buttons = screen.getAllByRole('button', { name: 'Ponow' })
    fireEvent.click(buttons[0]!)

    expect(screen.getByRole('button', { name: 'Ponawiam...' }).hasAttribute('disabled')).toBe(true)
    expect(buttons[1]?.hasAttribute('disabled')).toBe(false)

    resolveRetry()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Ponawiam...' })).toBeNull()
    })
  })

  it('refreshes attempts and shows success message after successful retry', async () => {
    const onRefreshAttempts = vi.fn().mockResolvedValue(undefined)
    renderPanel({ onRefreshAttempts })

    fireEvent.click(screen.getByRole('button', { name: 'Ponow' }))

    await waitFor(() => {
      expect(onRefreshAttempts).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByText('Ponowienie wykonane')).toBeTruthy()
  })

  it('shows business message for 409 retry blocked response', async () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 409,
        success: false,
        data: {
          error: {
            code: 'INTERNAL_NOTIFICATION_RETRY_NOT_ELIGIBLE',
            retryBlockedReasonCode: 'RETRY_LIMIT_REACHED',
          },
        },
      },
    }
    retryInternalNotificationAttemptMock.mockRejectedValueOnce(error)
    renderPanel({})

    fireEvent.click(screen.getByRole('button', { name: 'Ponow' }))

    await waitFor(() => {
      expect(screen.getByText('Limit ponowien osiagniety')).toBeTruthy()
    })
  })

  it('renders empty state for request without persisted attempts', () => {
    renderPanel({ items: [] })

    expect(
      screen.getByText('Brak zapisanych prob transportu w modelu attempts dla tej sprawy.'),
    ).toBeTruthy()
  })
})
