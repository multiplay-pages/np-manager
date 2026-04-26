import type { NotificationFailureHistoryItemDto } from '@np-manager/shared'
import { Badge, type BadgeTone } from '@/components/ui'

interface NotificationFailureHistoryPanelProps {
  items: NotificationFailureHistoryItemDto[]
  isLoading: boolean
  error: string | null
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getIssueLabel(item: NotificationFailureHistoryItemDto): string {
  if (item.isConfigurationIssue) {
    return 'Błąd konfiguracji'
  }
  return 'Błąd wysyłki'
}

function getIssueTone(item: NotificationFailureHistoryItemDto): BadgeTone {
  if (item.isConfigurationIssue) {
    return 'amber'
  }
  return 'red'
}

function formatChannel(channel: NotificationFailureHistoryItemDto['channel']): string {
  if (channel === 'EMAIL') return 'E-mail'
  if (channel === 'TEAMS') return 'Teams'
  return 'Nieznany kanał'
}

export function NotificationFailureHistoryPanel({
  items,
  isLoading,
  error,
}: NotificationFailureHistoryPanelProps) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-ink-900">
          Ostatnie problemy notyfikacji
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Najnowsze nieudane próby wysyłki — błędy konfiguracji i błędy dostarczenia.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-panel border border-dashed border-line bg-ink-50 px-4 py-3 text-sm text-ink-500">
          Ładowanie historii błędów notyfikacji...
        </div>
      ) : error ? (
        <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-panel border border-dashed border-line bg-ink-50 px-4 py-3 text-sm text-ink-600">
          Brak zarejestrowanych problemów notyfikacji.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-panel border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">{item.message}</h3>
                  <p className="mt-0.5 text-xs text-ink-400">{formatDateTime(item.occurredAt)}</p>
                </div>
                <Badge tone={getIssueTone(item)}>
                  {getIssueLabel(item)}
                </Badge>
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-ink-700 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-ink-400">Kanał</dt>
                  <dd>{formatChannel(item.channel)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-400">Wynik</dt>
                  <dd>{item.outcome}</dd>
                </div>
              </dl>

              {item.technicalDetailsPreview && (
                <p className="mt-3 rounded-panel border border-line bg-ink-50 px-3 py-2 text-sm text-ink-700">
                  Szczegóły techniczne: {item.technicalDetailsPreview}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
