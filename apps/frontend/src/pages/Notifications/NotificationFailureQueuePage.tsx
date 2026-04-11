import { useEffect, useState } from 'react'
import type { GlobalNotificationFailureQueueItemDto } from '@np-manager/shared'
import {
  getGlobalNotificationFailureQueue,
  type GetGlobalNotificationFailureQueueParams,
} from '@/services/portingRequests.api'
import { NotificationFailureQueueTable } from '@/components/NotificationFailureQueueTable/NotificationFailureQueueTable'

const PAGE_SIZE = 50

export function NotificationFailureQueuePage() {
  const [items, setItems] = useState<GlobalNotificationFailureQueueItemDto[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [onlyRetryAvailable, setOnlyRetryAvailable] = useState(false)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    setOffset(0)
  }, [onlyRetryAvailable])

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    const params: GetGlobalNotificationFailureQueueParams = {
      limit: PAGE_SIZE,
      offset,
    }
    if (onlyRetryAvailable) {
      params.canRetry = true
    }

    getGlobalNotificationFailureQueue(params)
      .then((result) => {
        setItems(result.items)
        setTotal(result.total)
      })
      .catch(() => {
        setError('Nie udało się pobrać listy problematycznych notyfikacji.')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [onlyRetryAvailable, offset])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const hasPrev = offset > 0
  const hasNext = offset + PAGE_SIZE < total

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Kolejka błędów notyfikacji</h1>
        <p className="mt-1 text-sm text-gray-500">
          Globalna lista spraw z ostatnio nieudanymi próbami dostarczenia notyfikacji.
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={onlyRetryAvailable}
            onChange={(e) => setOnlyRetryAvailable(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          Tylko z dostępnym retry
        </label>

        {!isLoading && !error && (
          <span className="text-xs text-gray-400">
            {total === 0 ? 'Brak wyników' : `${total} ${total === 1 ? 'wynik' : 'wyników'}`}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <NotificationFailureQueueTable items={items} isLoading={isLoading} error={error} />
      </div>

      {!isLoading && !error && total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={!hasPrev}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 hover:bg-gray-100 disabled:cursor-not-allowed"
          >
            Poprzednia
          </button>
          <span className="text-xs text-gray-400">
            Strona {currentPage} z {totalPages}
          </span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={!hasNext}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 hover:bg-gray-100 disabled:cursor-not-allowed"
          >
            Nastepna
          </button>
        </div>
      )}
    </div>
  )
}
