import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Badge, Button, ButtonLink, FilterChip, MetricCard, PageHeader, cx } from '@/components/ui'
import { buildPath, ROUTES } from '@/constants/routes'
import { useOperators } from '@/hooks/useOperators'
import {
  canManagePortingOwnership,
  formatAssigneeLabel,
  parseOwnershipFilter,
  type OwnershipFilter,
} from '@/lib/portingOwnership'
import { getPortingStatusMeta } from '@/lib/portingStatusMeta'
import { getWorkPriorityBadge } from '@/lib/portingUrgency'
import {
  assignPortingRequestToMe,
  getPortingRequests,
  getPortingRequestsSummary,
} from '@/services/portingRequests.api'
import { useAuthStore } from '@/stores/auth.store'
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
  PortingRequestListSort,
  PortingRequestOperationalSummaryDto,
} from '@np-manager/shared'
import {
  applyQueryParamUpdates,
  buildListQueryFromFilters,
  buildRequestsSummaryCards,
  buildSummaryQueryFromFilters,
  DEFAULT_REQUESTS_SORT,
  hasActiveRequestsFilters,
  parseCommercialOwnerFilter,
  parseListSort,
  parseNotificationHealthFilter,
  parseQuickWorkFilter,
  type RequestsQuickWorkFilter,
} from './requestsOperational'

const PAGE_SIZE = 20
const PORTING_MODES: PortingMode[] = ['DAY', 'END', 'EOP']
const ACTION_FEEDBACK_RESET_MS = 2000

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

const notificationQuickOptions: Array<{ id: 'ALL' | 'HAS_FAILURES'; label: string }> = [
  { id: 'ALL', label: 'Wszystkie' },
  { id: 'HAS_FAILURES', label: 'Bledy notyfikacji' },
]

const quickWorkFilterOptions: Array<{ id: RequestsQuickWorkFilter; label: string }> = [
  { id: 'ALL', label: 'Wszystkie' },
  { id: 'MINE', label: 'Moje' },
  { id: 'UNASSIGNED', label: 'Nieprzypisane' },
  { id: 'URGENT', label: 'Pilne' },
  { id: 'NO_DATE', label: 'Bez daty' },
  { id: 'NEEDS_ACTION_TODAY', label: 'Wymaga reakcji dzis' },
]

const commercialOwnerFilterLabels: Record<CommercialOwnerFilter, string> = {
  ALL: 'Wszystkie',
  WITH_OWNER: 'Z opiekunem',
  WITHOUT_OWNER: 'Bez opiekuna',
  MINE: 'Moje handlowe',
}

const quickWorkFilterLabels: Record<RequestsQuickWorkFilter, string> = {
  ALL: 'Wszystkie',
  MINE: 'Moje',
  UNASSIGNED: 'Nieprzypisane',
  URGENT: 'Pilne',
  NO_DATE: 'Bez daty',
  NEEDS_ACTION_TODAY: 'Wymaga reakcji dzis',
}

const notificationHealthFilterLabels: Record<NotificationHealthFilter, string> = {
  ALL: 'Wszystkie',
  HAS_FAILURES: 'Bledy notyfikacji',
  NO_FAILURES: 'Bez bledow',
}

const sortOptions: Array<{ id: PortingRequestListSort; label: string }> = [
  { id: 'CREATED_AT_DESC', label: 'Najnowsze' },
  { id: 'WORK_PRIORITY', label: 'Priorytet pracy' },
]

interface ActiveFilterChip {
  id: string
  label: string
  value: string
  updates: Record<string, string | null>
}

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

  return (
    <Badge tone={tone} className="min-h-7 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em]">
      {meta.label}
    </Badge>
  )
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

export function RequestRow({
  request,
  onClick,
  requestPath,
  formatDate: formatDateValue,
  currentUserId,
  canAssign,
  onAssignToMe,
}: {
  request: PortingRequestListItemDto
  onClick: () => void
  requestPath: string
  formatDate: (value: string) => string
  currentUserId: string | null
  canAssign: boolean
  onAssignToMe: (id: string) => Promise<void>
}) {
  const ownerLabel = formatCommercialOwnerLabel(request.commercialOwnerSummary)
  const assigneeLabel = formatAssigneeLabel(request.assignedUserSummary)
  const isUnassigned = request.assignedUserSummary === null
  const canAssignToMe = canAssign && isUnassigned && currentUserId !== null
  const [isAssigning, setIsAssigning] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const portingDateLabel = request.confirmedPortDate
    ? formatDateValue(request.confirmedPortDate)
    : null
  const workPriority = getWorkPriorityBadge(request.confirmedPortDate)

  const setTimedFeedback = useCallback((tone: 'success' | 'error', message: string) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
    }

    setFeedback({ tone, message })
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null)
      feedbackTimeoutRef.current = null
    }, ACTION_FEEDBACK_RESET_MS)
  }, [])

  useEffect(() => {
    if (!isMenuOpen) return

    function handlePointerDown(event: MouseEvent | globalThis.MouseEvent) {
      if (!(event.target instanceof Node)) return
      if (menuRef.current?.contains(event.target)) return
      setIsMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isMenuOpen])

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  async function handleAssignToMe(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setIsAssigning(true)
    try {
      await onAssignToMe(request.id)
      setTimedFeedback('success', 'Przypisano sprawę do Ciebie.')
      setIsMenuOpen(false)
    } catch {
      setTimedFeedback('error', 'Nie udało się przypisać sprawy.')
    } finally {
      setIsAssigning(false)
    }
  }

  async function handleCopyCase(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(request.caseNumber)
      setTimedFeedback('success', 'Skopiowano numer sprawy.')
      setIsMenuOpen(false)
    } catch {
      setTimedFeedback('error', 'Nie udało się skopiować numeru sprawy.')
    }
  }

  async function handleCopyLink(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()

    try {
      const canonicalLink = window.location.origin + requestPath
      await navigator.clipboard.writeText(canonicalLink)
      setTimedFeedback('success', 'Skopiowano link do sprawy.')
      setIsMenuOpen(false)
    } catch {
      setTimedFeedback('error', 'Nie udało się skopiować linku do sprawy.')
    }
  }

  function handleOpenRequest(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setIsMenuOpen(false)
    onClick()
  }

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b border-line transition-colors last:border-b-0 hover:bg-brand-50/70"
    >
      <td className="px-5 py-4 align-top">
        <div className="max-w-[220px] truncate font-mono text-base font-bold text-ink-900">
          {request.numberDisplay}
        </div>
        <div className="mt-1 max-w-[220px] truncate text-sm font-semibold text-ink-800">
          {request.clientDisplayName}
        </div>
        <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-ink-450">
          <span className="font-mono font-semibold text-ink-550">{request.caseNumber}</span>
          <span>Utworzono {formatDateValue(request.createdAt)}</span>
        </div>
      </td>
      <td className="px-5 py-4 align-top">
        <StatusBadge status={request.statusInternal} />
      </td>
      <td className="px-5 py-4 align-top">
        {portingDateLabel ? (
          <div className="flex flex-col gap-1">
            <Badge
              tone={workPriority?.emphasized ? workPriority.tone : 'brand'}
              className={cx(
                'w-fit font-mono text-xs font-semibold',
                workPriority?.emphasized && 'ring-2',
              )}
            >
              {portingDateLabel}
            </Badge>
            {workPriority && (
              <Badge
                tone={workPriority.tone}
                className={cx(
                  'w-fit text-[11px] font-semibold uppercase tracking-[0.04em]',
                  workPriority.emphasized && 'ring-2',
                )}
              >
                {workPriority.label}
              </Badge>
            )}
            <span className="text-[11px] text-ink-450">Data portowania</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Badge tone="neutral" className="w-fit text-[11px] font-semibold uppercase tracking-[0.04em]">
              Bez daty
            </Badge>
            <span className="text-sm font-semibold text-ink-600">Nie wyznaczono</span>
            <span className="text-[11px] text-ink-450">Data portowania</span>
          </div>
        )}
      </td>
      <td className="px-5 py-4 align-top">
        <div className="max-w-[180px] truncate text-sm text-ink-650">{request.donorOperatorName}</div>
        <div className="mt-1 text-xs font-semibold text-ink-400">
          {PORTING_MODE_LABELS[request.portingMode]}
        </div>
      </td>
      <td className="px-5 py-4 align-top">
        <div
          className={cx(
            'max-w-[220px] truncate text-sm font-medium',
            request.assignedUserSummary ? 'text-ink-700' : 'text-amber-700',
          )}
        >
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
      <td
        className="px-4 py-3 align-top"
        onClick={(event) => event.stopPropagation()}
      >
        <div ref={menuRef} className="relative flex flex-col items-start gap-2">
          <Button
            size="sm"
            variant="ghost"
            type="button"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={(event) => {
              event.stopPropagation()
              setIsMenuOpen((prev) => !prev)
            }}
            data-testid={`row-actions-trigger-${request.id}`}
          >
            Akcje
          </Button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-10 z-20 min-w-[200px] rounded-ui border border-line bg-white p-1.5 shadow-panel"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                onClick={handleOpenRequest}
                data-testid={`row-action-open-${request.id}`}
              >
                Otworz sprawe
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                onClick={handleCopyCase}
                data-testid={`row-action-copy-case-${request.id}`}
              >
                Kopiuj numer sprawy
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                onClick={handleCopyLink}
                data-testid={`row-action-copy-link-${request.id}`}
              >
                Kopiuj link
              </button>
              {canAssignToMe && (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleAssignToMe}
                  disabled={isAssigning}
                  data-testid={`row-action-assign-to-me-${request.id}`}
                >
                  {isAssigning ? 'Przypisywanie...' : 'Przypisz do mnie'}
                </button>
              )}
            </div>
          )}

          {feedback && (
            <span
              className={cx(
                'text-xs',
                feedback.tone === 'error' ? 'text-red-600' : 'text-emerald-700',
              )}
              data-testid={`row-action-feedback-${request.id}`}
            >
              {feedback.message}
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}

export function RequestsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { operators } = useOperators()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentUser = useAuthStore((state) => state.user)
  const canAssign = canManagePortingOwnership(currentUser?.role)

  const searchInput = searchParams.get('search') ?? ''
  const statusFilter = parseStatus(searchParams.get('status'))
  const portingModeFilter = parsePortingMode(searchParams.get('portingMode'))
  const donorOperatorId = searchParams.get('donorOperatorId') ?? ''
  const legacyOwnershipFilter = parseOwnershipFilter(searchParams.get('ownership'))
  const quickWorkFilterParam = searchParams.get('quickWorkFilter')
  const quickWorkFilter = parseQuickWorkFilter(quickWorkFilterParam, legacyOwnershipFilter)
  const ownershipFilter: OwnershipFilter =
    quickWorkFilterParam !== null
      ? quickWorkFilter === 'MINE'
        ? 'MINE'
        : quickWorkFilter === 'UNASSIGNED'
          ? 'UNASSIGNED'
          : 'ALL'
      : legacyOwnershipFilter
  const commercialOwnerFilter = parseCommercialOwnerFilter(searchParams.get('commercialOwnerFilter'))
  const notificationHealthFilter = parseNotificationHealthFilter(
    searchParams.get('notificationHealthFilter'),
  )
  const sort = parseListSort(searchParams.get('sort'))
  const page = parsePage(searchParams.get('page'))

  const filters = useMemo(
    () => ({
      searchInput,
      statusFilter,
      portingModeFilter,
      donorOperatorId,
      ownershipFilter,
      quickWorkFilter,
      commercialOwnerFilter,
      notificationHealthFilter,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    [
      commercialOwnerFilter,
      donorOperatorId,
      notificationHealthFilter,
      ownershipFilter,
      quickWorkFilter,
      sort,
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

  const setQuickWorkFilter = useCallback(
    (next: RequestsQuickWorkFilter) => {
      setParam({
        quickWorkFilter: next === 'ALL' ? null : next,
        ownership: null,
        page: null,
      })
    },
    [setParam],
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

  const fetchRequestsData = useCallback(async () => {
    return Promise.all([
      getPortingRequests(buildListQueryFromFilters(filters)),
      getPortingRequestsSummary(buildSummaryQueryFromFilters(filters)),
    ])
  }, [filters])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [listData, summaryData] = await fetchRequestsData()

      setResult(listData)
      setSummary(summaryData)
    } catch {
      setError('Nie udalo sie zaladowac listy spraw portowania.')
    } finally {
      setIsLoading(false)
    }
  }, [fetchRequestsData])

  const refreshVisibleData = useCallback(async () => {
    try {
      const [listData, summaryData] = await fetchRequestsData()
      setResult(listData)
      setSummary(summaryData)
    } catch {
      // Zachowujemy aktualny widok, jesli cichy refresh po akcji wiersza sie nie powiedzie.
    }
  }, [fetchRequestsData])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleAssignToMe = useCallback(
    async (requestId: string) => {
      const updated = await assignPortingRequestToMe(requestId)
      setResult((prev) => {
        if (!prev) return prev

        const shouldRemoveAssignedRow = filters.quickWorkFilter === 'UNASSIGNED'

        return {
          ...prev,
          items: shouldRemoveAssignedRow
            ? prev.items.filter((item) => item.id !== requestId)
            : prev.items.map((item) =>
                item.id === requestId ? { ...item, assignedUserSummary: updated.assignedUser } : item,
              ),
        }
      })

      void refreshVisibleData()
    },
    [filters.quickWorkFilter, refreshVisibleData],
  )

  const { items = [], pagination } = result ?? {}
  const summaryCards = summary ? buildRequestsSummaryCards(summary, filters) : []
  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []

    if (searchInput) {
      chips.push({
        id: 'search',
        label: 'Szukaj',
        value: searchInput,
        updates: { search: null, page: null },
      })
    }

    if (statusFilter) {
      chips.push({
        id: 'status',
        label: 'Status',
        value: getPortingStatusMeta(statusFilter).label,
        updates: { status: null, page: null },
      })
    }

    if (portingModeFilter) {
      chips.push({
        id: 'portingMode',
        label: 'Tryb',
        value: PORTING_MODE_LABELS[portingModeFilter],
        updates: { portingMode: null, page: null },
      })
    }

    if (donorOperatorId) {
      const donorLabel = operators.find((operator) => operator.id === donorOperatorId)?.name ?? donorOperatorId
      chips.push({
        id: 'donorOperatorId',
        label: 'Dawca',
        value: donorLabel,
        updates: { donorOperatorId: null, page: null },
      })
    }

    if (quickWorkFilter !== 'ALL') {
      chips.push({
        id: 'quickWorkFilter',
        label: 'Kolejka',
        value: quickWorkFilterLabels[quickWorkFilter],
        updates: { quickWorkFilter: null, ownership: null, page: null },
      })
    }

    if (commercialOwnerFilter !== 'ALL') {
      chips.push({
        id: 'commercialOwnerFilter',
        label: 'Opiekun',
        value: commercialOwnerFilterLabels[commercialOwnerFilter],
        updates: { commercialOwnerFilter: null, page: null },
      })
    }

    if (notificationHealthFilter !== 'ALL') {
      chips.push({
        id: 'notificationHealthFilter',
        label: 'Notyfikacje',
        value: notificationHealthFilterLabels[notificationHealthFilter],
        updates: { notificationHealthFilter: null, page: null },
      })
    }

    return chips
  }, [
    commercialOwnerFilter,
    donorOperatorId,
    notificationHealthFilter,
    operators,
    portingModeFilter,
    quickWorkFilter,
    searchInput,
    statusFilter,
  ])

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
            'Lista operacyjna spraw z filtrami przypisania, statusu i zdrowia notyfikacji.'
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

      <section role="region" aria-label="Szybkie filtry pracy" className="panel px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            Szybka kolejka pracy
          </span>
          {quickWorkFilterOptions.map((filter) => {
            const count =
              summary && filter.id === 'URGENT'
                ? summary.quickWorkCounts.urgent
                : summary && filter.id === 'NO_DATE'
                  ? summary.quickWorkCounts.noDate
                  : summary && filter.id === 'NEEDS_ACTION_TODAY'
                    ? summary.quickWorkCounts.needsActionToday
                    : null
            return (
              <FilterChip
                key={filter.id}
                active={quickWorkFilter === filter.id}
                aria-pressed={quickWorkFilter === filter.id}
                className="h-8 px-3 text-xs"
                onClick={() => setQuickWorkFilter(filter.id)}
              >
                {count !== null ? `${filter.label} (${count})` : filter.label}
              </FilterChip>
            )
          })}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1">
              <input
                type="search"
                value={localSearch}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="input-field h-10 pl-10"
                placeholder="Szukaj po numerze sprawy, telefonie lub kliencie..."
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">
                S
              </span>
            </div>

            <select
              value={statusFilter ?? ''}
              onChange={(event) => {
                const nextStatus = event.target.value || null
                setParam({ status: nextStatus, page: null })
              }}
              className="input-field h-10 min-w-[180px] lg:max-w-[220px]"
            >
              <option value="">Wszystkie statusy</option>
              {(Object.values(PORTING_CASE_STATUSES) as PortingCaseStatus[]).map((status) => (
                <option key={status} value={status}>
                  {getPortingStatusMeta(status).label}
                </option>
              ))}
            </select>

            <select
              value={portingModeFilter ?? ''}
              onChange={(event) => {
                const nextMode = event.target.value || null
                setParam({ portingMode: nextMode, page: null })
              }}
              className="input-field h-10 min-w-[170px] lg:max-w-[210px]"
            >
              <option value="">Wszystkie tryby</option>
              {PORTING_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {PORTING_MODE_LABELS[mode]}
                </option>
              ))}
            </select>

            <select
              value={donorOperatorId}
              onChange={(event) => {
                setParam({ donorOperatorId: event.target.value || null, page: null })
              }}
              className="input-field h-10 min-w-[190px] lg:max-w-[250px]"
            >
              <option value="">Wszyscy dawcy</option>
              {operators.map((operator) => (
                <option key={operator.id} value={operator.id}>
                  {operator.name}
                </option>
              ))}
            </select>

            <select
              value={commercialOwnerFilter}
              onChange={(event) => {
                const next = event.target.value as CommercialOwnerFilter
                setParam({
                  commercialOwnerFilter: next === 'ALL' ? null : next,
                  page: null,
                })
              }}
              className="input-field h-10 min-w-[170px] lg:max-w-[210px]"
            >
              {commercialOwnerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  Opiekun: {option.label}
                </option>
              ))}
            </select>

            <select
              value={notificationHealthFilter}
              onChange={(event) => {
                const next = event.target.value as NotificationHealthFilter
                setParam({
                  notificationHealthFilter: next === 'ALL' ? null : next,
                  page: null,
                })
              }}
              className="input-field h-10 min-w-[170px] lg:max-w-[220px]"
            >
              {notificationHealthOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  Notyfikacje: {option.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Sortowanie listy"
              value={sort}
              onChange={(event) => {
                const next = event.target.value as PortingRequestListSort
                setParam({
                  sort: next === DEFAULT_REQUESTS_SORT ? null : next,
                  page: null,
                })
              }}
              className="input-field h-10 min-w-[180px] lg:max-w-[220px]"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  Sortuj: {option.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="ghost" className="h-10">
                Wyczysc filtry
              </Button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-line pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                Opiekun handlowy i zdrowie notyfikacji
              </span>
              {notificationQuickOptions.map((filter) => (
                <FilterChip
                  key={filter.id}
                  active={
                    filter.id === 'ALL'
                      ? commercialOwnerFilter === 'ALL' && notificationHealthFilter === 'ALL'
                      : commercialOwnerFilter === 'ALL' && notificationHealthFilter === filter.id
                  }
                  className="h-7 px-2.5 text-[11px]"
                  onClick={() =>
                    setParam({
                      commercialOwnerFilter: null,
                      notificationHealthFilter: filter.id === 'ALL' ? null : filter.id,
                      page: null,
                    })
                  }
                >
                  {filter.label}
                </FilterChip>
              ))}
            </div>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-line pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                Aktywne filtry
              </span>
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-ui border border-line-strong bg-surface px-2.5 py-1 text-xs text-ink-650 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  onClick={() => setParam(chip.updates)}
                >
                  <span className="font-semibold">{chip.label}:</span>
                  <span>{chip.value}</span>
                  <span aria-hidden className="text-ink-400">
                    x
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Lista spraw</h2>
            <p className="mt-1 text-xs text-ink-500">
              Status, opiekun i zdrowie notyfikacji sa widoczne bez wchodzenia w szczegoly.
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
            Ladowanie listy spraw...
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
            <table className="w-full min-w-[1260px] text-sm">
              <thead className="bg-ink-50 text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">
                <tr>
                  <th className="px-5 py-3 text-left">Numer i klient</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Data przeniesienia</th>
                  <th className="px-5 py-3 text-left">Operator / tryb</th>
                  <th className="px-5 py-3 text-left">Przypisanie</th>
                  <th className="px-5 py-3 text-left">Opiekun handlowy</th>
                  <th className="min-w-[130px] whitespace-nowrap px-5 py-3 text-left">Notyfikacje</th>
                  <th className="min-w-[120px] whitespace-nowrap px-4 py-3 text-left">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {items.map((request) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    requestPath={buildPath(ROUTES.REQUEST_DETAIL, request.caseNumber)}
                    onClick={() =>
                      void navigate(buildPath(ROUTES.REQUEST_DETAIL, request.caseNumber), {
                        state: { fromList: true, listSearch: location.search },
                      })
                    }
                    formatDate={formatDate}
                    currentUserId={currentUser?.id ?? null}
                    canAssign={canAssign}
                    onAssignToMe={handleAssignToMe}
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
