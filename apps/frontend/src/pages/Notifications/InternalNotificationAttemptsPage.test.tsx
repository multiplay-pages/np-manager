// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GlobalInternalNotificationAttemptItemDto } from '@np-manager/shared'

const { getGlobalInternalNotificationAttemptsMock, retryInternalNotificationAttemptMock } =
  vi.hoisted(() => ({
    getGlobalInternalNotificationAttemptsMock: vi.fn(),
    retryInternalNotificationAttemptMock: vi.fn(),
  }))

vi.mock('@/services/internalNotificationAttempts.api', () => ({
  getGlobalInternalNotificationAttempts: (...args: unknown[]) =>
    getGlobalInternalNotificationAttemptsMock(...args),
}))

vi.mock('@/services/portingRequests.api', () => ({
  retryInternalNotificationAttempt: (...args: unknown[]) =>
    retryInternalNotificationAttemptMock(...args),
}))

import { InternalNotificationAttemptsPage } from './InternalNotificationAttemptsPage'

function makeAttempt(
  overrides: Partial<GlobalInternalNotificationAttemptItemDto> = {},
): GlobalInternalNotificationAttemptItemDto {
  return {
    attemptId: 'attempt-1',
    requestId: 'request-1',
    caseNumber: 'FNP-20260411-ABC123',
    eventCode: 'STATUS_CHANGED',
    eventLabel: 'Zmiana statusu sprawy',
    attemptOrigin: 'PRIMARY',
    channel: 'EMAIL',
    recipient: 'bok@test.pl',
    mode: 'REAL',
    outcome: 'FAILED',
    errorCode: 'SMTP_FAILED',
    errorMessage: 'SMTP unavailable',
    failureKind: 'DELIVERY',
    retryOfAttemptId: null,
    retryCount: 1,
    isLatestForChain: true,
    triggeredByUserId: null,
    triggeredByDisplayName: null,
    canRetry: true,
    retryBlockedReasonCode: null,
    createdAt: '2026-04-11T10:00:00.000Z',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <InternalNotificationAttemptsPage />
    </MemoryRouter>,
  )
}

describe('InternalNotificationAttemptsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getGlobalInternalNotificationAttemptsMock.mockResolvedValue({
      items: [makeAttempt()],
      total: 1,
    })
    retryInternalNotificationAttemptMock.mockResolvedValue({
      retryAttempt: makeAttempt({ attemptId: 'attempt-retry-1', outcome: 'SENT' }),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('loads attempts and links each record to canonical request detail', async () => {
    renderPage()

    const caseLink = await screen.findByRole('link', { name: 'FNP-20260411-ABC123' })

    expect(caseLink.getAttribute('href')).toBe('/requests/FNP-20260411-ABC123')
    const table = screen.getByRole('table')
    expect(within(table).getByText('Zmiana statusu sprawy')).toBeTruthy()
    expect(within(table).getByText('bok@test.pl')).toBeTruthy()
    expect(within(table).getByText('Blad wysylki')).toBeTruthy()
    expect(within(table).getByText('SMTP unavailable')).toBeTruthy()
    expect(getGlobalInternalNotificationAttemptsMock).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
    })
  })

  it('shows loading state', () => {
    getGlobalInternalNotificationAttemptsMock.mockReturnValueOnce(new Promise(() => {}))

    renderPage()

    expect(screen.getByText('Ladowanie prob notyfikacji...')).toBeTruthy()
  })

  it('shows empty state when backend returns no attempts', async () => {
    getGlobalInternalNotificationAttemptsMock.mockResolvedValueOnce({
      items: [],
      total: 0,
    })

    renderPage()

    expect(await screen.findByText('Brak zapisanych prob notyfikacji.')).toBeTruthy()
  })

  it('shows error state instead of empty state after failed load', async () => {
    getGlobalInternalNotificationAttemptsMock.mockRejectedValueOnce(new Error('API unavailable'))

    renderPage()

    expect(
      await screen.findByText('Nie udalo sie pobrac globalnej listy prob notyfikacji.'),
    ).toBeTruthy()
    expect(screen.queryByText('Brak zapisanych prob notyfikacji.')).toBeNull()
  })

  it('keeps pagination read-only and backed by existing offset params', async () => {
    getGlobalInternalNotificationAttemptsMock.mockResolvedValue({
      items: [makeAttempt()],
      total: 120,
    })

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Nastepna' }))

    await waitFor(() => {
      expect(getGlobalInternalNotificationAttemptsMock).toHaveBeenCalledWith({
        limit: 50,
        offset: 50,
      })
    })
  })

  it('shows retry action only for retryable attempts', async () => {
    getGlobalInternalNotificationAttemptsMock.mockResolvedValueOnce({
      items: [
        makeAttempt({ attemptId: 'attempt-retryable', canRetry: true }),
        makeAttempt({
          attemptId: 'attempt-blocked',
          canRetry: false,
          retryBlockedReasonCode: 'RETRY_LIMIT_REACHED',
        }),
      ],
      total: 2,
    })

    renderPage()

    expect(await screen.findByRole('button', { name: 'Ponow' })).toBeTruthy()
    expect(screen.getByText('Limit ponowien osiagniety.')).toBeTruthy()
  })

  it('calls retry endpoint, shows row loading and refreshes attempts after success', async () => {
    let resolveRetry: () => void = () => {}
    retryInternalNotificationAttemptMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRetry = () =>
          resolve({
            retryAttempt: makeAttempt({ attemptId: 'attempt-retry-1', outcome: 'SENT' }),
          })
      }),
    )
    getGlobalInternalNotificationAttemptsMock
      .mockResolvedValueOnce({ items: [makeAttempt()], total: 1 })
      .mockResolvedValueOnce({
        items: [makeAttempt({ attemptId: 'attempt-retry-1', outcome: 'SENT', retryCount: 2 })],
        total: 1,
      })

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Ponow' }))

    expect(screen.getByRole('button', { name: 'Ponawiam...' }).hasAttribute('disabled')).toBe(true)
    expect(retryInternalNotificationAttemptMock).toHaveBeenCalledWith('request-1', 'attempt-1')

    resolveRetry()

    await waitFor(() => {
      expect(getGlobalInternalNotificationAttemptsMock).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByText('Ponowienie wykonane: dostarczono.')).toBeTruthy()
  })

  it('sends outcome, channel and retryableOnly filters and resets offset to 0', async () => {
    getGlobalInternalNotificationAttemptsMock.mockResolvedValue({
      items: [makeAttempt()],
      total: 120,
    })

    renderPage()

    // first page initial call
    await screen.findByRole('link', { name: 'FNP-20260411-ABC123' })

    // navigate to second page
    fireEvent.click(screen.getByRole('button', { name: 'Nastepna' }))
    await waitFor(() => {
      expect(getGlobalInternalNotificationAttemptsMock).toHaveBeenLastCalledWith({
        limit: 50,
        offset: 50,
        outcome: undefined,
        channel: undefined,
        retryableOnly: undefined,
      })
    })

    // change outcome filter -> offset resets and filter is sent
    fireEvent.change(screen.getByLabelText('Filtr wynik'), { target: { value: 'FAILED' } })
    await waitFor(() => {
      expect(getGlobalInternalNotificationAttemptsMock).toHaveBeenLastCalledWith({
        limit: 50,
        offset: 0,
        outcome: 'FAILED',
        channel: undefined,
        retryableOnly: undefined,
      })
    })

    // change channel filter
    fireEvent.change(screen.getByLabelText('Filtr kanal'), { target: { value: 'TEAMS' } })
    await waitFor(() => {
      expect(getGlobalInternalNotificationAttemptsMock).toHaveBeenLastCalledWith({
        limit: 50,
        offset: 0,
        outcome: 'FAILED',
        channel: 'TEAMS',
        retryableOnly: undefined,
      })
    })

    // toggle retryableOnly
    fireEvent.click(screen.getByRole('checkbox', { name: /Tylko mozliwe do ponowienia/ }))
    await waitFor(() => {
      expect(getGlobalInternalNotificationAttemptsMock).toHaveBeenLastCalledWith({
        limit: 50,
        offset: 0,
        outcome: 'FAILED',
        channel: 'TEAMS',
        retryableOnly: true,
      })
    })
  })

  it('clears all filters via the reset button', async () => {
    getGlobalInternalNotificationAttemptsMock.mockResolvedValue({
      items: [makeAttempt()],
      total: 1,
    })

    renderPage()
    await screen.findByRole('link', { name: 'FNP-20260411-ABC123' })

    fireEvent.change(screen.getByLabelText('Filtr wynik'), { target: { value: 'FAILED' } })
    fireEvent.change(screen.getByLabelText('Filtr kanal'), { target: { value: 'EMAIL' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Tylko mozliwe do ponowienia/ }))

    fireEvent.click(await screen.findByRole('button', { name: 'Wyczysc filtry' }))

    await waitFor(() => {
      expect(getGlobalInternalNotificationAttemptsMock).toHaveBeenLastCalledWith({
        limit: 50,
        offset: 0,
        outcome: undefined,
        channel: undefined,
        retryableOnly: undefined,
      })
    })

    expect(screen.queryByRole('button', { name: 'Wyczysc filtry' })).toBeNull()
  })

  it('retry reloads data using currently active filters', async () => {
    getGlobalInternalNotificationAttemptsMock.mockResolvedValue({
      items: [makeAttempt()],
      total: 1,
    })

    renderPage()
    await screen.findByRole('link', { name: 'FNP-20260411-ABC123' })

    fireEvent.change(screen.getByLabelText('Filtr wynik'), { target: { value: 'FAILED' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Tylko mozliwe do ponowienia/ }))

    await waitFor(() => {
      expect(getGlobalInternalNotificationAttemptsMock).toHaveBeenLastCalledWith({
        limit: 50,
        offset: 0,
        outcome: 'FAILED',
        channel: undefined,
        retryableOnly: true,
      })
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Ponow' }))

    await waitFor(() => {
      expect(getGlobalInternalNotificationAttemptsMock).toHaveBeenLastCalledWith({
        limit: 50,
        offset: 0,
        outcome: 'FAILED',
        channel: undefined,
        retryableOnly: true,
      })
    })
    expect(retryInternalNotificationAttemptMock).toHaveBeenCalledWith('request-1', 'attempt-1')
  })

  it('shows retry error feedback without clearing loaded attempts', async () => {
    retryInternalNotificationAttemptMock.mockRejectedValueOnce(new Error('API unavailable'))

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Ponow' }))

    expect(await screen.findByText('Nie udalo sie ponowic proby dostarczenia.')).toBeTruthy()
    expect(screen.getByText('Zmiana statusu sprawy')).toBeTruthy()
    expect(getGlobalInternalNotificationAttemptsMock).toHaveBeenCalledTimes(1)
  })
})
