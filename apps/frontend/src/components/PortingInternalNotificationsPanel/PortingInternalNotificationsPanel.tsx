import type { PortingInternalNotificationHistoryItemDto } from '@np-manager/shared'

interface PortingInternalNotificationsPanelProps {
  items: PortingInternalNotificationHistoryItemDto[]
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

function formatChannel(channel: PortingInternalNotificationHistoryItemDto['channel']): string {
  if (channel === 'IN_APP') return 'In-app'
  if (channel === 'EMAIL') return 'E-mail'
  if (channel === 'TEAMS') return 'Teams'
  return 'Nieznany'
}

export function PortingInternalNotificationsPanel({
  items,
  isLoading,
  error,
}: PortingInternalNotificationsPanelProps) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          Historia powiadomien wewnetrznych
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Chronologiczny podglad routingu i wynikow dispatchu dla sprawy.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Ladowanie historii powiadomien...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Brak historii powiadomien wewnetrznych dla tej sprawy.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{item.eventLabel}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(item.createdAt)}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-700">
                  {item.entryType}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-gray-500">Kanal</dt>
                  <dd>{formatChannel(item.channel)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Odbiorca</dt>
                  <dd>{item.recipient ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Wynik</dt>
                  <dd>{item.outcome ?? '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Tryb</dt>
                  <dd>{item.mode ?? '-'}</dd>
                </div>
              </dl>

              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{item.message}</p>
              {item.errorMessage && (
                <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Blad transportu: {item.errorMessage}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
