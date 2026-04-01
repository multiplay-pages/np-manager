import {
  PLI_CBD_INTEGRATION_DIRECTION_LABELS,
  PLI_CBD_INTEGRATION_STATUS_LABELS,
} from '@np-manager/shared'
import type { PliCbdIntegrationEventDto } from '@np-manager/shared'

interface PliCbdIntegrationHistoryProps {
  items: PliCbdIntegrationEventDto[]
  isLoading: boolean
}

function getStatusClassName(status: PliCbdIntegrationEventDto['operationStatus']): string {
  if (status === 'SUCCESS') {
    return 'bg-green-100 text-green-700'
  }

  if (status === 'ERROR') {
    return 'bg-red-100 text-red-700'
  }

  return 'bg-amber-100 text-amber-700'
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

export function PliCbdIntegrationHistory({
  items,
  isLoading,
}: PliCbdIntegrationHistoryProps) {
  return (
    <div className="card p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
          Historia integracji PLI CBD
        </h2>
        <p className="text-sm text-gray-500">
          Rejestr eksportow i synchronizacji wykonywanych dla tej sprawy.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          Ladowanie historii integracji...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          Brak zapisanych operacji integracyjnych dla tej sprawy.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {PLI_CBD_INTEGRATION_DIRECTION_LABELS[item.operationType]}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClassName(item.operationStatus)}`}
                    >
                      {PLI_CBD_INTEGRATION_STATUS_LABELS[item.operationStatus]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {item.errorMessage ??
                      item.actionName ??
                      'Operacja foundation PLI CBD zostala zapisana.'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.triggeredByDisplayName
                      ? `Wyzwolil: ${item.triggeredByDisplayName}`
                      : 'Wyzwolono bez przypisanego uzytkownika'}
                  </p>
                </div>

                <div className="text-xs text-gray-500 sm:text-right">
                  <p>{formatDateTime(item.createdAt)}</p>
                  {item.completedAt && <p>Zakonczono: {formatDateTime(item.completedAt)}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
