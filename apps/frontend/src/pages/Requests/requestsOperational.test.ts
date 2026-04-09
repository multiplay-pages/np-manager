import { describe, expect, it } from 'vitest'
import type { PortingCaseStatus, PortingMode } from '@np-manager/shared'
import {
  applyQueryParamUpdates,
  buildListQueryFromFilters,
  buildRequestsSummaryCards,
  buildSummaryQueryFromFilters,
  hasActiveRequestsFilters,
  parseCommercialOwnerFilter,
  parseNotificationHealthFilter,
  type RequestsOperationalFilterState,
} from './requestsOperational'

function makeFilters(
  overrides: Partial<RequestsOperationalFilterState> = {},
): RequestsOperationalFilterState {
  return {
    searchInput: '',
    statusFilter: null as PortingCaseStatus | null,
    portingModeFilter: null as PortingMode | null,
    donorOperatorId: '',
    ownershipFilter: 'ALL',
    commercialOwnerFilter: 'ALL',
    notificationHealthFilter: 'ALL',
    page: 1,
    pageSize: 20,
    ...overrides,
  }
}

describe('requestsOperational helpers', () => {
  it('parses operational filters from URL values', () => {
    expect(parseCommercialOwnerFilter('WITH_OWNER')).toBe('WITH_OWNER')
    expect(parseCommercialOwnerFilter('unknown')).toBe('ALL')
    expect(parseCommercialOwnerFilter(null)).toBe('ALL')

    expect(parseNotificationHealthFilter('HAS_FAILURES')).toBe('HAS_FAILURES')
    expect(parseNotificationHealthFilter('x')).toBe('ALL')
    expect(parseNotificationHealthFilter(null)).toBe('ALL')
  })

  it('builds backend list query with operational filters and pagination', () => {
    const query = buildListQueryFromFilters(
      makeFilters({
        searchInput: 'FNP-2026',
        statusFilter: 'SUBMITTED',
        portingModeFilter: 'DAY',
        donorOperatorId: 'operator-1',
        ownershipFilter: 'MINE',
        commercialOwnerFilter: 'WITHOUT_OWNER',
        notificationHealthFilter: 'HAS_FAILURES',
        page: 3,
      }),
    )

    expect(query).toEqual({
      search: 'FNP-2026',
      status: 'SUBMITTED',
      portingMode: 'DAY',
      donorOperatorId: 'operator-1',
      ownership: 'MINE',
      commercialOwnerFilter: 'WITHOUT_OWNER',
      notificationHealthFilter: 'HAS_FAILURES',
      page: 3,
      pageSize: 20,
    })
  })

  it('builds summary query without commercial owner/notification filters', () => {
    const query = buildSummaryQueryFromFilters(
      makeFilters({
        searchInput: 'FNP',
        statusFilter: 'SUBMITTED',
        ownershipFilter: 'MINE',
        commercialOwnerFilter: 'MINE',
        notificationHealthFilter: 'HAS_FAILURES',
      }),
    )

    expect(query).toEqual({
      search: 'FNP',
      status: 'SUBMITTED',
      ownership: 'MINE',
    })
    expect(query).not.toHaveProperty('commercialOwnerFilter')
    expect(query).not.toHaveProperty('notificationHealthFilter')
  })

  it('builds summary cards with values and active state', () => {
    const cards = buildRequestsSummaryCards(
      {
        totalRequests: 50,
        withCommercialOwner: 20,
        withoutCommercialOwner: 30,
        myCommercialRequests: 8,
        requestsWithNotificationFailures: 5,
      },
      makeFilters({ commercialOwnerFilter: 'MINE' }),
    )

    const mineCard = cards.find((card) => card.id === 'MINE')
    expect(mineCard?.value).toBe(8)
    expect(mineCard?.isActive).toBe(true)

    const failuresCard = cards.find((card) => card.id === 'HAS_FAILURES')
    expect(failuresCard?.value).toBe(5)
    expect(failuresCard?.isActive).toBe(false)
  })

  it('applies filter updates to URL params and resets pagination for card clicks', () => {
    const before = new URLSearchParams('search=fnp&page=3')
    const after = applyQueryParamUpdates(before, {
      commercialOwnerFilter: 'WITHOUT_OWNER',
      page: null,
    })

    expect(after.get('search')).toBe('fnp')
    expect(after.get('commercialOwnerFilter')).toBe('WITHOUT_OWNER')
    expect(after.get('page')).toBeNull()
  })

  it('detects active filters for operational view state', () => {
    expect(hasActiveRequestsFilters(makeFilters())).toBe(false)
    expect(hasActiveRequestsFilters(makeFilters({ notificationHealthFilter: 'HAS_FAILURES' }))).toBe(
      true,
    )
  })
})
