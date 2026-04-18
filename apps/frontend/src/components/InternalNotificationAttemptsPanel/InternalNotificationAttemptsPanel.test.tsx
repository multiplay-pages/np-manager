// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

function renderPanel(
  overrides: Partial<ComponentProps<typeof InternalNotificationAttemptsPanel>> = {},
) {
  const onRetryAttempt = vi.fn()

  render(
    <InternalNotificationAttemptsPanel
      items={ITEMS}
      isLoading={false}
      error={null}
      canRetryAttempts={true}
      retryingAttemptId={null}
      retrySuccessMessage={null}
      retryErrorMessage={null}
      onRetryAttempt={onRetryAttempt}
      {...overrides}
    />,
  )

  return { onRetryAttempt }
}

describe('InternalNotificationAttemptsPanel', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders retry action only for retryable attempts', () => {
    renderPanel()

    expect(screen.getByRole('button', { name: 'Ponow' })).toBeTruthy()
    expect(screen.getByText('Tego typu proby nie mozna ponowic.')).toBeTruthy()
  })

  it('calls retry callback for selected attempt', () => {
    const { onRetryAttempt } = renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Ponow' }))

    expect(onRetryAttempt).toHaveBeenCalledWith('attempt-1')
    expect(onRetryAttempt).toHaveBeenCalledTimes(1)
  })

  it('renders retry loading state for active attempt', () => {
    renderPanel({ retryingAttemptId: 'attempt-1' })

    const loadingButton = screen.getByRole('button', { name: 'Ponawiam...' })
    expect(loadingButton).toBeTruthy()
    expect(loadingButton.hasAttribute('disabled')).toBe(true)
  })

  it('hides retry button when role cannot trigger retry', () => {
    renderPanel({ canRetryAttempts: false })

    expect(screen.queryByRole('button', { name: 'Ponow' })).toBeNull()
    expect(screen.getByText('Ponowienie dostepne dla zespolu operacyjnego.')).toBeTruthy()
  })

  it('renders retry feedback messages', () => {
    renderPanel({
      retrySuccessMessage: 'Ponowienie wykonane: dostarczono.',
      retryErrorMessage: 'Nie udalo sie ponowic proby dostarczenia.',
    })

    expect(screen.getByText('Ponowienie wykonane: dostarczono.')).toBeTruthy()
    expect(screen.getByText('Nie udalo sie ponowic proby dostarczenia.')).toBeTruthy()
  })
})
