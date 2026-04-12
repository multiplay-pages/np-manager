import { Link } from 'react-router-dom'
import type { GlobalNotificationFailureQueueItemDto } from '@np-manager/shared'
import { buildPath, ROUTES } from '@/constants/routes'
import {
  deriveOperationalStatus,
  OPERATIONAL_STATUS_CONFIG,
} from '@/lib/notificationFailureQueueOperationalStatus'

interface NotificationFailureQueueTableProps {
  items: GlobalNotificationFailureQueueItemDto[]
  isLoading: boolean
  error: string | null
  retryingAttemptIds: string[]
  onRetryAttempt: (item: GlobalNotificationFailureQueueItemDto) => void
}

function getOutcomeClass(outcome: GlobalNotificationFailureQueueItemDto['outcome']): string {
  if (outcome === 'FAILED') return 'bg-red-100 text-red-700'
  if (outcome === 'MISCONFIGURED') return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-700'
}

function getOutcomeLabel(outcome: GlobalNotificationFailureQueueItemDto['outcome']): string {
  if (outcome === 'FAILED') return 'Błąd wysyłki'
  if (outcome === 'MISCONFIGURED') return 'Błędna konfiguracja'
  return outcome
}

function getFailureKindLabel(
  failureKind: GlobalNotificationFailureQueueItemDto['failureKind'],
): string {
  if (failureKind === 'DELIVERY') return 'Błąd transportu'
  if (failureKind === 'CONFIGURATION') return 'Konfiguracja'
  if (failureKind === 'POLICY') return 'Polityka'
  return '—'
}


function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'przed chwilą'
  if (minutes < 60) return `${minutes} min temu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} godz temu`
  const days = Math.floor(hours / 24)
  return `${days} dni temu`
}

export function NotificationFailureQueueTable({
  items,
  isLoading,
  error,
  retryingAttemptIds,
  onRetryAttempt,
}: NotificationFailureQueueTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        Ładowanie...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <p className="text-sm text-gray-500">Brak problematycznych prób notyfikacji.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3">Sprawa</th>
            <th className="px-4 py-3">Zdarzenie</th>
            <th className="px-4 py-3">Wynik</th>
            <th className="px-4 py-3">Rodzaj błędu</th>
            <th className="px-4 py-3">Ponowienia</th>
            <th className="px-4 py-3">Status operacyjny</th>
            <th className="px-4 py-3">Czas</th>
            <th className="px-4 py-3">Akcja</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const isRetrying = retryingAttemptIds.includes(item.attemptId)
            const opStatus = deriveOperationalStatus(item)
            const opConfig = OPERATIONAL_STATUS_CONFIG[opStatus]

            return (
              <tr key={item.attemptId} className={`bg-white hover:bg-gray-50 ${opConfig.rowAccentClass}`}>
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    to={buildPath(ROUTES.REQUEST_DETAIL, item.requestId)}
                    className="text-blue-600 hover:underline"
                  >
                    {item.requestId.slice(0, 8)}...
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-900">{item.eventLabel}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${getOutcomeClass(item.outcome)}`}
                  >
                    {getOutcomeLabel(item.outcome)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {getFailureKindLabel(item.failureKind)}
                </td>
                <td className="px-4 py-3 text-gray-600">{item.retryCount} / 3</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${opConfig.badgeClass}`}
                  >
                    {opConfig.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{formatRelativeTime(item.createdAt)}</td>
                <td className="px-4 py-3">
                  {item.canRetry && (
                    <button
                      type="button"
                      onClick={() => onRetryAttempt(item)}
                      disabled={isRetrying}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRetrying ? 'Ponawiam...' : 'Ponów'}
                    </button>
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
