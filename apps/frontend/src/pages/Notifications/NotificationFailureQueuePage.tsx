import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import type {
  GlobalNotificationFailureQueueItemDto,
  InternalNotificationRetryBlockedReasonCodeDto,
} from '@np-manager/shared'
import {
  NOTIFICATION_FAILURE_QUEUE_OPERATIONAL_STATUS_OPTIONS,
  type NotificationFailureQueueOperationalStatusFilter,
} from '@/lib/notificationFailureQueueOperationalStatus'
import {
  getGlobalNotificationFailureQueue,
  retryInternalNotificationAttempt,
  type GetGlobalNotificationFailureQueueParams,
} from '@/services/portingRequests.api'
import { NotificationFailureQueueTable } from '@/components/NotificationFailureQueueTable/NotificationFailureQueueTable'
import { AlertBanner, Button, PageHeader, SectionCard } from '@/components/ui'

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
  const [operationalStatus, setOperationalStatus] =
    useState<NotificationFailureQueueOperationalStatusFilter>('')
  const [offset, setOffset] = useState(0)

  const loadQueue = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const params: GetGlobalNotificationFailureQueueParams = {
      limit: PAGE_SIZE,
      offset,
    }
    if (operationalStatus) {
      params.operationalStatus = operationalStatus
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
  }, [offset, operationalStatus])

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notyfikacje wewnętrzne"
        title="Kolejka błędów notyfikacji"
        description="Sprawy z ostatnio nieudanymi próbami dostarczenia. Ponów wysyłkę lub skieruj sprawę do interwencji ręcznej."
      />

      <SectionCard padding="sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-ink-500">
            Status operacyjny
            <select
              value={operationalStatus}
              onChange={(e) => {
                setOperationalStatus(e.target.value as NotificationFailureQueueOperationalStatusFilter)
                setOffset(0)
              }}
              aria-label="Filtr operacyjny"
              className="input-field h-9 min-w-[220px]"
            >
              {NOTIFICATION_FAILURE_QUEUE_OPERATIONAL_STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'ALL'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {!isLoading && !error && (
            <span className="text-xs text-ink-400">
              {total === 0 ? 'Brak wyników' : `${total} ${total === 1 ? 'wynik' : 'wyników'}`}
            </span>
          )}
        </div>
      </SectionCard>

      {retrySuccessMessage && (
        <AlertBanner tone="success" title={retrySuccessMessage} />
      )}

      {retryErrorMessage && (
        <AlertBanner tone="danger" title={retryErrorMessage} />
      )}

      <SectionCard padding="none">
        <NotificationFailureQueueTable
          items={items}
          isLoading={isLoading}
          error={error}
          retryingAttemptIds={retryingAttemptIds}
          onRetryAttempt={(item) => void handleRetryAttempt(item)}
        />
      </SectionCard>

      {!isLoading && !error && total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-ink-600">
          <Button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={!hasPrev}
            size="sm"
            variant="ghost"
          >
            Poprzednia
          </Button>
          <span className="text-xs text-ink-400">
            Strona {currentPage} z {totalPages}
          </span>
          <Button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={!hasNext}
            size="sm"
            variant="ghost"
          >
            Następna
          </Button>
        </div>
      )}
    </div>
  )
}
