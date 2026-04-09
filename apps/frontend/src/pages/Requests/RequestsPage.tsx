import { useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { buildPath, ROUTES } from '@/constants/routes'
import { useOperators } from '@/hooks/useOperators'
import { getPortingRequests } from '@/services/portingRequests.api'
import { getPortingStatusMeta } from '@/lib/portingStatusMeta'
import {
  formatAssigneeLabel,
  parseOwnershipFilter,
  type OwnershipFilter,
} from '@/lib/portingOwnership'
import {
  PORTING_CASE_STATUSES,
  PORTING_MODE_LABELS,
} from '@np-manager/shared'
import type {
  PortingCaseStatus,
  PortingMode,
  PortingRequestListItemDto,
  PortingRequestListResultDto,
} from '@np-manager/shared'
import { useState } from 'react'

const PAGE_SIZE = 20

const PORTING_MODES: PortingMode[] = ['DAY', 'END', 'EOP']

// ============================================================
// URL param helpers
// ============================================================

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

// ============================================================
// Status badge component
// ============================================================

function StatusBadge({ status }: { status: PortingCaseStatus }) {
  const meta = getPortingStatusMeta(status)
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  )
}

// ============================================================
// Row component
// ============================================================

function RequestRow({
  request,
  onClick,
  formatDate,
}: {
  request: PortingRequestListItemDto
  onClick: () => void
  formatDate: (value: string) => string
}) {
  return (
    <tr onClick={onClick} className="hover:bg-blue-50 cursor-pointer transition-colors">
      <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
        {request.caseNumber}
      </td>
      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">
        {request.clientDisplayName}
      </td>
      <td className="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
        {request.numberDisplay}
      </td>
      <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">
        {request.donorOperatorName}
      </td>
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
        {PORTING_MODE_LABELS[request.portingMode]}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusBadge status={request.statusInternal} />
      </td>
      <td className="px-4 py-3 text-gray-600 max-w-[220px] truncate">
        {formatAssigneeLabel(request.assignedUserSummary)}
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
        {formatDate(request.createdAt)}
      </td>
    </tr>
  )
}

// ============================================================
// Main page
// ============================================================

export function RequestsPage() {
  const navigate = useNavigate()
  const { operators } = useOperators()
  const [searchParams, setSearchParams] = useSearchParams()

  // Derive filter state from URL
  const searchInput = searchParams.get('search') ?? ''
  const statusFilter = parseStatus(searchParams.get('status'))
  const portingModeFilter = parsePortingMode(searchParams.get('portingMode'))
  const donorOperatorId = searchParams.get('donorOperatorId') ?? ''
  const ownershipFilter = parseOwnershipFilter(searchParams.get('ownership'))
  const page = parsePage(searchParams.get('page'))

  // Local search input state for immediate responsiveness (debounced to URL)
  const [localSearch, setLocalSearch] = useState(searchInput)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local search when URL changes externally (e.g. clear filters)
  const prevSearchInput = useRef(searchInput)
  if (prevSearchInput.current !== searchInput && localSearch !== searchInput) {
    setLocalSearch(searchInput)
    prevSearchInput.current = searchInput
  }

  const [result, setResult] = useState<PortingRequestListResultDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ---- helpers ----

  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === '') {
            next.delete(key)
          } else {
            next.set(key, value)
          }
        }
        return next
      })
    },
    [setSearchParams],
  )

  const hasActiveFilters =
    !!searchInput ||
    !!statusFilter ||
    !!portingModeFilter ||
    !!donorOperatorId ||
    ownershipFilter !== 'ALL'

  const clearFilters = () => {
    setLocalSearch('')
    setSearchParams({})
  }

  // ---- search debounce ----

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

  // ---- data loading ----

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getPortingRequests({
        search: searchInput || undefined,
        status: statusFilter ?? undefined,
        portingMode: portingModeFilter ?? undefined,
        donorOperatorId: donorOperatorId || undefined,
        ownership: ownershipFilter !== 'ALL' ? ownershipFilter : undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      setResult(data)
    } catch {
      setError('Nie udało się załadować listy spraw portowania.')
    } finally {
      setIsLoading(false)
    }
  }, [searchInput, statusFilter, portingModeFilter, donorOperatorId, ownershipFilter, page])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // ---- formatting ----

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  const { items = [], pagination } = result ?? {}

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sprawy portowania</h1>
          {pagination && (
            <p className="text-sm text-gray-500 mt-0.5">
              {pagination.total}{' '}
              {pagination.total === 1
                ? 'sprawa'
                : pagination.total < 5
                  ? 'sprawy'
                  : 'spraw'}
            </p>
          )}
        </div>
        <Link to={ROUTES.REQUEST_NEW} className="btn-primary">
          + Nowa sprawa
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        {/* Row 1: search + operator */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
          <input
            type="search"
            value={localSearch}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="input-field"
            placeholder="Szukaj po numerze sprawy, numerze telefonu lub nazwie klienta..."
          />
          <select
            value={donorOperatorId}
            onChange={(event) => {
              setParam({ donorOperatorId: event.target.value || null, page: null })
            }}
            className="input-field"
          >
            <option value="">Wszyscy dawcy</option>
            {operators.map((operator) => (
              <option key={operator.id} value={operator.id}>
                {operator.name}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2: status filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setParam({ status: null, page: null })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !statusFilter
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Wszystkie statusy
          </button>
          {(Object.values(PORTING_CASE_STATUSES) as PortingCaseStatus[]).map((status) => {
            const meta = getPortingStatusMeta(status)
            const isActive = statusFilter === status
            return (
              <button
                key={status}
                onClick={() => setParam({ status: isActive ? null : status, page: null })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? `${meta.className} ring-2 ring-offset-1 ring-current`
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {meta.label}
              </button>
            )
          })}
        </div>

        {/* Row 3: porting mode filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 mr-1">Tryb:</span>
          <button
            onClick={() => setParam({ portingMode: null, page: null })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !portingModeFilter
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Wszystkie
          </button>
          {PORTING_MODES.map((mode) => {
            const isActive = portingModeFilter === mode
            return (
              <button
                key={mode}
                onClick={() =>
                  setParam({ portingMode: isActive ? null : mode, page: null })
                }
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {PORTING_MODE_LABELS[mode]}
              </button>
            )
          })}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Wyczyść filtry ×
            </button>
          )}
        </div>

        {/* Row 4: ownership filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 mr-1">Przypisanie:</span>
          {(['ALL', 'MINE', 'UNASSIGNED'] as OwnershipFilter[]).map((filter) => {
            const isActive = ownershipFilter === filter
            const label =
              filter === 'ALL'
                ? 'Wszystkie'
                : filter === 'MINE'
                  ? 'Moje sprawy'
                  : 'Nieprzypisane'

            return (
              <button
                key={filter}
                onClick={() => setParam({ ownership: filter === 'ALL' ? null : filter, page: null })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table / states */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            Ładowanie...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-red-500 text-sm">{error}</p>
            <button
              onClick={() => void loadData()}
              className="btn-secondary text-xs"
            >
              Spróbuj ponownie
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <span className="text-3xl">📋</span>
            <p className="text-sm font-medium text-gray-600">Brak spraw portowania</p>
            <p className="text-xs">
              {hasActiveFilters
                ? 'Żadna sprawa nie pasuje do podanych kryteriów — zmień filtry lub wyczyść je.'
                : 'Utwórz pierwszą sprawę przyciskiem powyżej.'}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn-secondary text-xs mt-1">
                Wyczyść filtry
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                    Numer sprawy
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Klient</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                    Numer / zakres
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                    Operator oddający
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tryb</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                    Przypisanie
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                    Utworzono
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Strona {pagination.page} z {pagination.totalPages}
            {' · '}
            {pagination.total} rekordów
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setParam({ page: String(page - 1) })}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
            >
              ← Poprzednia
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setParam({ page: String(page + 1) })}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
            >
              Następna →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
