import type { InternalNotificationDeliveryAttemptDto } from '@np-manager/shared'
import { getInternalNotificationRetryBlockedReasonLabel } from '@/lib/internalNotificationRetryMessages'
import { AlertBanner, Badge, Button, type BadgeTone } from '@/components/ui'

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
  if (origin === 'PRIMARY') return 'Pierwotna wysyłka'
  if (origin === 'ERROR_FALLBACK') return 'Fallback błędu'
  return 'Ponowienie'
}

function formatChannel(channel: InternalNotificationDeliveryAttemptDto['channel']): string {
  if (channel === 'EMAIL') return 'E-mail'
  return 'Teams'
}

function formatFailureKind(
  failureKind: InternalNotificationDeliveryAttemptDto['failureKind'],
): string {
  if (failureKind === 'DELIVERY') return 'Błąd wysyłki'
  if (failureKind === 'CONFIGURATION') return 'Błąd konfiguracji'
  if (failureKind === 'POLICY') return 'Polityka'
  return '-'
}

function getOutcomeTone(outcome: InternalNotificationDeliveryAttemptDto['outcome']): BadgeTone {
  if (outcome === 'FAILED') return 'red'
  if (outcome === 'MISCONFIGURED') return 'amber'
  if (outcome === 'SENT' || outcome === 'STUBBED') return 'emerald'
  return 'neutral'
}

function getOutcomeLabel(outcome: InternalNotificationDeliveryAttemptDto['outcome']): string {
  if (outcome === 'SENT') return 'Wysłano'
  if (outcome === 'STUBBED') return 'Stub'
  if (outcome === 'DISABLED') return 'Wyłączone'
  if (outcome === 'MISCONFIGURED') return 'Błąd konfiguracji'
  if (outcome === 'FAILED') return 'Błąd wysyłki'
  return 'Pominięto'
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
        <h2 className="text-sm font-semibold text-ink-900">
          Próby dostarczenia notyfikacji
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Historia wysyłek dla tej sprawy. Ponów nieudaną próbę lub sprawdź przyczynę błędu.
        </p>
      </div>

      {retrySuccessMessage && (
        <div className="mb-4">
          <AlertBanner tone="success" title={retrySuccessMessage} />
        </div>
      )}

      {retryErrorMessage && (
        <div className="mb-4">
          <AlertBanner tone="danger" title={retryErrorMessage} />
        </div>
      )}

      {isLoading ? (
        <div className="rounded-panel border border-dashed border-line bg-ink-50 px-4 py-3 text-sm text-ink-500">
          Ładowanie prób dostarczenia...
        </div>
      ) : error ? (
        <AlertBanner tone="danger" title={error} />
      ) : items.length === 0 ? (
        <div className="rounded-panel border border-dashed border-line bg-ink-50 px-4 py-3 text-sm text-ink-600">
          Brak prób dostarczenia notyfikacji dla tej sprawy.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isRetrying = retryingAttemptId === item.id
            const canShowRetryButton = item.canRetry && canRetryAttempts

            return (
              <article key={item.id} className="rounded-panel border border-line bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-900">{item.eventLabel}</h3>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {formatDateTime(item.createdAt)}
                      {item.eventCode ? ` | ${item.eventCode}` : ''}
                    </p>
                  </div>
                  <Badge tone={getOutcomeTone(item.outcome)}>
                    {getOutcomeLabel(item.outcome)}
                  </Badge>
                </div>

                <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-ink-700 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-ink-400">Typ wysyłki</dt>
                    <dd>{formatOrigin(item.attemptOrigin)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-400">Kanał</dt>
                    <dd>{formatChannel(item.channel)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-400">Odbiorca</dt>
                    <dd className="break-all">{item.recipient}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-400">Tryb</dt>
                    <dd>{item.mode}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-400">Rodzaj błędu</dt>
                    <dd>{formatFailureKind(item.failureKind)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-400">Ponowienia</dt>
                    <dd>{item.retryCount}</dd>
                  </div>
                </dl>

                {canShowRetryButton ? (
                  <div className="mt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onRetryAttempt(item.id)}
                      disabled={isRetrying}
                    >
                      {isRetrying ? 'Ponawiam...' : 'Ponów'}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 rounded-panel border border-line bg-ink-50 px-3 py-2 text-xs text-ink-600">
                    {item.canRetry
                      ? 'Ponowienie dostepne dla zespolu operacyjnego.'
                      : getInternalNotificationRetryBlockedReasonLabel(item.retryBlockedReasonCode)}
                  </p>
                )}

                {item.errorMessage && (
                  <p className="mt-3 rounded-panel border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Błąd wysyłki: {item.errorMessage}
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
