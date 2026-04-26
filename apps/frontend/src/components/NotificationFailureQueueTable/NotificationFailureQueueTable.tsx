import { Link } from 'react-router-dom'
import type {
  GlobalNotificationFailureQueueItemDto,
  InternalNotificationRetryBlockedReasonCodeDto,
} from '@np-manager/shared'
import { buildPath, ROUTES } from '@/constants/routes'
import {
  deriveOperationalStatus,
  OPERATIONAL_STATUS_CONFIG,
} from '@/lib/notificationFailureQueueOperationalStatus'
import { Badge, Button, type BadgeTone } from '@/components/ui'

interface NotificationFailureQueueTableProps {
  items: GlobalNotificationFailureQueueItemDto[]
  isLoading: boolean
  error: string | null
  retryingAttemptIds: string[]
  onRetryAttempt: (item: GlobalNotificationFailureQueueItemDto) => void
}

function getOutcomeTone(outcome: GlobalNotificationFailureQueueItemDto['outcome']): BadgeTone {
  if (outcome === 'FAILED') return 'red'
  if (outcome === 'MISCONFIGURED') return 'amber'
  return 'neutral'
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

function getChannelLabel(channel: GlobalNotificationFailureQueueItemDto['channel']): string {
  if (channel === 'EMAIL') return 'E-mail'
  if (channel === 'TEAMS') return 'Teams'
  return channel
}

const RETRY_BLOCKED_REASON_LABELS: Record<InternalNotificationRetryBlockedReasonCodeDto, string> = {
  RETRY_LIMIT_REACHED: 'Limit ponowien osiagniety',
  NOT_LATEST_IN_CHAIN: 'Istnieje nowsza proba',
  ORIGIN_NOT_RETRYABLE: 'Tego typu proby nie mozna ponowic',
  OUTCOME_NOT_RETRYABLE: 'Ten wynik nie kwalifikuje sie do ponowienia',
}

function getRetryBlockedReasonLabel(
  reasonCode: GlobalNotificationFailureQueueItemDto['retryBlockedReasonCode'],
): string {
  return reasonCode ? RETRY_BLOCKED_REASON_LABELS[reasonCode] : 'Ponowienie niedostępne'
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
      <div className="flex items-center justify-center py-12 text-sm text-ink-500">
        Ładowanie kolejki błędów...
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <p className="text-sm text-ink-500">Brak problematycznych prób notyfikacji.</p>
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
            <th className="px-4 py-3">Kanał</th>
            <th className="px-4 py-3">Odbiorca</th>
            <th className="px-4 py-3">Wynik wysyłki</th>
            <th className="px-4 py-3">Rodzaj błędu</th>
            <th className="px-4 py-3">Ponowienia</th>
            <th className="px-4 py-3">Status operacyjny</th>
            <th className="px-4 py-3">Czas</th>
            <th className="px-4 py-3">Akcja</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((item) => {
            const isRetrying = retryingAttemptIds.includes(item.attemptId)
            const opStatus = deriveOperationalStatus(item)
            const opConfig = OPERATIONAL_STATUS_CONFIG[opStatus]

            return (
              <tr key={item.attemptId} className={`bg-surface hover:bg-ink-50/70 ${opConfig.rowAccentClass}`}>
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    to={buildPath(ROUTES.REQUEST_DETAIL, item.requestId)}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {item.caseNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-900">{item.eventLabel}</td>
                <td className="px-4 py-3 text-ink-650">{getChannelLabel(item.channel)}</td>
                <td
                  className="max-w-[220px] truncate px-4 py-3 text-ink-650"
                  title={item.recipient}
                >
                  {item.recipient}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={getOutcomeTone(item.outcome)}>
                    {getOutcomeLabel(item.outcome)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-ink-650">
                  {getFailureKindLabel(item.failureKind)}
                </td>
                <td className="px-4 py-3 text-ink-650">{item.retryCount} / 3</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${opConfig.badgeClass}`}
                  >
                    {opConfig.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-400">{formatRelativeTime(item.createdAt)}</td>
                <td className="px-4 py-3">
                  {item.canRetry ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onRetryAttempt(item)}
                      disabled={isRetrying}
                    >
                      {isRetrying ? 'Ponawiam...' : 'Ponów'}
                    </Button>
                  ) : (
                    <span className="text-xs text-ink-500">
                      {getRetryBlockedReasonLabel(item.retryBlockedReasonCode)}
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
