import { useState } from 'react'
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

function DiagnosticPanel({ label, data }: { label: string; data: unknown }) {
  if (!data) return null

  return (
    <details className="group mt-2">
      <summary
        onClick={(event) => event.currentTarget.focus()}
        className="flex w-full cursor-pointer list-none items-center gap-2 text-xs text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 [&::-webkit-details-marker]:hidden"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-200 bg-white text-[10px] font-semibold transition-transform group-open:rotate-180"
        >
          v
        </span>
        <span>{label}</span>
      </summary>
      <pre className="mt-1 overflow-x-auto rounded bg-gray-50 border border-gray-200 p-2 text-xs text-gray-700 whitespace-pre-wrap break-all">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  )
}

function IntegrationEventItem({ item }: { item: PliCbdIntegrationEventDto }) {
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  const hasDiagnostics = item.requestPayloadJson !== null || item.responsePayloadJson !== null
  const hasTransportMeta =
    item.transportMode !== null ||
    item.transportAdapterName !== null ||
    item.transportOutcome !== null

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {PLI_CBD_INTEGRATION_DIRECTION_LABELS[item.operationType]}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClassName(item.operationStatus)}`}
            >
              {PLI_CBD_INTEGRATION_STATUS_LABELS[item.operationStatus]}
            </span>
            {item.actionName && (
              <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {item.actionName}
              </span>
            )}
            {item.transportMode && (
              <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                {item.transportMode}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600">
            {item.errorMessage ??
              item.actionName ??
              'Operacja PLI CBD zostala zapisana.'}
          </p>

          {hasTransportMeta && (
            <p className="text-xs text-gray-500">
              {item.transportAdapterName
                ? `Adapter: ${item.transportAdapterName}`
                : 'Adapter: brak danych'}
              {item.transportOutcome ? ` · Wynik: ${item.transportOutcome}` : ''}
            </p>
          )}

          <p className="text-xs text-gray-500">
            {item.triggeredByDisplayName
              ? `Wyzwolil: ${item.triggeredByDisplayName}`
              : 'Wyzwolono bez przypisanego uzytkownika'}
          </p>

          {hasDiagnostics && (
            <button
              type="button"
              onClick={() => setShowDiagnostics((v) => !v)}
              className="text-xs text-blue-600 hover:underline"
            >
              {showDiagnostics ? 'Ukryj dane diagnostyczne' : 'Pokaz dane diagnostyczne'}
            </button>
          )}

          {showDiagnostics && (
            <div className="pt-1 space-y-1">
              <DiagnosticPanel
                label="Diagnostyka (XML preview, blocking reasons, warnings)"
                data={item.requestPayloadJson}
              />
              <DiagnosticPanel
                label="Transport (envelope snapshot + wynik adaptera)"
                data={item.responsePayloadJson}
              />
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 sm:text-right shrink-0">
          <p>{formatDateTime(item.createdAt)}</p>
          {item.completedAt && <p>Zakonczono: {formatDateTime(item.completedAt)}</p>}
        </div>
      </div>
    </div>
  )
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
            <IntegrationEventItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
