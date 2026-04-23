import type { DetailsHistoryFieldName, PortingRequestDetailsHistoryItemDto } from '@np-manager/shared'

const FIELD_LABELS: Record<DetailsHistoryFieldName, string> = {
  correspondenceAddress: 'Adres korespondencyjny',
  contactChannel: 'Kanal kontaktu',
  internalNotes: 'Notatki wewnetrzne',
  requestDocumentNumber: 'Numer dokumentu',
  confirmedPortDate: 'Data przeniesienia numeru',
}

interface RequestDetailsHistoryPanelProps {
  items: PortingRequestDetailsHistoryItemDto[]
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

function formatValue(value: string | null): string {
  if (value === null || value === 'BRAK') return '—'
  return value
}

function ValueCell({ label, value }: { label: string; value: string | null }) {
  const display = formatValue(value)
  const isEmpty = value === null || value === 'BRAK'
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd
        className={`mt-0.5 break-words text-sm ${isEmpty ? 'italic text-gray-400' : 'text-gray-800'}`}
      >
        {display}
      </dd>
    </div>
  )
}

export function RequestDetailsHistoryPanel({
  items,
  isLoading,
  error,
}: RequestDetailsHistoryPanelProps) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          Historia zmian danych sprawy
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Zmiany pol: adres korespondencyjny, kanal kontaktu, notatki, numer dokumentu, data przeniesienia.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Ladowanie historii zmian...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Brak zarejestrowanych zmian danych sprawy.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-blue-700">
                  {FIELD_LABELS[item.fieldName]}
                </span>
                <span className="text-xs text-gray-500">{formatDateTime(item.timestamp)}</span>
              </div>

              <dl className="grid grid-cols-2 gap-3">
                <ValueCell label="Przed" value={item.oldValue} />
                <ValueCell label="Po" value={item.newValue} />
              </dl>

              <p className="mt-3 text-xs text-gray-500">
                {item.actorDisplayName ?? 'Nieznany uzytkownik'}
                {item.actorRole ? ` · ${item.actorRole}` : ''}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
