import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Flag, Inbox, LoaderCircle, Plus, Search, SlidersHorizontal } from 'lucide-react'
import {
  ActionMenu,
  AlertBanner,
  AppIcon,
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  FilterChip,
  MetricCard,
  PageHeader,
  SectionCard,
  cx,
} from '@/components/ui'
import { buildPath, ROUTES } from '@/constants/routes'
import { useOperators } from '@/hooks/useOperators'
import {
  canManagePortingOwnership,
  formatAssigneeLabel,
  getOwnershipSignal,
  parseOwnershipFilter,
  type OwnershipFilter,
} from '@/lib/portingOwnership'
import { getPortingOperationalHint } from '@/lib/portingOperationalHint'
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

function getSummaryCardTone(cardId: 'ALL' | 'WITH_OWNER' | 'WITHOUT_OWNER' | 'MINE' | 'HAS_FAILURES') {
  if (cardId === 'HAS_FAILURES') return 'danger'
  if (cardId === 'WITHOUT_OWNER') return 'warning'
  if (cardId === 'WITH_OWNER') return 'success'
  if (cardId === 'MINE') return 'brand'
  return 'neutral'
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
    <Badge tone={tone} className="min-h-6 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em]">
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
    return <Badge tone={config.tone} className="px-2 text-[11px]">OK</Badge>
  }

  const lastFailureDate = notificationLastFailureAt ? formatDate(notificationLastFailureAt) : null

  return (
    <div className="flex min-w-[140px] flex-col gap-0.5">
      <Badge tone={config.tone} className="w-fit px-2 text-[11px]">{config.label}</Badge>
      <span className="text-[11px] leading-4 text-ink-500">
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
  const ownershipSignal = getOwnershipSignal(request.assignedUserSummary, currentUserId)
  const isUnassigned = request.assignedUserSummary === null
  const canAssignToMe = canAssign && isUnassigned && currentUserId !== null
  const [isAssigning, setIsAssigning] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const portingDateLabel = request.confirmedPortDate
    ? formatDateValue(request.confirmedPortDate)
    : null
  const workPriority = getWorkPriorityBadge(request.confirmedPortDate)
  const operationalHint = getPortingOperationalHint({
    statusInternal: request.statusInternal,
    confirmedPortDate: request.confirmedPortDate,
  })

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
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  async function handleAssignToMe() {
    setIsAssigning(true)
    try {
      await onAssignToMe(request.id)
      setTimedFeedback('success', 'Przypisano sprawę do Ciebie.')
      return true
    } catch {
      setTimedFeedback('error', 'Nie udało się przypisać sprawy.')
      return false
    } finally {
      setIsAssigning(false)
    }
  }

  async function handleCopyCase() {
    try {
      await navigator.clipboard.writeText(request.caseNumber)
      setTimedFeedback('success', 'Skopiowano numer sprawy.')
      return true
    } catch {
      setTimedFeedback('error', 'Nie udało się skopiować numeru sprawy.')
      return false
    }
  }

  async function handleCopyLink() {
    try {
      const canonicalLink = window.location.origin + requestPath
      await navigator.clipboard.writeText(canonicalLink)
      setTimedFeedback('success', 'Skopiowano link do sprawy.')
      return true
    } catch {
      setTimedFeedback('error', 'Nie udało się skopiować linku do sprawy.')
      return false
    }
  }

  function handleOpenRequest() {
    onClick()
  }

  return (
    <tr
      onClick={onClick}
      className="group cursor-pointer border-b border-line/70 transition-colors last:border-b-0 hover:bg-brand-50/50"
    >
      <td className="px-4 py-3.5 align-top">
        <div className="max-w-[210px] truncate font-mono text-sm font-bold text-ink-900">
          {request.numberDisplay}
        </div>
        <div className="mt-0.5 max-w-[210px] truncate text-sm font-semibold leading-5 text-ink-800">
          {request.clientDisplayName}
        </div>
        <div className="mt-1 flex flex-col gap-0.5 text-[11px] leading-4 text-ink-450">
          <span className="font-mono font-semibold text-ink-550">{request.caseNumber}</span>
          <span>Utworzono {formatDateValue(request.createdAt)}</span>
        </div>
      </td>
      <td className="px-4 py-3.5 align-top">
        <div className="flex min-w-[150px] flex-col gap-1.5">
          <StatusBadge status={request.statusInternal} />
          <Badge tone={operationalHint.tone} className="w-fit px-2 text-[11px] font-medium">
            {operationalHint.label}
          </Badge>
        </div>
      </td>
      <td className="px-4 py-3.5 align-top">
        {portingDateLabel ? (
          <div className="flex min-w-[135px] flex-col gap-0.5">
            <Badge
              tone={workPriority?.emphasized ? workPriority.tone : 'brand'}
              className={cx(
                'w-fit px-2 font-mono text-[11px] font-semibold',
                workPriority?.emphasized && 'ring-2',
              )}
            >
              {portingDateLabel}
            </Badge>
            {workPriority && (
              <Badge
                tone={workPriority.tone}
                className={cx(
                  'w-fit px-2 text-[11px] font-semibold uppercase tracking-[0.03em]',
                  workPriority.emphasized && 'ring-2',
                )}
              >
                {workPriority.label}
              </Badge>
            )}
            <span className="text-[11px] leading-4 text-ink-450">Data portowania</span>
          </div>
        ) : (
          <div className="flex min-w-[135px] flex-col gap-0.5">
            <Badge tone="neutral" className="w-fit px-2 text-[11px] font-semibold uppercase tracking-[0.03em]">
              Bez daty
            </Badge>
            <span className="text-xs font-semibold text-ink-600">Nie wyznaczono</span>
            <span className="text-[11px] leading-4 text-ink-450">Data portowania</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3.5 align-top">
        <div className="max-w-[170px] truncate text-sm leading-5 text-ink-650">{request.donorOperatorName}</div>
        <div className="mt-0.5 text-xs font-semibold text-ink-400">
          {PORTING_MODE_LABELS[request.portingMode]}
        </div>
      </td>
      <td className="px-4 py-3.5 align-top">
        <div
          className={cx(
            'max-w-[190px] truncate text-sm font-medium leading-5',
            request.assignedUserSummary ? 'text-ink-700' : 'text-amber-700',
          )}
        >
          {assigneeLabel}
        </div>
        {ownershipSignal && (
          <Badge
            tone={ownershipSignal.tone}
            className="mt-1 w-fit px-2 text-[11px] font-semibold uppercase tracking-[0.03em]"
          >
            {ownershipSignal.label}
          </Badge>
        )}
        <div className="mt-0.5 text-xs text-ink-400">BOK</div>
      </td>
      <td className="px-4 py-3.5 align-top">
        <div
          className={cx(
            'max-w-[230px] truncate text-sm font-semibold leading-5',
            request.commercialOwnerSummary ? 'text-ink-800' : 'text-amber-800',
          )}
        >
          {ownerLabel}
        </div>
        <div className="mt-0.5 text-xs text-ink-400">Opiekun handlowy</div>
      </td>
      <td className="px-4 py-3.5 align-top">
        <NotificationHealthBadge request={request} />
      </td>
      <td
        className="px-3 py-3 align-top"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex flex-col items-start gap-1.5">
          <ActionMenu
            triggerLabel=""
            triggerAriaLabel={`Akcje dla sprawy ${request.caseNumber}`}
            items={[
              {
                id: `open-${request.id}`,
                label: 'Otworz sprawe',
                onClick: handleOpenRequest,
              },
              {
                id: `copy-case-${request.id}`,
                label: 'Kopiuj numer sprawy',
                onClick: handleCopyCase,
              },
              {
                id: `copy-link-${request.id}`,
                label: 'Kopiuj link',
                onClick: handleCopyLink,
              },
              ...(canAssignToMe
                ? [
                    {
                      id: `assign-${request.id}`,
                      label: isAssigning ? 'Przypisywanie...' : 'Przypisz do mnie',
                      disabled: isAssigning,
                      onClick: handleAssignToMe,
                    },
                  ]
                : []),
            ]}
          />

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
        title="Kolejka spraw portowania"
        description={
          pagination ? (
            <>
              {pagination.total} {pluralizeRequests(pagination.total)} w aktualnym widoku pracy.
            </>
          ) : (
            'Przeglad spraw do obslugi z filtrami przypisania, statusu i zdrowia notyfikacji.'
          )
        }
        actions={
          <ButtonLink to={ROUTES.REQUEST_NEW} variant="primary">
            <AppIcon icon={Plus} />
            Nowa sprawa
          </ButtonLink>
        }
      />

      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {summaryCards.map((card) => (
            <MetricCard
              key={card.id}
              title={card.title}
              value={card.value}
              active={card.isActive}
              tone={getSummaryCardTone(card.id)}
              detail={card.id === 'HAS_FAILURES' ? 'Wymaga kontroli operacyjnej' : 'Kliknij, aby zawezic kolejke'}
              onClick={() => setParam(card.filterUpdates)}
            />
          ))}
        </div>
      )}

      <SectionCard
        role="region"
        aria-label="Szybkie filtry pracy"
        title="Szybka kolejka pracy"
        description="Operacyjne skroty do najczesciej obslugiwanych widokow."
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            <AppIcon icon={Flag} className="text-ink-400" />
            Widok
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
      </SectionCard>

      <SectionCard
        title={
          <span className="inline-flex items-center gap-2">
            <AppIcon icon={SlidersHorizontal} className="text-ink-400" />
            Filtry operacyjne
          </span>
        }
        description="Doprecyzuj liste bez zmiany sposobu sortowania i paginacji."
        action={
          hasActiveFilters ? (
            <Button onClick={clearFilters} variant="ghost" className="h-10">
              Wyczysc filtry
            </Button>
          ) : null
        }
        padding="none"
        className="overflow-hidden"
      >
        <div className="px-4 py-4 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="relative sm:col-span-2 xl:col-span-2">
              <input
                type="search"
                value={localSearch}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="input-field h-10 w-full pl-10"
                placeholder="Szukaj po numerze sprawy, telefonie lub kliencie..."
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
                <AppIcon icon={Search} className="h-4 w-4" />
              </span>
            </div>

            <select
              value={statusFilter ?? ''}
              onChange={(event) => {
                const nextStatus = event.target.value || null
                setParam({ status: nextStatus, page: null })
              }}
              className="input-field h-10 w-full"
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
              className="input-field h-10 w-full"
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
              className="input-field h-10 w-full"
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
              className="input-field h-10 w-full"
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
              className="input-field h-10 w-full"
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
              className="input-field h-10 w-full"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  Sortuj: {option.label}
                </option>
              ))}
            </select>

          </div>

          <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
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
      </SectionCard>

      <SectionCard
        title="Lista spraw"
        description="Status, opiekun i zdrowie notyfikacji sa widoczne bez wchodzenia w szczegoly."
        action={
          pagination ? (
            <Badge tone="neutral">
              {pagination.total} {pluralizeRequests(pagination.total)}
            </Badge>
          ) : null
        }
        padding="none"
        className="overflow-hidden"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-medium text-ink-500">
            <AppIcon icon={LoaderCircle} className="animate-spin text-ink-400" />
            Ladowanie listy spraw...
          </div>
        ) : error ? (
          <div className="p-5">
            <AlertBanner
              tone="danger"
              title="Nie udalo sie zaladowac kolejki"
              description={error}
              action={
                <Button onClick={() => void loadData()} variant="secondary" size="sm">
                  Sprobuj ponownie
                </Button>
              }
            />
          </div>
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<AppIcon icon={Inbox} />}
              title="Brak spraw portowania"
              description={
                hasActiveFilters
                  ? 'Zadna sprawa nie pasuje do podanych kryteriow.'
                  : 'Utworz pierwsza sprawe przyciskiem powyzej.'
              }
              action={
                hasActiveFilters ? (
                  <Button onClick={clearFilters} variant="secondary" size="sm">
                    Wyczysc filtry
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-line/70" role="region" aria-label="Przewijana lista spraw">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="bg-ink-50/80 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500">
                <tr>
                  <th className="px-4 py-3 text-left">Numer i klient</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Data przeniesienia</th>
                  <th className="px-4 py-3 text-left">Operator / tryb</th>
                  <th className="px-4 py-3 text-left">Przypisanie</th>
                  <th className="px-4 py-3 text-left">Opiekun handlowy</th>
                  <th className="min-w-[130px] whitespace-nowrap px-4 py-3 text-left">Notyfikacje</th>
                  <th className="min-w-[64px] whitespace-nowrap px-3 py-3 text-left">Akcje</th>
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
      </SectionCard>

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
