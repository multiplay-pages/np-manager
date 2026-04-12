// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GlobalNotificationFailureQueueItemDto } from '@np-manager/shared'
import { NotificationFailureQueuePage } from './NotificationFailureQueuePage'

const { getGlobalNotificationFailureQueueMock, retryInternalNotificationAttemptMock } =
  vi.hoisted(() => ({
    getGlobalNotificationFailureQueueMock: vi.fn(),
    retryInternalNotificationAttemptMock: vi.fn(),
  }))

vi.mock('@/services/portingRequests.api', () => ({
  getGlobalNotificationFailureQueue: (...args: unknown[]) =>
    getGlobalNotificationFailureQueueMock(...args),
  retryInternalNotificationAttempt: (...args: unknown[]) =>
    retryInternalNotificationAttemptMock(...args),
}))

function makeItem(
  overrides: Partial<GlobalNotificationFailureQueueItemDto> = {},
): GlobalNotificationFailureQueueItemDto {
  return {
    attemptId: 'attempt-1',
    requestId: 'request-1',
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
    createdAt: '2026-04-11T10:00:00.000Z',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NotificationFailureQueuePage />
    </MemoryRouter>,
  )
}

describe('NotificationFailureQueuePage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    getGlobalNotificationFailureQueueMock.mockResolvedValue({
      items: [makeItem()],
      total: 1,
    })
    retryInternalNotificationAttemptMock.mockResolvedValue({})
  })

  it('calls retry endpoint after clicking retry', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Ponów' }))

    await waitFor(() => {
      expect(retryInternalNotificationAttemptMock).toHaveBeenCalledWith('request-1', 'attempt-1')
    })
  })

  it('shows loading state only for clicked row', async () => {
    let resolveRetry: () => void = () => {}
    retryInternalNotificationAttemptMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRetry = () => resolve({})
      }),
    )
    getGlobalNotificationFailureQueueMock.mockResolvedValue({
      items: [
        makeItem({ attemptId: 'attempt-1', requestId: 'request-1' }),
        makeItem({ attemptId: 'attempt-2', requestId: 'request-2' }),
      ],
      total: 2,
    })

    renderPage()

    const buttons = await screen.findAllByRole('button', { name: 'Ponów' })
    fireEvent.click(buttons[0]!)

    expect(screen.getByRole('button', { name: 'Ponawiam...' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Ponów' }).hasAttribute('disabled')).toBe(false)

    resolveRetry()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Ponawiam...' })).toBeNull()
    })
  })

  it('refreshes queue and shows success message after successful retry', async () => {
    getGlobalNotificationFailureQueueMock
      .mockResolvedValueOnce({ items: [makeItem()], total: 1 })
      .mockResolvedValueOnce({ items: [], total: 0 })

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Ponów' }))

    await waitFor(() => {
      expect(getGlobalNotificationFailureQueueMock).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByText('Ponowienie wykonane')).toBeTruthy()
  })

  it('shows business message for 409 retry blocked response', async () => {
    retryInternalNotificationAttemptMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: {
            retryBlockedReasonCode: 'RETRY_LIMIT_REACHED',
          },
        },
      },
    })

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Ponów' }))

    await waitFor(() => {
      expect(screen.getByText('Limit ponowień osiągnięty')).toBeTruthy()
    })
  })

  it('manual intervention filter shows only MANUAL_INTERVENTION_REQUIRED items', async () => {
    getGlobalNotificationFailureQueueMock.mockResolvedValue({
      items: [
        makeItem({
          attemptId: 'attempt-delivery',
          outcome: 'FAILED',
          failureKind: 'DELIVERY',
          canRetry: true,
        }),
        makeItem({
          attemptId: 'attempt-manual',
          eventLabel: 'Zdarzenie wymagające interwencji',
          outcome: 'MISCONFIGURED',
          failureKind: 'CONFIGURATION',
          canRetry: false,
        }),
      ],
      total: 2,
    })

    renderPage()

    await screen.findByText('Zdarzenie wymagające interwencji')
    fireEvent.click(screen.getByLabelText('Tylko wymagające interwencji'))

    expect(screen.queryByText('Zmiana statusu sprawy')).toBeNull()
    expect(screen.getByText('Zdarzenie wymagające interwencji')).toBeTruthy()
    expect(screen.getByText('Wyniki przefiltrowane na bieżącej stronie')).toBeTruthy()
  })

  it('keeps retry availability filter wired to queue refresh', async () => {
    renderPage()

    await screen.findByRole('button', { name: 'Ponów' })
    fireEvent.click(screen.getByLabelText('Tylko z dostępnym retry'))

    await waitFor(() => {
      expect(getGlobalNotificationFailureQueueMock).toHaveBeenCalledWith(
        expect.objectContaining({ canRetry: true, limit: 50, offset: 0 }),
      )
    })
  })

  it('keeps pagination wired to queue refresh', async () => {
    getGlobalNotificationFailureQueueMock.mockResolvedValue({
      items: [makeItem()],
      total: 120,
    })

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Następna' }))

    await waitFor(() => {
      expect(getGlobalNotificationFailureQueueMock).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, offset: 50 }),
      )
    })
  })
})
