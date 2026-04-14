import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, ButtonLink, FilterChip, MetricCard, PageHeader, cx } from '@/components/ui'
import { buildPath, ROUTES } from '@/constants/routes'
import { useOperators } from '@/hooks/useOperators'
import {
  formatAssigneeLabel,
  parseOwnershipFilter,
  type OwnershipFilter,
} from '@/lib/portingOwnership'
import { getPortingStatusMeta } from '@/lib/portingStatusMeta'
import {
  getPortingRequests,
  getPortingRequestsSummary,
} from '@/services/portingRequests.api'
import {
  PORTING_CASE_STATUSES,
  PORTING_MODE_LABELS,
} from '@np-manager/shared'
import type {
  CommercialOwnerFilter,
  NotificationHealthFilter,
  NotificationHealthStatus,
  PortingCaseStatus,
  PortingMode,
  PortingRequestAssigneeSummaryDto,
  PortingRequestListItemDto,
  PortingRequestListResultDto,
  PortingRequestOperationalSummaryDto,
} from '@np-manager/shared'
import {
  applyQueryParamUpdates,
  buildListQueryFromFilters,
  buildRequestsSummaryCards,
  buildSummaryQueryFromFilters,
  hasActiveRequestsFilters,
  parseCommercialOwnerFilter,
  parseNotificationHealthFilter,
} from './requestsOperational'

const PAGE_SIZE = 20
const PORTING_MODES: PortingMode[] = ['DAY', 'END', 'EOP']

const ownershipOptions: Array<{ id: OwnershipFilter; label: string }> = [
  { id: 'ALL', label: 'Wszystkie' },
  { id: 'MINE', label: 'Moje sprawy' },
  { id: 'UNASSIGNED', label: 'Nieprzypisane' },
]

const commercialOwnerOptions: Array<{ id: CommercialOwnerFilter; label: string }> = [
  { id: 'ALL', label: 'Wszystkie' },
  { id: 'WITH_OWNER', label: 'Z opiekunem' },
  { id: 'WITHOUT_OWNER', label: 'Bez opiekuna' },
  { id: 'MINE', label: 'Moje handlowe' },
]

const notificationHealthOptions: Array<{ id: NotificationHealthFilter; label: string }> = [
  { id: 'ALL', label: 'Wszystkie' },
  { id: 'HAS_FAILURES', label: 'Bledy notyfikacji' },
  { id: 'NO_FAILURES', label: 'Bez bledow' },
]

function parseStatus(value: string | null): PortingCaseStatus | null {
  const valid = Object.values(PORTING_CASE_STATUSES) as PortingCaseStatus[]
  return value && valid.includes(value as PortingCaseStatus) ? (value as PortingCaseStatus) : null
}

function parsePortingMode(value: string | null): PortingMode | null {
  return value && PORTING_MODES.includes(value as PortingMode) ? (value as PortingMode) : null
}

function parsePage(value: string | null): number {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

function formatCommercialOwnerLabel(assignee: PortingRequestAssigneeSummaryDto | null): string {
  if (!assignee) {
    return 'Brak opiekuna'
  }

  return `${assignee.displayName} (${assignee.email})`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function pluralizeRequests(total: number): string {
  return total === 1 ? 'sprawa' : total < 5 ? 'sprawy' : 'spraw'
}

function StatusBadge({ status }: { status: PortingCaseStatus }) {
  const meta = getPortingStatusMeta(status)
  const toneByStatus = {
    gray: 'neutral',
    blue: 'brand',
    amber: 'amber',
    green: 'green',
    red: 'red',
    emerald: 'emerald',
  } as const
  const tone = toneByStatus[meta.tone]

  return <Badge tone={tone}>{meta.label}</Badge>
}

function NotificationHealthBadge({ request }: { request: PortingRequestListItemDto }) {
  const { notificationHealthStatus, notificationFailureCount, notificationLastFailureAt } = request

  const statusConfig: Record<
    NotificationHealthStatus,
    { label: string; tone: 'emerald' | 'red' | 'amber' | 'orange' }
  > = {
    OK: { label: 'OK', tone: 'emerald' },
    FAILED: { label: 'Blad wysylki', tone: 'red' },
    MISCONFIGURED: { label: 'Blad konfiguracji', tone: 'amber' },
    MIXED: { label: 'Bledy mieszane', tone: 'orange' },
  }

  const config = statusConfig[notificationHealthStatus]

  if (notificationHealthStatus === 'OK') {
    return <Badge tone={config.tone}>OK</Badge>
  }

  const lastFailureDate = notificationLastFailureAt ? formatDate(notificationLastFailureAt) : null

  return (
    <div className="flex flex-col gap-1">
      <Badge tone={config.tone}>{config.label}</Badge>
      <span className="text-xs leading-5 text-ink-500">
        {notificationFailureCount} {notificationFailureCount === 1 ? 'blad' : 'bledow'}
        {lastFailureDate ? `, ost. ${lastFailureDate}` : ''}
      </span>
    </div>
  )
}

function FilterGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

export function RequestRow({
  request,
  onClick,
  formatDate: formatDateValue,
}: {
  request: PortingRequestListItemDto
  onClick: () => void
  formatDate: (value: string) => string
}) {
  const ownerLabel = formatCommercialOwnerLabel(request.commercialOwnerSummary)
  const assigneeLabel = formatAssigneeLabel(request.assignedUserSummary)

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b border-line transition-colors last:border-b-0 hover:bg-brand-50/70"
    >
      <td className="px-5 py-4 align-top">
        <div className="font-mono text-xs font-semibold text-ink-700">{request.caseNumber}</div>
        <div className="mt-1 text-xs text-ink-400">{formatDateValue(request.createdAt)}</div>
      </td>
      <td className="px-5 py-4 align-top">
        <div className="max-w-[240px] truncate text-sm font-semibold text-ink-900">
          {request.clientDisplayName}
        </div>
        <div className="mt-1 font-mono text-xs text-ink-500">{request.numberDisplay}</div>
      </td>
      <td className="px-5 py-4 align-top">
        <div className="max-w-[180px] truncate text-sm text-ink-650">{request.donorOperatorName}</div>
        <div className="mt-1 text-xs font-semibold text-ink-400">
          {PORTING_MODE_LABELS[request.portingMode]}
        </div>
      </td>
      <td className="px-5 py-4 align-top">
        <StatusBadge status={request.statusInternal} />
      </td>
      <td className="px-5 py-4 align-top">
        <div className="max-w-[220px] truncate text-sm font-medium text-ink-700">
          {assigneeLabel}
        </div>
        <div className="mt-1 text-xs text-ink-400">BOK</div>
      </td>
      <td className="px-5 py-4 align-top">
        <div
          className={cx(
            'max-w-[260px] truncate text-sm font-semibold',
            request.commercialOwnerSummary ? 'text-ink-800' : 'text-amber-800',
          )}
        >
          {ownerLabel}
        </div>
        <div className="mt-1 text-xs text-ink-400">Opiekun handlowy</div>
      </td>
      <td className="px-5 py-4 align-top">
        <NotificationHealthBadge request={request} />
      </td>
    </tr>
  )
}

export function RequestsPage() {
  const navigate = useNavigate()
  const { operators } = useOperators()
  const [searchParams, setSearchParams] = useSearchParams()

  const searchInput = searchParams.get('search') ?? ''
  const statusFilter = parseStatus(searchParams.get('status'))
  const portingModeFilter = parsePortingMode(searchParams.get('portingMode'))
  const donorOperatorId = searchParams.get('donorOperatorId') ?? ''
  const ownershipFilter = parseOwnershipFilter(searchParams.get('ownership'))
  const commercialOwnerFilter = parseCommercialOwnerFilter(searchParams.get('commercialOwnerFilter'))
  const notificationHealthFilter = parseNotificationHealthFilter(
    searchParams.get('notificationHealthFilter'),
  )
  const page = parsePage(searchParams.get('page'))

  const filters = useMemo(
    () => ({
      searchInput,
      statusFilter,
      portingModeFilter,
      donorOperatorId,
      ownershipFilter,
      commercialOwnerFilter,
      notificationHealthFilter,
      page,
      pageSize: PAGE_SIZE,
    }),
    [
      commercialOwnerFilter,
      donorOperatorId,
      notificationHealthFilter,
      ownershipFilter,
      page,
      portingModeFilter,
      searchInput,
      statusFilter,
    ],
  )

  const [localSearch, setLocalSearch] = useState(searchInput)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const prevSearchInput = useRef(searchInput)
  if (prevSearchInput.current !== searchInput && localSearch !== searchInput) {
    setLocalSearch(searchInput)
    prevSearchInput.current = searchInput
  }

  const [result, setResult] = useState<PortingRequestListResultDto | null>(null)
  const [summary, setSummary] = useState<PortingRequestOperationalSummaryDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams((prev) => applyQueryParamUpdates(prev, updates))
    },
    [setSearchParams],
  )

  const hasActiveFilters = hasActiveRequestsFilters(filters)

  const clearFilters = () => {
    setLocalSearch('')
    setSearchParams({})
  }

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setParam({ search: value || null, page: null })
    }, 400)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [listData, summaryData] = await Promise.all([
        getPortingRequests(buildListQueryFromFilters(filters)),
        getPortingRequestsSummary(buildSummaryQueryFromFilters(filters)),
      ])

      setResult(listData)
      setSummary(summaryData)
    } catch {
      setError('Nie udalo sie zaladowac listy spraw portowania.')
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const { items = [], pagination } = result ?? {}
  const summaryCards = summary ? buildRequestsSummaryCards(summary, filters) : []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacje"
        title="Sprawy portowania"
        description={
          pagination ? (
            <>
              {pagination.total} {pluralizeRequests(pagination.total)} w aktualnym widoku.
            </>
          ) : (
            'Lista operacyjna spraw z filtrami ownership, statusu i zdrowia notyfikacji.'
          )
        }
        actions={
          <ButtonLink to={ROUTES.REQUEST_NEW} variant="primary">
            + Nowa sprawa
          </ButtonLink>
        }
      />

      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <MetricCard
              key={card.id}
              title={card.title}
              value={card.value}
              active={card.isActive}
              detail={card.id === 'HAS_FAILURES' ? 'Wymaga kontroli operacyjnej' : 'Szybki filtr listy'}
              onClick={() => setParam(card.filterUpdates)}
            />
          ))}
        </div>
      )}

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <input
                type="search"
                value={localSearch}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="input-field h-11 pl-10"
                placeholder="Szukaj po numerze sprawy, telefonie lub kliencie..."
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">
                S
              </span>
            </div>
            <select
              value={donorOperatorId}
              onChange={(event) => {
                setParam({ donorOperatorId: event.target.value || null, page: null })
              }}
              className="input-field h-11 lg:max-w-[260px]"
            >
              <option value="">Wszyscy dawcy</option>
              {operators.map((operator) => (
                <option key={operator.id} value={operator.id}>
                  {operator.name}
                </option>
              ))}
            </select>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="ghost" className="h-11">
                Wyczysc filtry
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 xl:grid-cols-[1.15fr_0.85fr]">
          <FilterGroup label="Status">
            <FilterChip active={!statusFilter} onClick={() => setParam({ status: null, page: null })}>
              Wszystkie
            </FilterChip>
            {(Object.values(PORTING_CASE_STATUSES) as PortingCaseStatus[]).map((status) => {
              const meta = getPortingStatusMeta(status)
              const isActive = statusFilter === status
              return (
                <FilterChip
                  key={status}
                  active={isActive}
                  onClick={() => setParam({ status: isActive ? null : status, page: null })}
                >
                  {meta.label}
                </FilterChip>
              )
            })}
          </FilterGroup>

          <FilterGroup label="Tryb portowania">
            <FilterChip
              active={!portingModeFilter}
              onClick={() => setParam({ portingMode: null, page: null })}
            >
              Wszystkie
            </FilterChip>
            {PORTING_MODES.map((mode) => {
              const isActive = portingModeFilter === mode
              return (
                <FilterChip
                  key={mode}
                  active={isActive}
                  onClick={() => setParam({ portingMode: isActive ? null : mode, page: null })}
                >
                  {PORTING_MODE_LABELS[mode]}
                </FilterChip>
              )
            })}
          </FilterGroup>

          <FilterGroup label="Przypisanie BOK">
            {ownershipOptions.map((filter) => (
              <FilterChip
                key={filter.id}
                active={ownershipFilter === filter.id}
                onClick={() => setParam({ ownership: filter.id === 'ALL' ? null : filter.id, page: null })}
              >
                {filter.label}
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup label="Opiekun i notyfikacje">
            {commercialOwnerOptions.map((filter) => (
              <FilterChip
                key={filter.id}
                active={commercialOwnerFilter === filter.id}
                onClick={() =>
                  setParam({
                    commercialOwnerFilter: filter.id === 'ALL' ? null : filter.id,
                    page: null,
                  })
                }
              >
                {filter.label}
              </FilterChip>
            ))}
            {notificationHealthOptions.map((filter) => (
              <FilterChip
                key={filter.id}
                active={notificationHealthFilter === filter.id}
                onClick={() =>
                  setParam({
                    notificationHealthFilter: filter.id === 'ALL' ? null : filter.id,
                    page: null,
                  })
                }
              >
                {filter.label}
              </FilterChip>
            ))}
          </FilterGroup>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Lista spraw</h2>
            <p className="mt-1 text-xs text-ink-500">
              Status, opiekun i health notyfikacji sa widoczne bez wchodzenia w szczegoly.
            </p>
          </div>
          {pagination && (
            <Badge tone="neutral">
              {pagination.total} {pluralizeRequests(pagination.total)}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm font-medium text-ink-500">
            Ladowanie listy...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <Button onClick={() => void loadData()} variant="secondary" size="sm">
              Sprobuj ponownie
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm font-semibold text-ink-800">Brak spraw portowania</p>
            <p className="max-w-md text-sm leading-6 text-ink-500">
              {hasActiveFilters
                ? 'Zadna sprawa nie pasuje do podanych kryteriow.'
                : 'Utworz pierwsza sprawe przyciskiem powyzej.'}
            </p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="secondary" size="sm">
                Wyczysc filtry
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-ink-50 text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">
                <tr>
                  <th className="px-5 py-3 text-left">Sprawa</th>
                  <th className="px-5 py-3 text-left">Klient i numer</th>
                  <th className="px-5 py-3 text-left">Operator / tryb</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Przypisanie</th>
                  <th className="px-5 py-3 text-left">Owner</th>
                  <th className="min-w-[130px] whitespace-nowrap px-5 py-3 text-left">Notyfikacje</th>
                </tr>
              </thead>
              <tbody>
                {items.map((request) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    onClick={() => void navigate(buildPath(ROUTES.REQUEST_DETAIL, request.id))}
                    formatDate={formatDate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-500">
            Strona {pagination.page} z {pagination.totalPages}
            {' | '}
            {pagination.total} rekordow
          </p>
          <div className="flex gap-2">
            <Button
              disabled={page <= 1}
              onClick={() => setParam({ page: String(page - 1) })}
              variant="secondary"
              size="sm"
            >
              Poprzednia
            </Button>
            <Button
              disabled={page >= pagination.totalPages}
              onClick={() => setParam({ page: String(page + 1) })}
              variant="secondary"
              size="sm"
            >
              Nastepna
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
