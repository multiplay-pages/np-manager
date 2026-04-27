// @vitest-environment jsdom
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PortingRequestListItemDto } from '@np-manager/shared'

const {
  assignPortingRequestToMeMock,
  clipboardWriteTextMock,
  currentUserState,
  getPortingRequestsMock,
  getPortingRequestsSummaryMock,
} = vi.hoisted(() => ({
  assignPortingRequestToMeMock: vi.fn(),
  clipboardWriteTextMock: vi.fn(),
  currentUserState: {
    user: {
      id: 'bok-1',
      role: 'BOK_CONSULTANT',
    },
  },
  getPortingRequestsMock: vi.fn(),
  getPortingRequestsSummaryMock: vi.fn(),
}))

vi.mock('@/hooks/useOperators', () => ({
  useOperators: () => ({
    operators: [],
  }),
}))

vi.mock('@/services/portingRequests.api', () => ({
  assignPortingRequestToMe: (...args: unknown[]) => assignPortingRequestToMeMock(...args),
  getPortingRequests: (...args: unknown[]) => getPortingRequestsMock(...args),
  getPortingRequestsSummary: (...args: unknown[]) => getPortingRequestsSummaryMock(...args),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: typeof currentUserState) => unknown) => selector(currentUserState),
}))

import { RequestRow, RequestsPage } from './RequestsPage'

function makeRequest(overrides: Partial<PortingRequestListItemDto> = {}): PortingRequestListItemDto {
  return {
    id: 'request-1',
    caseNumber: 'FNP-20260409-ABC123',
    clientId: 'client-1',
    clientDisplayName: 'Jan Kowalski',
    numberDisplay: '221234567',
    confirmedPortDate: null,
    donorOperatorId: 'operator-1',
    donorOperatorName: 'Orange Polska',
    portingMode: 'DAY',
    statusInternal: 'SUBMITTED',
    assignedUserSummary: null,
    commercialOwnerSummary: null,
    hasNotificationFailures: false,
    notificationHealthStatus: 'OK',
    notificationFailureCount: 0,
    notificationLastFailureAt: null,
    notificationLastFailureOutcome: null,
    createdAt: '2026-04-09T10:00:00.000Z',
    ...overrides,
  }
}

const noop = async () => {}

function mockListResult() {
  return {
    items: [makeRequest()],
    pagination: {
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    },
  }
}

function mockSummaryResult() {
  return {
    totalRequests: 1,
    withCommercialOwner: 0,
    withoutCommercialOwner: 1,
    myCommercialRequests: 0,
    requestsWithNotificationFailures: 0,
    quickWorkCounts: {
      urgent: 0,
      noDate: 0,
      needsActionToday: 0,
    },
  }
}

function renderPage(initialEntry = '/requests') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/requests" element={<RequestsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function LocationProbe() {
  const location = useLocation()
  const listSearch =
    typeof location.state === 'object' && location.state !== null && 'listSearch' in location.state
      ? String(location.state.listSearch)
      : ''

  return (
    <div>
      <div data-testid="location-path">{location.pathname}</div>
      <div data-testid="location-search">{location.search}</div>
      <div data-testid="location-list-search">{listSearch}</div>
    </div>
  )
}

function renderPageWithDetail(initialEntry = '/requests') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/requests/:caseNumber" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderRow(
  overrides: Partial<ComponentProps<typeof RequestRow>> = {},
  requestOverrides: Partial<PortingRequestListItemDto> = {},
) {
  return render(
    <table>
      <tbody>
        <RequestRow
          request={makeRequest(requestOverrides)}
          onClick={() => undefined}
          requestPath="/requests/FNP-20260409-ABC123"
          formatDate={() => '09.04.2026'}
          currentUserId="bok-1"
          canAssign={true}
          onAssignToMe={noop}
          {...overrides}
        />
      </tbody>
    </table>,
  )
}

function openRowActions() {
  fireEvent.click(
    screen.getByRole('button', { name: 'Akcje dla sprawy FNP-20260409-ABC123' }),
  )
}

describe('RequestRow', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    currentUserState.user = {
      id: 'bok-1',
      role: 'BOK_CONSULTANT',
    }
    Object.defineProperty(window.navigator, 'clipboard', {
      value: {
        writeText: clipboardWriteTextMock,
      },
      configurable: true,
    })
    clipboardWriteTextMock.mockResolvedValue(undefined)
  })

  it('shows commercial owner and failure signal badge', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({
              commercialOwnerSummary: {
                id: 'sales-1',
                email: 'sales-1@np-manager.local',
                displayName: 'Anna Handlowa',
                role: 'SALES',
              },
              hasNotificationFailures: true,
              notificationHealthStatus: 'FAILED',
              notificationFailureCount: 3,
              notificationLastFailureAt: '2026-04-09T10:00:00.000Z',
              notificationLastFailureOutcome: 'FAILED',
            })}
            onClick={() => undefined}
            requestPath="/requests/FNP-20260409-ABC123"
            formatDate={() => '09.04.2026'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Anna Handlowa (sales-1@np-manager.local)')
    expect(html).toContain('Blad wysylki')
    expect(html).toContain('3 bledow')
  })

  it('shows missing owner and healthy notification badge', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest()}
            onClick={() => undefined}
            requestPath="/requests/FNP-20260409-ABC123"
            formatDate={() => '09.04.2026'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Brak opiekuna')
    expect(html).toContain('OK')
    expect(html).toContain('Wymaga potwierdzenia')
    expect(html).toContain('Nie wyznaczono')
    expect(html).toContain('Data portowania')
  })

  it('shows row actions menu with the v1 action set', () => {
    renderRow()

    openRowActions()

    expect(screen.getByRole('menuitem', { name: 'Otworz sprawe' })).not.toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Kopiuj numer sprawy' })).not.toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Kopiuj link' })).not.toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Przypisz do mnie' })).not.toBeNull()
  })

  it('shows assign-to-me only for unassigned requests', () => {
    renderRow(
      {},
      {
        assignedUserSummary: {
          id: 'other-bok',
          email: 'other@np-manager.local',
          displayName: 'Inny BOK',
          role: 'BOK_CONSULTANT',
        },
      },
    )

    openRowActions()

    expect(screen.queryByRole('menuitem', { name: 'Przypisz do mnie' })).toBeNull()
  })

  it('hides assign-to-me for user without assignment rights', () => {
    renderRow({ canAssign: false, currentUserId: 'sales-1' }, { assignedUserSummary: null })

    openRowActions()

    expect(screen.queryByRole('menuitem', { name: 'Przypisz do mnie' })).toBeNull()
  })

  it('copies case number and shows lightweight feedback', async () => {
    renderRow()

    openRowActions()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Kopiuj numer sprawy' }))

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('FNP-20260409-ABC123')
    })
    expect(screen.getByText('Skopiowano numer sprawy.')).not.toBeNull()
  })

  it('copies request link and shows lightweight feedback', async () => {
    renderRow()

    openRowActions()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Kopiuj link' }))

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(
        `${window.location.origin}/requests/FNP-20260409-ABC123`,
      )
    })
    expect(screen.getByText('Skopiowano link do sprawy.')).not.toBeNull()
  })

  it('shows amber styling for unassigned BOK', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({ assignedUserSummary: null })}
            onClick={() => undefined}
            requestPath="/requests/FNP-20260409-ABC123"
            formatDate={() => '09.04.2026'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('text-amber-700')
    expect(html).toContain('Nieprzypisana')
  })

  it('shows urgency badge for overdue date (past date is always OVERDUE)', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({ confirmedPortDate: '2020-01-01T00:00:00.000Z' })}
            onClick={() => undefined}
            requestPath="/requests/FNP-20260409-ABC123"
            formatDate={() => '01.01.2020'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Po terminie')
  })

  it('does not show "Po terminie" for PORTED request with past date', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({
              statusInternal: 'PORTED',
              confirmedPortDate: '2020-01-01T00:00:00.000Z',
            })}
            onClick={() => undefined}
            requestPath="/requests/FNP-20260409-ABC123"
            formatDate={() => '01.01.2020'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).not.toContain('Po terminie')
  })

  it('shows "Bez daty" hint when confirmedPortDate is missing', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({ confirmedPortDate: null })}
            onClick={() => undefined}
            requestPath="/requests/FNP-20260409-ABC123"
            formatDate={() => '09.04.2026'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Bez daty')
    expect(html).toContain('Nie wyznaczono')
  })

  it('shows donor-date hint for pending donor cases without confirmed port date', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({
              statusInternal: 'PENDING_DONOR',
              confirmedPortDate: null,
            })}
            onClick={() => undefined}
            requestPath="/requests/FNP-20260409-ABC123"
            formatDate={() => '09.04.2026'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Brak daty od dawcy')
  })

  it('shows client-contact hint for confirmed cases with a port date', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({
              statusInternal: 'CONFIRMED',
              confirmedPortDate: '2026-04-30',
            })}
            onClick={() => undefined}
            requestPath="/requests/FNP-20260409-ABC123"
            formatDate={() => '30.04.2026'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Do kontaktu z klientem')
  })

  it('shows normal ink styling for assigned BOK', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({
              assignedUserSummary: {
                id: 'bok-1',
                email: 'bok@np-manager.local',
                displayName: 'BOK Uzytkownik',
                role: 'BOK_CONSULTANT',
              },
            })}
            onClick={() => undefined}
            requestPath="/requests/FNP-20260409-ABC123"
            formatDate={() => '09.04.2026'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('text-ink-700')
    expect(html).not.toContain('text-amber-700')
  })
})

describe('RequestsPage quick work filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUserState.user = {
      id: 'bok-1',
      role: 'BOK_CONSULTANT',
    }
    Object.defineProperty(window.navigator, 'clipboard', {
      value: {
        writeText: clipboardWriteTextMock,
      },
      configurable: true,
    })
    clipboardWriteTextMock.mockResolvedValue(undefined)
    getPortingRequestsMock.mockResolvedValue(mockListResult())
    getPortingRequestsSummaryMock.mockResolvedValue(mockSummaryResult())
    assignPortingRequestToMeMock.mockResolvedValue({
      assignedUser: {
        id: 'bok-1',
        email: 'bok@np-manager.local',
        displayName: 'BOK Uzytkownik',
        role: 'BOK_CONSULTANT',
      },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('maps legacy ownership URL to the quick filter bar', async () => {
    renderPage('/requests?ownership=MINE')

    await waitFor(() => {
      expect(getPortingRequestsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ownership: 'MINE',
          page: 1,
          pageSize: 20,
        }),
      )
    })

    const quickFilters = within(
      screen.getByRole('region', { name: 'Szybkie filtry pracy' }),
    )
    expect(quickFilters.getByRole('button', { name: 'Moje' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })

  it('resets pagination and preserves existing filters when switching to a date-based quick filter', async () => {
    renderPage('/requests?search=ACME&page=3&status=SUBMITTED')

    await waitFor(() => {
      expect(getPortingRequestsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'ACME',
          status: 'SUBMITTED',
          page: 3,
          pageSize: 20,
        }),
      )
    })

    const quickFilters = within(
      screen.getByRole('region', { name: 'Szybkie filtry pracy' }),
    )
    fireEvent.click(quickFilters.getByRole('button', { name: /^Pilne/ }))

    await waitFor(() => {
      const lastListCall = getPortingRequestsMock.mock.calls.at(-1)?.[0]
      expect(lastListCall).toMatchObject({
        search: 'ACME',
        status: 'SUBMITTED',
        quickWorkFilter: 'URGENT',
        page: 1,
        pageSize: 20,
      })
      expect(lastListCall.ownership).toBeUndefined()
    })

    const lastSummaryCall = getPortingRequestsSummaryMock.mock.calls.at(-1)?.[0]
    expect(lastSummaryCall).toMatchObject({
      search: 'ACME',
      status: 'SUBMITTED',
    })
    expect(lastSummaryCall).not.toHaveProperty('quickWorkFilter')
  })

  it('maps the "Moje" quick filter to existing ownership semantics', async () => {
    renderPage()
    await screen.findByText('Kolejka spraw portowania')

    const quickFilters = within(
      screen.getByRole('region', { name: 'Szybkie filtry pracy' }),
    )
    fireEvent.click(quickFilters.getByRole('button', { name: 'Moje' }))

    await waitFor(() => {
      const lastListCall = getPortingRequestsMock.mock.calls.at(-1)?.[0]
      expect(lastListCall).toMatchObject({
        ownership: 'MINE',
        page: 1,
        pageSize: 20,
      })
      expect(lastListCall.quickWorkFilter).toBeUndefined()
    })
  })

  it('selects "Priorytet pracy" sort, syncs to URL and survives refresh', async () => {
    const { unmount } = renderPage()
    await screen.findByText('Kolejka spraw portowania')

    fireEvent.change(screen.getByLabelText('Sortowanie listy'), {
      target: { value: 'WORK_PRIORITY' },
    })

    await waitFor(() => {
      const lastListCall = getPortingRequestsMock.mock.calls.at(-1)?.[0]
      expect(lastListCall).toMatchObject({ sort: 'WORK_PRIORITY', page: 1 })
    })

    unmount()
    cleanup()
    getPortingRequestsMock.mockClear()

    renderPage('/requests?sort=WORK_PRIORITY')

    await waitFor(() => {
      const lastListCall = getPortingRequestsMock.mock.calls.at(-1)?.[0]
      expect(lastListCall).toMatchObject({ sort: 'WORK_PRIORITY' })
    })

    const sortSelect = screen.getByLabelText('Sortowanie listy') as HTMLSelectElement
    expect(sortSelect.value).toBe('WORK_PRIORITY')
  })

  it('clears the quick work filter when selecting "Wszystkie"', async () => {
    renderPage('/requests?quickWorkFilter=URGENT&page=2&status=SUBMITTED')

    await waitFor(() => {
      expect(getPortingRequestsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          quickWorkFilter: 'URGENT',
          status: 'SUBMITTED',
          page: 2,
          pageSize: 20,
        }),
      )
    })

    const quickFilters = within(
      screen.getByRole('region', { name: 'Szybkie filtry pracy' }),
    )
    fireEvent.click(quickFilters.getByRole('button', { name: 'Wszystkie' }))

    await waitFor(() => {
      const lastListCall = getPortingRequestsMock.mock.calls.at(-1)?.[0]
      expect(lastListCall).toMatchObject({
        status: 'SUBMITTED',
        page: 1,
        pageSize: 20,
      })
      expect(lastListCall.quickWorkFilter).toBeUndefined()
      expect(lastListCall.ownership).toBeUndefined()
    })
  })

  it('opens request action using canonical caseNumber route and preserves list search state', async () => {
    renderPageWithDetail('/requests?quickWorkFilter=URGENT&page=2&status=SUBMITTED')
    await screen.findByText('Kolejka spraw portowania')

    openRowActions()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Otworz sprawe' }))

    await waitFor(() => {
      expect(screen.getByTestId('location-path').textContent).toBe('/requests/FNP-20260409-ABC123')
    })
    expect(screen.getByTestId('location-search').textContent).toBe('')
    expect(screen.getByTestId('location-list-search').textContent).toBe(
      '?quickWorkFilter=URGENT&page=2&status=SUBMITTED',
    )
  })

  it('assigns to me, refreshes the visible queue and keeps current list state', async () => {
    getPortingRequestsMock
      .mockResolvedValueOnce(mockListResult())
      .mockResolvedValueOnce({
        items: [
          makeRequest({
            assignedUserSummary: {
              id: 'bok-1',
              email: 'bok@np-manager.local',
              displayName: 'BOK Uzytkownik',
              role: 'BOK_CONSULTANT',
            },
          }),
        ],
        pagination: {
          page: 2,
          pageSize: 20,
          total: 1,
          totalPages: 3,
        },
      })

    renderPage('/requests?quickWorkFilter=UNASSIGNED&page=2&sort=WORK_PRIORITY&status=SUBMITTED')
    await screen.findByText('Kolejka spraw portowania')

    openRowActions()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Przypisz do mnie' }))

    await waitFor(() => {
      expect(assignPortingRequestToMeMock).toHaveBeenCalledWith('request-1')
    })

    await waitFor(() => {
      expect(getPortingRequestsMock).toHaveBeenCalledTimes(2)
    })

    const refreshedListCall = getPortingRequestsMock.mock.calls.at(-1)?.[0]
    expect(refreshedListCall).toMatchObject({
      ownership: 'UNASSIGNED',
      sort: 'WORK_PRIORITY',
      status: 'SUBMITTED',
      page: 2,
      pageSize: 20,
    })
    expect(refreshedListCall.quickWorkFilter).toBeUndefined()

    const refreshedSummaryCall = getPortingRequestsSummaryMock.mock.calls.at(-1)?.[0]
    expect(refreshedSummaryCall).toMatchObject({
      status: 'SUBMITTED',
    })
    expect(refreshedSummaryCall).not.toHaveProperty('quickWorkFilter')
  })

  it('shows quickWorkCounts next to URGENT, NO_DATE, NEEDS_ACTION_TODAY chips', async () => {
    getPortingRequestsSummaryMock.mockResolvedValue({
      ...mockSummaryResult(),
      quickWorkCounts: { urgent: 4, noDate: 2, needsActionToday: 3 },
    })

    renderPage()
    await screen.findByText('Kolejka spraw portowania')

    const quickFilters = within(
      screen.getByRole('region', { name: 'Szybkie filtry pracy' }),
    )
    await waitFor(() => {
      expect(quickFilters.getByRole('button', { name: 'Pilne (4)' })).not.toBeNull()
      expect(quickFilters.getByRole('button', { name: 'Bez daty (2)' })).not.toBeNull()
      expect(quickFilters.getByRole('button', { name: 'Wymaga reakcji dzis (3)' })).not.toBeNull()
    })

    // Filters without counts stay unchanged
    expect(quickFilters.getByRole('button', { name: 'Wszystkie' })).not.toBeNull()
    expect(quickFilters.getByRole('button', { name: 'Moje' })).not.toBeNull()
    expect(quickFilters.getByRole('button', { name: 'Nieprzypisane' })).not.toBeNull()
  })
  it('shows clear feedback when assign-to-me fails', async () => {
    assignPortingRequestToMeMock.mockRejectedValueOnce(new Error('forbidden'))

    renderPage()
    await screen.findByText('Kolejka spraw portowania')

    openRowActions()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Przypisz do mnie' }))

    await waitFor(() => {
      expect(screen.getByText('Nie udało się przypisać sprawy.')).not.toBeNull()
    })
    expect(getPortingRequestsMock).toHaveBeenCalledTimes(1)
  })
})
