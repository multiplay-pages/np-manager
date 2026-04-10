import type { NotificationFailureHistoryItemDto } from '@np-manager/shared'

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
    return 'Blad konfiguracji'
  }
  return 'Blad wysylki'
}

function getIssueBadgeClass(item: NotificationFailureHistoryItemDto): string {
  if (item.isConfigurationIssue) {
    return 'bg-amber-100 text-amber-700'
  }
  return 'bg-red-100 text-red-700'
}

function formatChannel(channel: NotificationFailureHistoryItemDto['channel']): string {
  if (channel === 'EMAIL') return 'E-mail'
  if (channel === 'TEAMS') return 'Teams'
  return 'Nieznany kanal'
}

export function NotificationFailureHistoryPanel({
  items,
  isLoading,
  error,
}: NotificationFailureHistoryPanelProps) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          Ostatnie problemy notyfikacji
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Najnowsze nieudane proby dispatchu z podzialem na problem konfiguracji i problem wysylki.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Ladowanie historii problemow notyfikacji...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Brak zarejestrowanych problemow notyfikacji.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{item.message}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(item.occurredAt)}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${getIssueBadgeClass(item)}`}
                >
                  {getIssueLabel(item)}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-gray-500">Kanal</dt>
                  <dd>{formatChannel(item.channel)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Typ</dt>
                  <dd>{item.outcome}</dd>
                </div>
              </dl>

              {item.technicalDetailsPreview && (
                <p className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  Szczegoly techniczne: {item.technicalDetailsPreview}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
