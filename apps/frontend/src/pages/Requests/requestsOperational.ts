import type {
  CommercialOwnerFilter,
  NotificationHealthFilter,
  PortingCaseStatus,
  PortingMode,
  PortingRequestListQueryDto,
  PortingRequestOperationalSummaryDto,
  PortingRequestSummaryQueryDto,
} from '@np-manager/shared'
import type { OwnershipFilter } from '@/lib/portingOwnership'

const COMMERCIAL_OWNER_FILTERS: CommercialOwnerFilter[] = [
  'ALL',
  'WITH_OWNER',
  'WITHOUT_OWNER',
  'MINE',
]

const NOTIFICATION_HEALTH_FILTERS: NotificationHealthFilter[] = [
  'ALL',
  'HAS_FAILURES',
  'NO_FAILURES',
]

export interface RequestsOperationalFilterState {
  searchInput: string
  statusFilter: PortingCaseStatus | null
  portingModeFilter: PortingMode | null
  donorOperatorId: string
  ownershipFilter: OwnershipFilter
  commercialOwnerFilter: CommercialOwnerFilter
  notificationHealthFilter: NotificationHealthFilter
  page: number
  pageSize: number
}

export interface RequestsSummaryCard {
  id: 'ALL' | 'WITH_OWNER' | 'WITHOUT_OWNER' | 'MINE' | 'HAS_FAILURES'
  title: string
  value: number
  isActive: boolean
  filterUpdates: Record<string, string | null>
}

export function parseCommercialOwnerFilter(value: string | null): CommercialOwnerFilter {
  if (value && COMMERCIAL_OWNER_FILTERS.includes(value as CommercialOwnerFilter)) {
    return value as CommercialOwnerFilter
  }

  return 'ALL'
}

export function parseNotificationHealthFilter(value: string | null): NotificationHealthFilter {
  if (value && NOTIFICATION_HEALTH_FILTERS.includes(value as NotificationHealthFilter)) {
    return value as NotificationHealthFilter
  }

  return 'ALL'
}

export function buildListQueryFromFilters(
  filters: RequestsOperationalFilterState,
): PortingRequestListQueryDto {
  return {
    search: filters.searchInput || undefined,
    status: filters.statusFilter ?? undefined,
    portingMode: filters.portingModeFilter ?? undefined,
    donorOperatorId: filters.donorOperatorId || undefined,
    ownership: filters.ownershipFilter !== 'ALL' ? filters.ownershipFilter : undefined,
    commercialOwnerFilter:
      filters.commercialOwnerFilter !== 'ALL' ? filters.commercialOwnerFilter : undefined,
    notificationHealthFilter:
      filters.notificationHealthFilter !== 'ALL'
        ? filters.notificationHealthFilter
        : undefined,
    page: filters.page,
    pageSize: filters.pageSize,
  }
}

export function buildSummaryQueryFromFilters(
  filters: RequestsOperationalFilterState,
): PortingRequestSummaryQueryDto {
  return {
    search: filters.searchInput || undefined,
    status: filters.statusFilter ?? undefined,
    portingMode: filters.portingModeFilter ?? undefined,
    donorOperatorId: filters.donorOperatorId || undefined,
    ownership: filters.ownershipFilter !== 'ALL' ? filters.ownershipFilter : undefined,
  }
}

export function hasActiveRequestsFilters(filters: RequestsOperationalFilterState): boolean {
  return (
    !!filters.searchInput ||
    !!filters.statusFilter ||
    !!filters.portingModeFilter ||
    !!filters.donorOperatorId ||
    filters.ownershipFilter !== 'ALL' ||
    filters.commercialOwnerFilter !== 'ALL' ||
    filters.notificationHealthFilter !== 'ALL'
  )
}

export function applyQueryParamUpdates(
  previousParams: URLSearchParams,
  updates: Record<string, string | null>,
): URLSearchParams {
  const next = new URLSearchParams(previousParams)

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === '') {
      next.delete(key)
    } else {
      next.set(key, value)
    }
  }

  return next
}

export function buildRequestsSummaryCards(
  summary: PortingRequestOperationalSummaryDto,
  filters: RequestsOperationalFilterState,
): RequestsSummaryCard[] {
  const allActive =
    filters.commercialOwnerFilter === 'ALL' && filters.notificationHealthFilter === 'ALL'

  return [
    {
      id: 'ALL',
      title: 'Wszystkie',
      value: summary.totalRequests,
      isActive: allActive,
      filterUpdates: {
        commercialOwnerFilter: null,
        notificationHealthFilter: null,
        page: null,
      },
    },
    {
      id: 'WITH_OWNER',
      title: 'Z opiekunem',
      value: summary.withCommercialOwner,
      isActive: filters.commercialOwnerFilter === 'WITH_OWNER',
      filterUpdates: {
        commercialOwnerFilter: 'WITH_OWNER',
        notificationHealthFilter: null,
        page: null,
      },
    },
    {
      id: 'WITHOUT_OWNER',
      title: 'Bez opiekuna',
      value: summary.withoutCommercialOwner,
      isActive: filters.commercialOwnerFilter === 'WITHOUT_OWNER',
      filterUpdates: {
        commercialOwnerFilter: 'WITHOUT_OWNER',
        notificationHealthFilter: null,
        page: null,
      },
    },
    {
      id: 'MINE',
      title: 'Moje handlowe',
      value: summary.myCommercialRequests,
      isActive: filters.commercialOwnerFilter === 'MINE',
      filterUpdates: {
        commercialOwnerFilter: 'MINE',
        notificationHealthFilter: null,
        page: null,
      },
    },
    {
      id: 'HAS_FAILURES',
      title: 'Bledy notyfikacji',
      value: summary.requestsWithNotificationFailures,
      isActive: filters.notificationHealthFilter === 'HAS_FAILURES',
      filterUpdates: {
        commercialOwnerFilter: null,
        notificationHealthFilter: 'HAS_FAILURES',
        page: null,
      },
    },
  ]
}
