import {
  COMMUNICATION_DELIVERY_OUTCOME_LABELS,
  PORTING_CASE_STATUS_LABELS,
  PORTING_COMMUNICATION_STATUS_LABELS,
  PORTING_REQUEST_COMMUNICATION_ACTION_TYPE_LABELS,
  type CommunicationDeliveryAttemptDto,
  type CommunicationDeliveryAttemptsResultDto,
  type PortingCommunicationDto,
  type PortingCommunicationPreviewDto,
  type PortingCommunicationSummaryDto,
  type PortingCaseStatus,
  type PortingRequestCommunicationActionDto,
  type PortingRequestCommunicationActionType,
} from '@np-manager/shared'
import { Badge, Button, cx } from '@/components/ui'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusClass(status: PortingCommunicationDto['status']): string {
  if (status === 'SENT') {
    return 'bg-green-100 text-green-700'
  }

  if (status === 'FAILED') {
    return 'bg-red-100 text-red-700'
  }

  if (status === 'READY_TO_SEND') {
    return 'bg-blue-100 text-blue-700'
  }

  if (status === 'SENDING') {
    return 'bg-indigo-100 text-indigo-700'
  }

  if (status === 'CANCELLED') {
    return 'bg-gray-100 text-gray-500'
  }

  return 'bg-amber-100 text-amber-700'
}

function getDeliveryOutcomeClass(outcome: CommunicationDeliveryAttemptDto['outcome']): string {
  if (outcome === 'SUCCESS') return 'bg-green-100 text-green-700'
  if (outcome === 'FAILED') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-700'
}

function renderSummaryValue(value: string | null): string {
  return value ?? '-'
}

function getActionTypeLabel(type: PortingRequestCommunicationActionType): string {
  return PORTING_REQUEST_COMMUNICATION_ACTION_TYPE_LABELS[type]
}

const actionAvailabilityByType: Record<PortingRequestCommunicationActionType, PortingCaseStatus[]> = {
  MISSING_DOCUMENTS: ['DRAFT', 'SUBMITTED', 'PENDING_DONOR'],
  CLIENT_CONFIRMATION: ['DRAFT', 'SUBMITTED', 'PENDING_DONOR', 'CONFIRMED'],
  REJECTION_NOTICE: ['REJECTED'],
  COMPLETION_NOTICE: ['PORTED'],
  INTERNAL_NOTE_EMAIL: ['DRAFT', 'SUBMITTED', 'PENDING_DONOR', 'CONFIRMED', 'ERROR'],
}

const TERMINAL_STATUSES: PortingCaseStatus[] = ['REJECTED', 'CANCELLED', 'PORTED']

function formatStatusList(statuses: PortingCaseStatus[]): string {
  return statuses.map((status) => PORTING_CASE_STATUS_LABELS[status]).join(', ')
}

function buildBlockedReason(
  action: PortingRequestCommunicationActionDto,
  currentStatus: PortingCaseStatus | null,
): string | null {
  if (!action.disabledReason) {
    return null
  }

  if (action.existingDraftInfo) {
    return 'Akcja jest wstrzymana, bo istnieje aktywny draft tego typu. Oznacz go jako wyslany albo anuluj przed utworzeniem kolejnego.'
  }

  const availableStatuses = actionAvailabilityByType[action.type]

  if (availableStatuses.length > 0) {
    if (currentStatus && TERMINAL_STATUSES.includes(currentStatus)) {
      return `Ta akcja nie jest dostepna dla zakonczonej sprawy. Przewidziana jest dla statusow: ${formatStatusList(availableStatuses)}.`
    }

    const currentStatusLabel = currentStatus ? PORTING_CASE_STATUS_LABELS[currentStatus] : 'nieznany'
    return `Akcja bedzie dostepna dla statusow: ${formatStatusList(availableStatuses)}. Aktualny status: ${currentStatusLabel}.`
  }

  return action.disabledReason
}

function canSend(status: PortingCommunicationDto['status']): boolean {
  return status === 'DRAFT' || status === 'READY_TO_SEND'
}

function canRetry(status: PortingCommunicationDto['status']): boolean {
  return status === 'FAILED'
}

function canCancel(status: PortingCommunicationDto['status']): boolean {
  return status === 'DRAFT' || status === 'READY_TO_SEND'
}

interface PortingCommunicationPanelProps {
  actions: PortingRequestCommunicationActionDto[]
  summary: PortingCommunicationSummaryDto
  items: PortingCommunicationDto[]
  isLoadingHistory: boolean
  preview: PortingCommunicationPreviewDto | null
  feedbackError: string | null
  feedbackSuccess: string | null
  previewingActionType: PortingRequestCommunicationActionType | null
  creatingDraftActionType: PortingRequestCommunicationActionType | null
  markingSentId: string | null
  sendingId: string | null
  retryingId: string | null
  cancellingId: string | null
  deliveryAttemptsByCommId: Record<string, CommunicationDeliveryAttemptsResultDto>
  loadingDeliveryAttemptsId: string | null
  currentStatus?: PortingCaseStatus | null
  onPreviewDraft: (actionType: PortingRequestCommunicationActionType) => void
  onCreateDraft: (actionType: PortingRequestCommunicationActionType) => void
  onMarkAsSent: (communicationId: string) => void
  onSend: (communicationId: string) => void
  onRetry: (communicationId: string) => void
  onCancel: (communicationId: string) => void
  onLoadDeliveryAttempts: (communicationId: string) => void
}

export function PortingCommunicationPanel({
  actions,
  summary,
  items,
  isLoadingHistory,
  preview,
  feedbackError,
  feedbackSuccess,
  previewingActionType,
  creatingDraftActionType,
  markingSentId,
  sendingId,
  retryingId,
  cancellingId,
  deliveryAttemptsByCommId,
  loadingDeliveryAttemptsId,
  currentStatus = null,
  onPreviewDraft,
  onCreateDraft,
  onMarkAsSent,
  onSend,
  onRetry,
  onCancel,
  onLoadDeliveryAttempts,
}: PortingCommunicationPanelProps) {
  return (
    <div className="panel p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-ink-900">
          Komunikacja operacyjna
        </h2>
        <p className="mt-1 text-sm leading-6 text-ink-500">
          Drafty i wysylki do klienta zgodne z aktualnym statusem sprawy oraz polityka uprawnien.
        </p>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-line bg-ink-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Drafty</p>
          <p className="mt-1 text-lg font-semibold text-ink-900">{summary.draftCount}</p>
          <p className="text-xs text-ink-500">Lacznie komunikacji: {summary.totalCount}</p>
        </div>

        <div className="rounded-lg border border-line bg-ink-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Wyslane</p>
          <p className="mt-1 text-lg font-semibold text-ink-900">{summary.sentCount}</p>
          <p className="text-xs text-ink-500">Bledy: {summary.errorCount}</p>
        </div>

        <div className="rounded-lg border border-line bg-ink-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Ostatnia komunikacja</p>
          <p className="mt-1 text-sm font-semibold text-ink-900">
            {summary.lastCommunicationType
              ? getActionTypeLabel(summary.lastCommunicationType)
              : 'Brak komunikacji'}
          </p>
          <p className="text-xs text-ink-500">
            {summary.lastCommunicationAt ? formatDateTime(summary.lastCommunicationAt) : '-'}
          </p>
        </div>
      </div>

      {feedbackSuccess && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {feedbackSuccess}
        </div>
      )}

      {feedbackError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {feedbackError}
        </div>
      )}

      <div className="space-y-3">
        {actions.length > 0 ? (
          actions.map((action) => {
            const isPreviewLoading = previewingActionType === action.type
            const isCreateLoading = creatingDraftActionType === action.type
            const isActionBusy = isPreviewLoading || isCreateLoading
            const blockedReason = buildBlockedReason(action, currentStatus)
            const previewForAction = preview?.actionType === action.type ? preview : null
            const disabledActionClass =
              'border-line bg-ink-50 text-ink-400 shadow-none hover:border-line hover:bg-ink-50'

            return (
              <div
                key={action.type}
                className={cx(
                  'rounded-lg border p-4',
                  action.disabled || !action.canCreateDraft
                    ? 'border-line bg-ink-50/80'
                    : 'border-line bg-surface',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-ink-900">{action.label}</h3>
                      {action.existingDraftInfo && (
                        <Badge tone="amber">Aktywny draft</Badge>
                      )}
                      {action.disabled && (
                        <Badge tone="neutral" className="bg-ink-100 text-ink-500">
                          Niedostepne teraz
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-ink-500">{action.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => onPreviewDraft(action.type)}
                      variant="secondary"
                      className={!action.canPreview ? disabledActionClass : undefined}
                      disabled={!action.canPreview || isPreviewLoading || isCreateLoading}
                    >
                      {isPreviewLoading ? 'Przygotowuje podglad' : 'Podglad'}
                    </Button>
                    <Button
                      onClick={() => onCreateDraft(action.type)}
                      variant={action.canCreateDraft ? 'primary' : 'secondary'}
                      className={!action.canCreateDraft ? disabledActionClass : undefined}
                      disabled={!action.canCreateDraft || isCreateLoading || isPreviewLoading}
                    >
                      {isCreateLoading ? 'Tworze draft' : 'Utworz draft'}
                    </Button>
                    <Button
                      onClick={() =>
                        action.existingDraftId ? onMarkAsSent(action.existingDraftId) : undefined
                      }
                      variant="secondary"
                      className={!action.canMarkSent ? disabledActionClass : undefined}
                      disabled={
                        !action.canMarkSent ||
                        !action.existingDraftId ||
                        markingSentId === action.existingDraftId
                      }
                    >
                      {markingSentId === action.existingDraftId
                        ? 'Zapis statusu'
                        : 'Oznacz jako wyslane'}
                    </Button>
                  </div>
                </div>

                {isActionBusy && (
                  <p role="status" className="mt-3 text-xs font-medium text-ink-500">
                    Trwa jednorazowa operacja. Po zakonczeniu panel odswiezy historie komunikacji.
                  </p>
                )}

                {blockedReason && (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                    {blockedReason}
                  </div>
                )}

                {action.existingDraftInfo && (
                  <div className="mt-3 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink-700">
                    <p className="font-medium">Istnieje juz aktywny draft tego typu.</p>
                    <p className="mt-1 text-xs text-ink-500">
                      {action.existingDraftInfo.subject}
                      {' · '}
                      {action.existingDraftInfo.recipient}
                      {' · '}
                      {formatDateTime(action.existingDraftInfo.createdAt)}
                      {action.existingDraftInfo.createdByDisplayName
                        ? ` · ${action.existingDraftInfo.createdByDisplayName}`
                        : ''}
                    </p>
                  </div>
                )}

                {previewForAction && (
                  <div className="mt-3 rounded-lg border border-line bg-ink-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Podglad draftu</p>
                    <p className="mt-1 text-sm text-ink-700">Do: {previewForAction.recipient}</p>
                    <p className="mt-2 text-sm font-semibold text-ink-900">
                      {previewForAction.subject}
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-ink-700">
                      {previewForAction.body}
                    </pre>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600">
            Dla tej roli nie ma dostepnych akcji komunikacyjnych.
          </div>
        )}
      </div>

      {/* Historia komunikacji */}
      <div className="mt-6 border-t border-gray-100 pt-5">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Historia komunikacji</h3>
          <p className="mt-1 text-sm text-gray-500">
            Lista komunikacji sortowana malejaco po dacie utworzenia.
          </p>
        </div>

        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400">
            Ladowanie historii komunikacji...
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => {
              const isSending = sendingId === item.id
              const isRetrying = retryingId === item.id
              const isCancelling = cancellingId === item.id
              const isLoadingAttempts = loadingDeliveryAttemptsId === item.id
              const deliveryResult = deliveryAttemptsByCommId[item.id]

              return (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {getActionTypeLabel(item.actionType)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getStatusClass(item.status)}`}
                        >
                          {PORTING_COMMUNICATION_STATUS_LABELS[item.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{item.subject}</p>
                    </div>

                    {/* Akcje dla elementu historii */}
                    <div className="flex flex-wrap gap-2">
                      {item.status !== 'SENT' && item.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => onMarkAsSent(item.id)}
                          className="btn-secondary"
                          disabled={markingSentId === item.id || isSending || isRetrying || isCancelling}
                        >
                          {markingSentId === item.id ? 'Zapis statusu' : 'Oznacz jako wyslane'}
                        </button>
                      )}

                      {canSend(item.status) && (
                        <button
                          type="button"
                          onClick={() => onSend(item.id)}
                          className="btn-primary"
                          disabled={isSending || isRetrying || isCancelling || markingSentId === item.id}
                        >
                          {isSending ? 'Wysylanie...' : 'Wyslij'}
                        </button>
                      )}

                      {canRetry(item.status) && (
                        <button
                          type="button"
                          onClick={() => onRetry(item.id)}
                          className="btn-primary"
                          disabled={isRetrying || isSending || isCancelling}
                        >
                          {isRetrying ? 'Ponawianie...' : 'Ponow wysylke'}
                        </button>
                      )}

                      {canCancel(item.status) && (
                        <button
                          type="button"
                          onClick={() => onCancel(item.id)}
                          className="btn-secondary"
                          disabled={isCancelling || isSending || isRetrying || markingSentId === item.id}
                        >
                          {isCancelling ? 'Anulowanie...' : 'Anuluj'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-500">Utworzono</p>
                      <p>{formatDateTime(item.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Autor</p>
                      <p>{renderSummaryValue(item.createdByDisplayName)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Odbiorca</p>
                      <p>{item.recipient}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Wyslano</p>
                      <p>{item.sentAt ? formatDateTime(item.sentAt) : '-'}</p>
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{item.body}</p>

                  {item.errorMessage && (
                    <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      <p className="font-medium">Blad wysylki:</p>
                      <p className="mt-1">{item.errorMessage}</p>
                    </div>
                  )}

                  {/* Historia prob doreczenia */}
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Historia prob doreczenia
                        {deliveryResult
                          ? ` (${deliveryResult.attempts.length})`
                          : ''}
                      </p>
                      <button
                        type="button"
                        onClick={() => onLoadDeliveryAttempts(item.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        disabled={isLoadingAttempts}
                      >
                        {isLoadingAttempts ? 'Ladowanie...' : 'Pokaz'}
                      </button>
                    </div>

                    {deliveryResult && (
                      <div className="mt-2">
                        {deliveryResult.attempts.length === 0 ? (
                          <p className="text-xs text-gray-400">Brak prob doreczenia.</p>
                        ) : (
                          <div className="space-y-2">
                            {deliveryResult.attempts.map((attempt) => (
                              <div
                                key={attempt.id}
                                className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium ${getDeliveryOutcomeClass(attempt.outcome)}`}
                                  >
                                    {COMMUNICATION_DELIVERY_OUTCOME_LABELS[attempt.outcome]}
                                  </span>
                                  <span className="text-gray-500">
                                    {formatDateTime(attempt.attemptedAt)}
                                  </span>
                                  {attempt.attemptedByDisplayName && (
                                    <span className="text-gray-500">
                                      · {attempt.attemptedByDisplayName}
                                    </span>
                                  )}
                                  <span className="rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-600">
                                    {attempt.adapterName}
                                  </span>
                                </div>
                                {attempt.transportMessageId && (
                                  <p className="mt-1 font-mono text-gray-500">
                                    msg: {attempt.transportMessageId}
                                  </p>
                                )}
                                {attempt.errorCode && (
                                  <p className="mt-1 text-red-600">
                                    [{attempt.errorCode}] {attempt.errorMessage}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600">
            Brak komunikacji zapisanych dla tej sprawy.
          </div>
        )}
      </div>
    </div>
  )
}
