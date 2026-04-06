import {
  PORTING_CASE_STATUS_LABELS,
  USER_ROLE_LABELS,
  type PortingRequestCaseHistoryItemDto,
} from '@np-manager/shared'

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getEventTitle(item: PortingRequestCaseHistoryItemDto): string {
  if (item.eventType === 'REQUEST_CREATED') {
    return 'Utworzono sprawe'
  }

  if (item.statusAfter) {
    return `Zmiana statusu na: ${PORTING_CASE_STATUS_LABELS[item.statusAfter]}`
  }

  return 'Zdarzenie biznesowe'
}

function HistoryItem({ item }: { item: PortingRequestCaseHistoryItemDto }) {
  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <div className="mt-1.5 h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
        <div className="w-px flex-1 bg-gray-200" />
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{getEventTitle(item)}</span>
          {item.statusAfter && (
            <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {PORTING_CASE_STATUS_LABELS[item.statusAfter]}
            </span>
          )}
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>{formatTimestamp(item.timestamp)}</span>
          {item.actorDisplayName && <span>{item.actorDisplayName}</span>}
          {item.actorRole && <span>{USER_ROLE_LABELS[item.actorRole]}</span>}
        </div>

        {(item.statusBefore || item.statusAfter) && (
          <div className="mb-2 text-xs text-gray-500">
            {item.statusBefore && <span>{PORTING_CASE_STATUS_LABELS[item.statusBefore]}</span>}
            {item.statusBefore && item.statusAfter && <span> {'->'} </span>}
            {item.statusAfter && (
              <span className="font-medium text-gray-700">
                {PORTING_CASE_STATUS_LABELS[item.statusAfter]}
              </span>
            )}
          </div>
        )}

        {item.reason && (
          <p className="text-sm text-gray-700">
            <span className="font-medium">Powod:</span> {item.reason}
          </p>
        )}

        {item.comment && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{item.comment}</p>
        )}
      </div>
    </div>
  )
}

interface PortingCaseHistoryProps {
  items: PortingRequestCaseHistoryItemDto[]
  isLoading: boolean
}

export function PortingCaseHistory({ items, isLoading }: PortingCaseHistoryProps) {
  if (isLoading) {
    return (
      <div className="card p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-700">
          Historia sprawy
        </h2>
        <p className="mb-4 text-sm text-gray-500">Biznesowy audit trail zmian statusu sprawy.</p>
        <div className="flex items-center justify-center py-8 text-sm text-gray-400">
          Ladowanie historii...
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="card p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-700">
          Historia sprawy
        </h2>
        <p className="mb-4 text-sm text-gray-500">Biznesowy audit trail zmian statusu sprawy.</p>
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center text-sm text-gray-500">
          Brak wpisow w historii sprawy.
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-700">
        Historia sprawy
      </h2>
      <p className="mb-4 text-sm text-gray-500">Biznesowy audit trail zmian statusu sprawy.</p>
      <div>
        {items.map((item) => (
          <HistoryItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
