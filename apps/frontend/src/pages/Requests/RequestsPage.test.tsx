// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PortingRequestListItemDto } from '@np-manager/shared'

const {
  assignPortingRequestToMeMock,
  getPortingRequestsMock,
  getPortingRequestsSummaryMock,
} = vi.hoisted(() => ({
  assignPortingRequestToMeMock: vi.fn(),
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
  useAuthStore: (selector: (state: { user: { id: string; role: string } }) => unknown) =>
    selector({
      user: {
        id: 'bok-1',
        role: 'BOK_CONSULTANT',
      },
    }),
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

describe('RequestRow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    expect(html).toContain('Nie wyznaczono')
    expect(html).toContain('Data portowania')
  })

  it('renders Kopiuj numer button for all users', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest()}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Kopiuj numer')
  })

  it('renders Przypisz do mnie for eligible user when not yet assigned', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({ assignedUserSummary: null })}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
            currentUserId="bok-1"
            canAssign={true}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Przypisz do mnie')
  })

  it('hides Przypisz do mnie when already assigned to current user', () => {
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
            formatDate={() => '09.04.2026'}
            currentUserId="bok-1"
            canAssign={true}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).not.toContain('Przypisz do mnie')
  })

  it('hides Przypisz do mnie for user without assignment rights', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({ assignedUserSummary: null })}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
            currentUserId="sales-1"
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).not.toContain('Przypisz do mnie')
  })

  it('shows Przypisz do mnie for different user assigned (not mine)', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({
              assignedUserSummary: {
                id: 'other-bok',
                email: 'other@np-manager.local',
                displayName: 'Inny BOK',
                role: 'BOK_CONSULTANT',
              },
            })}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
            currentUserId="bok-1"
            canAssign={true}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Przypisz do mnie')
  })

  it('shows amber styling for unassigned BOK', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({ assignedUserSummary: null })}
            onClick={() => undefined}
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

  it('shows "Brak daty" hint when confirmedPortDate is missing', () => {
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          <RequestRow
            request={makeRequest({ confirmedPortDate: null })}
            onClick={() => undefined}
            formatDate={() => '09.04.2026'}
            currentUserId={null}
            canAssign={false}
            onAssignToMe={noop}
          />
        </tbody>
      </table>,
    )

    expect(html).toContain('Brak daty')
    expect(html).toContain('Nie wyznaczono')
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
    fireEvent.click(quickFilters.getByRole('button', { name: 'Pilne' }))

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
    await screen.findByText('Sprawy portowania')

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
})
