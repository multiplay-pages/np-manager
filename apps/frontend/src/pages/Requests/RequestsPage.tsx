import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { buildPath, ROUTES } from '@/constants/routes'
import { useOperators } from '@/hooks/useOperators'
import { getPortingRequests } from '@/services/portingRequests.api'
import {
  PORTING_CASE_STATUS_LABELS,
  PORTING_MODE_LABELS,
  PORTING_CASE_STATUSES,
} from '@np-manager/shared'
import type { PortingCaseStatus, PortingRequestListItemDto, PortingRequestListResultDto } from '@np-manager/shared'

type StatusFilter = 'ALL' | PortingCaseStatus

const PAGE_SIZE = 20

export function RequestsPage() {
  const navigate = useNavigate()
  const { operators } = useOperators()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [donorOperatorId, setDonorOperatorId] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<PortingRequestListResultDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getPortingRequests({
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        donorOperatorId: donorOperatorId || undefined,
        page,
        pageSize: PAGE_SIZE,
      })

      setResult(data)
    } catch {
      setError('Nie udało się załadować listy spraw portowania.')
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, donorOperatorId, page, statusFilter])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleStatusFilter = (nextStatus: StatusFilter) => {
    setStatusFilter(nextStatus)
    setPage(1)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  const { items = [], pagination } = result ?? {}

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sprawy portowania</h1>
          {pagination && (
            <p className="text-sm text-gray-500 mt-0.5">
              {pagination.total} {pagination.total === 1 ? 'sprawa' : 'spraw'}
            </p>
          )}
        </div>
        <Link to={ROUTES.REQUEST_NEW} className="btn-primary">
          + Nowa sprawa
        </Link>
      </div>

      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input-field"
            placeholder="Szukaj po numerze, zakresie, numerze sprawy lub nazwie klienta..."
          />

          <select
            value={donorOperatorId}
            onChange={(event) => {
              setDonorOperatorId(event.target.value)
              setPage(1)
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

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Wszystkie statusy
          </button>

          {Object.values(PORTING_CASE_STATUSES).map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {PORTING_CASE_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            Ładowanie...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-red-500 text-sm">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-4xl mb-3">📋</span>
            <p className="text-sm font-medium">Brak spraw portowania</p>
            <p className="text-xs mt-1">
              {debouncedSearch || donorOperatorId || statusFilter !== 'ALL'
                ? 'Zmień kryteria wyszukiwania'
                : 'Utwórz pierwszą sprawę przyciskiem powyżej'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Numer sprawy</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Klient</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Numer / zakres</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Operator oddający</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tryb</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Utworzono</th>
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
              onClick={() => setPage((current) => current - 1)}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              ← Poprzednia
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              Następna →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

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
      <td className="px-4 py-3 font-mono text-xs text-gray-700">{request.caseNumber}</td>
      <td className="px-4 py-3 font-medium text-gray-900">{request.clientDisplayName}</td>
      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{request.numberDisplay}</td>
      <td className="px-4 py-3 text-gray-600">{request.donorOperatorName}</td>
      <td className="px-4 py-3 text-gray-600">{PORTING_MODE_LABELS[request.portingMode]}</td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
          {PORTING_CASE_STATUS_LABELS[request.statusInternal]}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(request.createdAt)}</td>
    </tr>
  )
}
