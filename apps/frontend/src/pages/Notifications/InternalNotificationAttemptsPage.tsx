import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  GlobalInternalNotificationAttemptItemDto,
  InternalNotificationAttemptChannelDto,
  InternalNotificationAttemptOriginDto,
  InternalNotificationAttemptOutcomeDto,
  InternalNotificationFailureKindDto,
} from '@np-manager/shared'
import { Badge, Button, MetricCard, type BadgeTone } from '@/components/ui'
import { buildPath, ROUTES } from '@/constants/routes'
import {
  getInternalNotificationRetryBlockedReasonLabel,
  getInternalNotificationRetryErrorMessage,
  getInternalNotificationRetrySuccessMessage,
} from '@/lib/internalNotificationRetryMessages'
import { getGlobalInternalNotificationAttempts } from '@/services/internalNotificationAttempts.api'
import { retryInternalNotificationAttempt } from '@/services/portingRequests.api'

const PAGE_SIZE = 50

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getChannelLabel(channel: InternalNotificationAttemptChannelDto): string {
  if (channel === 'EMAIL') return 'E-mail'
  return 'Teams'
}

function getOriginLabel(origin: InternalNotificationAttemptOriginDto): string {
  if (origin === 'PRIMARY') return 'Primary'
  if (origin === 'ERROR_FALLBACK') return 'Error fallback'
  return 'Retry'
}

function getOutcomeLabel(outcome: InternalNotificationAttemptOutcomeDto): string {
  if (outcome === 'SENT') return 'Wyslano'
  if (outcome === 'STUBBED') return 'Stub'
  if (outcome === 'DISABLED') return 'Wylaczone'
  if (outcome === 'MISCONFIGURED') return 'Blad konfiguracji'
  if (outcome === 'FAILED') return 'Blad wysylki'
  return 'Pominieto'
}

function getOutcomeTone(outcome: InternalNotificationAttemptOutcomeDto): BadgeTone {
  if (outcome === 'FAILED') return 'red'
  if (outcome === 'MISCONFIGURED') return 'amber'
  if (outcome === 'SENT' || outcome === 'STUBBED') return 'emerald'
  return 'neutral'
}

function getFailureKindLabel(failureKind: InternalNotificationFailureKindDto): string {
  if (failureKind === 'DELIVERY') return 'Transport'
  if (failureKind === 'CONFIGURATION') return 'Konfiguracja'
  if (failureKind === 'POLICY') return 'Polityka'
  return '-'
}

function getVisibleRange(offset: number, itemsCount: number, total: number): string {
  if (total === 0) return 'Brak rekordow'
  return `${offset + 1}-${offset + itemsCount} z ${total}`
}

function buildRequestDetailPath(item: GlobalInternalNotificationAttemptItemDto): string {
  return buildPath(ROUTES.REQUEST_DETAIL, encodeURIComponent(item.caseNumber))
}

interface AttemptsTableProps {
  items: GlobalInternalNotificationAttemptItemDto[]
  isLoading: boolean
  error: string | null
  retryingAttemptIds: string[]
  onRetryAttempt: (item: GlobalInternalNotificationAttemptItemDto) => void
}

function AttemptsTable({
  items,
  isLoading,
  error,
  retryingAttemptIds,
  onRetryAttempt,
}: AttemptsTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-ink-500">
        Ladowanie prob notyfikacji...
      </div>
    )
  }

  if (error) {
    return (
      <div className="m-4 rounded-ui border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <p className="text-sm font-medium text-ink-700">Brak zapisanych prob notyfikacji.</p>
        <p className="mt-1 text-sm text-ink-500">
          Globalny ledger nie zawiera jeszcze wykonanych prob transportu.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-ink-50 text-left text-xs font-semibold uppercase text-ink-500">
            <th className="px-4 py-3">Sprawa</th>
            <th className="px-4 py-3">Zdarzenie</th>
            <th className="px-4 py-3">Odbiorca</th>
            <th className="px-4 py-3">Kanal</th>
            <th className="px-4 py-3">Wynik</th>
            <th className="px-4 py-3">Retry</th>
            <th className="px-4 py-3">Utworzono</th>
            <th className="px-4 py-3">Blad</th>
            <th className="px-4 py-3">Akcja</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((item) => {
            const isRetrying = retryingAttemptIds.includes(item.attemptId)

            return (
              <tr key={item.attemptId} className="bg-surface hover:bg-ink-50/70">
                <td className="px-4 py-4 align-top">
                  <Link
                    to={buildRequestDetailPath(item)}
                    className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                  >
                    {item.caseNumber}
                  </Link>
                  <div className="mt-1 text-xs text-ink-400">{item.requestId}</div>
                </td>
                <td className="min-w-[220px] px-4 py-4 align-top">
                  <div className="font-medium text-ink-900">
                    {item.eventLabel || item.eventCode}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-ink-500">
                    <span>{item.eventCode}</span>
                    <span aria-hidden="true">|</span>
                    <span>{getOriginLabel(item.attemptOrigin)}</span>
                    <span aria-hidden="true">|</span>
                    <span>{getFailureKindLabel(item.failureKind)}</span>
                  </div>
                </td>
                <td
                  className="max-w-[240px] truncate px-4 py-4 align-top text-ink-650"
                  title={item.recipient}
                >
                  {item.recipient}
                </td>
                <td className="px-4 py-4 align-top text-ink-650">
                  {getChannelLabel(item.channel)}
                </td>
                <td className="px-4 py-4 align-top">
                  <Badge tone={getOutcomeTone(item.outcome)}>
                    {getOutcomeLabel(item.outcome)}
                  </Badge>
                </td>
                <td className="px-4 py-4 align-top text-ink-650">{item.retryCount}</td>
                <td className="whitespace-nowrap px-4 py-4 align-top text-ink-500">
                  {formatDateTime(item.createdAt)}
                </td>
                <td className="max-w-[280px] px-4 py-4 align-top">
                  {item.errorMessage ? (
                    <span
                      className="line-clamp-2 text-sm text-red-700"
                      title={item.errorMessage}
                    >
                      {item.errorMessage}
                    </span>
                  ) : (
                    <span className="text-ink-400">-</span>
                  )}
                </td>
                <td className="px-4 py-4 align-top">
                  {item.canRetry ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={isRetrying}
                      onClick={() => onRetryAttempt(item)}
                    >
                      {isRetrying ? 'Ponawiam...' : 'Ponow'}
                    </Button>
                  ) : (
                    <span className="text-xs text-ink-500">
                      {getInternalNotificationRetryBlockedReasonLabel(
                        item.retryBlockedReasonCode,
                      )}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function InternalNotificationAttemptsPage() {
  const [items, setItems] = useState<GlobalInternalNotificationAttemptItemDto[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryingAttemptIds, setRetryingAttemptIds] = useState<string[]>([])
  const [retrySuccessMessage, setRetrySuccessMessage] = useState<string | null>(null)
  const [retryErrorMessage, setRetryErrorMessage] = useState<string | null>(null)

  const loadAttempts = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const result = await getGlobalInternalNotificationAttempts({
        limit: PAGE_SIZE,
        offset,
      })
      setItems(result.items)
      setTotal(result.total)
    } catch {
      setError('Nie udalo sie pobrac globalnej listy prob notyfikacji.')
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }, [offset])

  useEffect(() => {
    void loadAttempts()
  }, [loadAttempts])

  const hasPreviousPage = offset > 0
  const hasNextPage = offset + PAGE_SIZE < total
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function handleRetryAttempt(item: GlobalInternalNotificationAttemptItemDto) {
    if (retryingAttemptIds.includes(item.attemptId)) {
      return
    }

    setRetryingAttemptIds((current) => [...current, item.attemptId])
    setRetrySuccessMessage(null)
    setRetryErrorMessage(null)

    try {
      const result = await retryInternalNotificationAttempt(item.requestId, item.attemptId)
      setRetrySuccessMessage(
        getInternalNotificationRetrySuccessMessage(result.retryAttempt.outcome),
      )
      await loadAttempts(false)
    } catch (errorValue) {
      setRetryErrorMessage(getInternalNotificationRetryErrorMessage(errorValue))
    } finally {
      setRetryingAttemptIds((current) => current.filter((id) => id !== item.attemptId))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-brand-700">Notyfikacje wewnetrzne</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink-900">
            Globalna lista prob dostarczenia
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500">
            Administracyjny ledger internal notification attempts i technicznej diagnostyki transportu.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Wszystkie proby"
          value={isLoading ? '--' : total}
          detail="Liczba rekordow zwrocona przez backend"
        />
        <MetricCard
          title="Na stronie"
          value={isLoading ? '--' : items.length}
          detail={isLoading ? 'Ladowanie danych' : getVisibleRange(offset, items.length, total)}
        />
        <MetricCard
          title="Tryb widoku"
          value="Admin"
          detail="Ledger z akcja ponowienia dla administratora"
        />
      </div>

      {retrySuccessMessage && (
        <div className="rounded-ui border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {retrySuccessMessage}
        </div>
      )}

      {retryErrorMessage && (
        <div className="rounded-ui border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {retryErrorMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-soft">
        <AttemptsTable
          items={items}
          isLoading={isLoading}
          error={error}
          retryingAttemptIds={retryingAttemptIds}
          onRetryAttempt={(item) => void handleRetryAttempt(item)}
        />
      </div>

      {!isLoading && !error && total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-ink-600">
          <Button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={!hasPreviousPage}
            size="sm"
            variant="ghost"
          >
            Poprzednia
          </Button>
          <span className="text-xs text-ink-500">
            Strona {currentPage} z {totalPages}
          </span>
          <Button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={!hasNextPage}
            size="sm"
            variant="ghost"
          >
            Nastepna
          </Button>
        </div>
      )}
    </div>
  )
}
