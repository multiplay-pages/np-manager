import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ROUTES, buildPath } from '@/constants/routes'
import { getClients, type GetClientsResult } from '@/services/clients.api'
import { CLIENT_TYPE_LABELS } from '@np-manager/shared'
import type { ClientListItemDto } from '@np-manager/shared'

type ClientTypeFilter = 'ALL' | 'INDIVIDUAL' | 'BUSINESS'

const PAGE_SIZE = 20

export function ClientsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ClientTypeFilter>('ALL')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<GetClientsResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce wyszukiwania — 400 ms
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

  // Reset strony przy zmianie filtra
  const handleTypeFilter = (f: ClientTypeFilter) => {
    setTypeFilter(f)
    setPage(1)
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getClients({
        search: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
        clientType: typeFilter !== 'ALL' ? typeFilter : undefined,
      })
      setResult(data)
    } catch {
      setError('Nie udało się załadować listy klientów.')
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, typeFilter, page])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const { items = [], pagination } = result ?? {}

  return (
    <div className="p-6 space-y-4">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kartoteka klientów</h1>
          {pagination && (
            <p className="text-sm text-gray-500 mt-0.5">
              {pagination.total} {pagination.total === 1 ? 'klient' : 'klientów'}
            </p>
          )}
        </div>
        <Link to={ROUTES.CLIENT_NEW} className="btn-primary">
          + Dodaj klienta
        </Link>
      </div>

      {/* Filtry */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        {/* Wyszukiwanie */}
        <div className="flex-1">
          <input
            type="search"
            placeholder="Szukaj po nazwisku, imieniu, firmie, PESEL, NIP, e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
          />
        </div>

        {/* Filtr typu */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden flex-shrink-0">
          {(['ALL', 'INDIVIDUAL', 'BUSINESS'] as ClientTypeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => handleTypeFilter(f)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                typeFilter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f === 'ALL' ? 'Wszyscy' : f === 'INDIVIDUAL' ? 'Osoby' : 'Firmy'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
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
            <span className="text-4xl mb-3">👥</span>
            <p className="text-sm font-medium">Brak klientów</p>
            <p className="text-xs mt-1">
              {debouncedSearch || typeFilter !== 'ALL'
                ? 'Zmień kryteria wyszukiwania'
                : 'Dodaj pierwszego klienta'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Typ</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Klient</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">PESEL / NIP</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">E-mail</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Telefon</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Miejscowość</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Dodano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((client) => (
                  <ClientRow
                    key={client.id}
                    client={client}
                    onClick={() => void navigate(buildPath(ROUTES.CLIENT_DETAIL, client.id))}
                    formatDate={formatDate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginacja */}
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
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              ← Poprzednia
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
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

// ============================================================
// ROW COMPONENT
// ============================================================

interface ClientRowProps {
  client: ClientListItemDto
  onClick: () => void
  formatDate: (iso: string) => string
}

function ClientRow({ client, onClick, formatDate }: ClientRowProps) {
  return (
    <tr
      onClick={onClick}
      className="hover:bg-blue-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            client.clientType === 'INDIVIDUAL'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {CLIENT_TYPE_LABELS[client.clientType]}
        </span>
      </td>
      <td className="px-4 py-3 font-medium text-gray-900">{client.displayName}</td>
      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
        {client.identifierMasked ?? '—'}
      </td>
      <td className="px-4 py-3 text-gray-600">{client.email}</td>
      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{client.phoneContact}</td>
      <td className="px-4 py-3 text-gray-600">{client.addressCity}</td>
      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(client.createdAt)}</td>
    </tr>
  )
}
