import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import type {
  GlobalNotificationFailureQueueItemDto,
  InternalNotificationRetryBlockedReasonCodeDto,
} from '@np-manager/shared'
import {
  getGlobalNotificationFailureQueue,
  retryInternalNotificationAttempt,
  type GetGlobalNotificationFailureQueueParams,
} from '@/services/portingRequests.api'
import { NotificationFailureQueueTable } from '@/components/NotificationFailureQueueTable/NotificationFailureQueueTable'

const PAGE_SIZE = 50

const RETRY_BLOCKED_MESSAGES: Record<InternalNotificationRetryBlockedReasonCodeDto, string> = {
  RETRY_LIMIT_REACHED: 'Limit ponowień osiągnięty',
  NOT_LATEST_IN_CHAIN: 'Dostępna jest już nowsza próba',
  ORIGIN_NOT_RETRYABLE: 'Tego typu próby nie można ponowić',
  OUTCOME_NOT_RETRYABLE: 'Ten wynik nie kwalifikuje się do ponowienia',
}

function getRetryErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Nie udało się ponowić wysyłki'
  }

  const responseData = error.response?.data as
    | { error?: { retryBlockedReasonCode?: InternalNotificationRetryBlockedReasonCodeDto } }
    | undefined
  const reasonCode = responseData?.error?.retryBlockedReasonCode

  if (error.response?.status === 409 && reasonCode) {
    return RETRY_BLOCKED_MESSAGES[reasonCode]
  }

  return 'Nie udało się ponowić wysyłki'
}

export function NotificationFailureQueuePage() {
  const [items, setItems] = useState<GlobalNotificationFailureQueueItemDto[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrySuccessMessage, setRetrySuccessMessage] = useState<string | null>(null)
  const [retryErrorMessage, setRetryErrorMessage] = useState<string | null>(null)
  const [retryingAttemptIds, setRetryingAttemptIds] = useState<string[]>([])
  const [onlyRetryAvailable, setOnlyRetryAvailable] = useState(false)
  const [offset, setOffset] = useState(0)

  const loadQueue = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const params: GetGlobalNotificationFailureQueueParams = {
      limit: PAGE_SIZE,
      offset,
    }
    if (onlyRetryAvailable) {
      params.canRetry = true
    }

    try {
      const result = await getGlobalNotificationFailureQueue(params)
      setItems(result.items)
      setTotal(result.total)
    } catch {
      setError('Nie udało się pobrać listy problematycznych notyfikacji.')
    } finally {
      setIsLoading(false)
    }
  }, [offset, onlyRetryAvailable])

  useEffect(() => {
    setOffset(0)
  }, [onlyRetryAvailable])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  async function handleRetryAttempt(item: GlobalNotificationFailureQueueItemDto) {
    if (retryingAttemptIds.includes(item.attemptId)) {
      return
    }

    setRetryingAttemptIds((current) => [...current, item.attemptId])
    setRetrySuccessMessage(null)
    setRetryErrorMessage(null)

    try {
      await retryInternalNotificationAttempt(item.requestId, item.attemptId)
      setRetrySuccessMessage('Ponowienie wykonane')
      await loadQueue()
    } catch (retryError) {
      setRetryErrorMessage(getRetryErrorMessage(retryError))
    } finally {
      setRetryingAttemptIds((current) => current.filter((id) => id !== item.attemptId))
    }
  }

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

      {retrySuccessMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {retrySuccessMessage}
        </div>
      )}

      {retryErrorMessage && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {retryErrorMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <NotificationFailureQueueTable
          items={items}
          isLoading={isLoading}
          error={error}
          retryingAttemptIds={retryingAttemptIds}
          onRetryAttempt={(item) => void handleRetryAttempt(item)}
        />
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
            Następna
          </button>
        </div>
      )}
    </div>
  )
}
