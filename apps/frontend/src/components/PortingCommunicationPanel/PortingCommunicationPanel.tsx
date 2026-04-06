import {
  PORTING_COMMUNICATION_STATUS_LABELS,
  PORTING_REQUEST_COMMUNICATION_ACTION_TYPE_LABELS,
  type PortingCommunicationDto,
  type PortingCommunicationPreviewDto,
  type PortingCommunicationSummaryDto,
  type PortingRequestCommunicationActionDto,
  type PortingRequestCommunicationActionType,
} from '@np-manager/shared'

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

  if (status === 'READY') {
    return 'bg-blue-100 text-blue-700'
  }

  return 'bg-amber-100 text-amber-700'
}

function renderSummaryValue(value: string | null): string {
  return value ?? '-'
}

function getActionTypeLabel(type: PortingRequestCommunicationActionType): string {
  return PORTING_REQUEST_COMMUNICATION_ACTION_TYPE_LABELS[type]
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
  onPreviewDraft: (actionType: PortingRequestCommunicationActionType) => void
  onCreateDraft: (actionType: PortingRequestCommunicationActionType) => void
  onMarkAsSent: (communicationId: string) => void
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
  onPreviewDraft,
  onCreateDraft,
  onMarkAsSent,
}: PortingCommunicationPanelProps) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          Komunikacja operacyjna
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Backend steruje dostepnymi akcjami, blokadami i duplikatami draftow. UI tylko pokazuje
          aktualna polityke i historie.
        </p>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Drafty</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{summary.draftCount}</p>
          <p className="text-xs text-gray-500">Lacznie komunikacji: {summary.totalCount}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Wyslane</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{summary.sentCount}</p>
          <p className="text-xs text-gray-500">Bledy: {summary.errorCount}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Ostatnia komunikacja</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {summary.lastCommunicationType
              ? getActionTypeLabel(summary.lastCommunicationType)
              : 'Brak komunikacji'}
          </p>
          <p className="text-xs text-gray-500">
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
            const previewForAction = preview?.actionType === action.type ? preview : null

            return (
              <div key={action.type} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{action.label}</h3>
                      {action.existingDraftInfo && (
                        <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Aktywny draft
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{action.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onPreviewDraft(action.type)}
                      className="btn-secondary"
                      disabled={!action.canPreview || isPreviewLoading || isCreateLoading}
                    >
                      {isPreviewLoading ? 'Ladowanie...' : 'Podglad'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreateDraft(action.type)}
                      className="btn-primary"
                      disabled={!action.canCreateDraft || isCreateLoading || isPreviewLoading}
                    >
                      {isCreateLoading ? 'Tworzenie...' : 'Utworz draft'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        action.existingDraftId ? onMarkAsSent(action.existingDraftId) : undefined
                      }
                      className="btn-secondary"
                      disabled={
                        !action.canMarkSent ||
                        !action.existingDraftId ||
                        markingSentId === action.existingDraftId
                      }
                    >
                      {markingSentId === action.existingDraftId
                        ? 'Zapisywanie...'
                        : 'Oznacz jako wyslane'}
                    </button>
                  </div>
                </div>

                {action.disabledReason && (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {action.disabledReason}
                  </div>
                )}

                {action.existingDraftInfo && (
                  <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <p className="font-medium">Istnieje juz aktywny draft tego typu.</p>
                    <p className="mt-1 text-xs text-gray-500">
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
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Podglad draftu</p>
                    <p className="mt-1 text-sm text-gray-700">Do: {previewForAction.recipient}</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {previewForAction.subject}
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
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

      <div className="mt-6 border-t border-gray-100 pt-5">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Historia komunikacji</h3>
          <p className="mt-1 text-sm text-gray-500">
            Lista komunikacji jest sortowana malejaco po dacie utworzenia i pokazuje tylko dane
            potrzebne operacyjnie.
          </p>
        </div>

        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400">
            Ladowanie historii komunikacji...
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
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

                  {item.status !== 'SENT' && (
                    <button
                      type="button"
                      onClick={() => onMarkAsSent(item.id)}
                      className="btn-secondary"
                      disabled={markingSentId === item.id}
                    >
                      {markingSentId === item.id ? 'Zapisywanie...' : 'Oznacz jako wyslane'}
                    </button>
                  )}
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
                    {item.errorMessage}
                  </div>
                )}
              </div>
            ))}
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
