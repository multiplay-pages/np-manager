import type { InternalNotificationDeliveryAttemptDto } from '@np-manager/shared'
import { getInternalNotificationRetryBlockedReasonLabel } from '@/lib/internalNotificationRetryMessages'

interface InternalNotificationAttemptsPanelProps {
  items: InternalNotificationDeliveryAttemptDto[]
  isLoading: boolean
  error: string | null
  canRetryAttempts: boolean
  retryingAttemptId: string | null
  retrySuccessMessage: string | null
  retryErrorMessage: string | null
  onRetryAttempt: (attemptId: string) => void
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

function formatOrigin(origin: InternalNotificationDeliveryAttemptDto['attemptOrigin']): string {
  if (origin === 'PRIMARY') return 'Primary dispatch'
  if (origin === 'ERROR_FALLBACK') return 'Error fallback'
  return 'Retry'
}

function formatChannel(channel: InternalNotificationDeliveryAttemptDto['channel']): string {
  if (channel === 'EMAIL') return 'E-mail'
  return 'Teams'
}

function formatFailureKind(
  failureKind: InternalNotificationDeliveryAttemptDto['failureKind'],
): string {
  if (failureKind === 'DELIVERY') return 'Blad wysylki'
  if (failureKind === 'CONFIGURATION') return 'Blad konfiguracji'
  if (failureKind === 'POLICY') return 'Polityka'
  return '-'
}

function getOutcomeClass(outcome: InternalNotificationDeliveryAttemptDto['outcome']): string {
  if (outcome === 'FAILED') return 'bg-red-100 text-red-700'
  if (outcome === 'MISCONFIGURED') return 'bg-amber-100 text-amber-700'
  if (outcome === 'SENT' || outcome === 'STUBBED') return 'bg-emerald-100 text-emerald-700'
  return 'bg-gray-100 text-gray-700'
}

export function InternalNotificationAttemptsPanel({
  items,
  isLoading,
  error,
  canRetryAttempts,
  retryingAttemptId,
  retrySuccessMessage,
  retryErrorMessage,
  onRetryAttempt,
}: InternalNotificationAttemptsPanelProps) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          Proby dostarczenia notyfikacji
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Ledger wykonanych prob transportu internal notifications. Szersza historia routingu i
          auditow pozostaje w panelu historii powiadomien wewnetrznych.
        </p>
      </div>

      {retrySuccessMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {retrySuccessMessage}
        </div>
      )}

      {retryErrorMessage && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {retryErrorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Ladowanie prob dostarczenia...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Brak zapisanych prob transportu w modelu attempts dla tej sprawy.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isRetrying = retryingAttemptId === item.id
            const canShowRetryButton = item.canRetry && canRetryAttempts

            return (
              <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{item.eventLabel}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDateTime(item.createdAt)}
                      {item.eventCode ? ` | ${item.eventCode}` : ''}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${getOutcomeClass(
                      item.outcome,
                    )}`}
                  >
                    {item.outcome}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-gray-500">Pochodzenie proby</dt>
                    <dd>{formatOrigin(item.attemptOrigin)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Kanal</dt>
                    <dd>{formatChannel(item.channel)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Odbiorca</dt>
                    <dd>{item.recipient}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Tryb</dt>
                    <dd>{item.mode}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Rodzaj problemu</dt>
                    <dd>{formatFailureKind(item.failureKind)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Licznik retry</dt>
                    <dd>{item.retryCount}</dd>
                  </div>
                </dl>

                {canShowRetryButton ? (
                  <button
                    type="button"
                    onClick={() => onRetryAttempt(item.id)}
                    disabled={isRetrying}
                    className="mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRetrying ? 'Ponawiam...' : 'Ponow'}
                  </button>
                ) : (
                  <p className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    {item.canRetry
                      ? 'Ponowienie dostepne dla zespolu operacyjnego.'
                      : getInternalNotificationRetryBlockedReasonLabel(item.retryBlockedReasonCode)}
                  </p>
                )}

                {item.errorMessage && (
                  <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Blad transportu: {item.errorMessage}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
