import type {
  PortingCaseStatus,
  PortingRequestCaseHistoryItemDto,
  PortingRequestStatusActionDto,
} from '@np-manager/shared'
import { PORTING_CASE_STATUS_LABELS } from '@np-manager/shared'

const TERMINAL_CLOSED_STATUSES: PortingCaseStatus[] = ['REJECTED', 'CANCELLED', 'PORTED']

export interface RequestWorkflowActionsSectionProps {
  canManageStatus: boolean
  statusInternal: PortingCaseStatus
  canUsePliCbdExternalActions: boolean
  workflowErrorEmptyStateMessage: string

  availableStatusActions: PortingRequestStatusActionDto[]
  selectedStatusAction: PortingRequestStatusActionDto | null
  statusReason: string
  statusComment: string
  isUpdatingStatus: boolean
  isExporting: boolean
  isSyncing: boolean
  statusActionSuccess: string | null
  statusActionError: string | null
  onSelectStatusAction: (action: PortingRequestStatusActionDto) => void
  onStatusReasonChange: (value: string) => void
  onStatusCommentChange: (value: string) => void
  onSubmitStatusAction: () => void
  onResetStatusActionForm: () => void

  canUseManualPortDateAction: boolean
  canUseManualPortDateForCurrentStatus: boolean
  manualConfirmedPortDate: string
  manualPortDateComment: string
  isSubmittingManualPortDate: boolean
  manualPortDateSuccess: string | null
  manualPortDateError: string | null
  onManualConfirmedPortDateChange: (value: string) => void
  onManualPortDateCommentChange: (value: string) => void
  onConfirmManualPortDate: () => void

  pliCbdExternalActionsSlot?: React.ReactNode
  errorDiagnosticsEntry?: PortingRequestCaseHistoryItemDto | null
}

function isCancelStatusAction(action: PortingRequestStatusActionDto): boolean {
  return action.actionId === 'CANCEL' || action.actionId === 'CANCEL_FROM_ERROR'
}

export function RequestWorkflowActionsSection({
  canManageStatus,
  statusInternal,
  canUsePliCbdExternalActions,
  workflowErrorEmptyStateMessage,
  availableStatusActions,
  selectedStatusAction,
  statusReason,
  statusComment,
  isUpdatingStatus,
  isExporting,
  isSyncing,
  statusActionSuccess,
  statusActionError,
  onSelectStatusAction,
  onStatusReasonChange,
  onStatusCommentChange,
  onSubmitStatusAction,
  onResetStatusActionForm,
  canUseManualPortDateAction,
  canUseManualPortDateForCurrentStatus,
  manualConfirmedPortDate,
  manualPortDateComment,
  isSubmittingManualPortDate,
  manualPortDateSuccess,
  manualPortDateError,
  onManualConfirmedPortDateChange,
  onManualPortDateCommentChange,
  onConfirmManualPortDate,
  pliCbdExternalActionsSlot,
  errorDiagnosticsEntry,
}: RequestWorkflowActionsSectionProps) {
  return (
    <section id="workflow-actions" className="panel scroll-mt-6 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-sm font-semibold text-ink-900">Akcje statusu</h2>
          <p className="mt-1 break-words text-sm leading-6 text-ink-500">
            Dostępne przejścia wynikają z aktualnego statusu sprawy i uprawnień operatora.
          </p>
        </div>
      </div>

      {statusInternal === 'ERROR' && (
        <div
          className="mb-4 rounded-panel border border-red-200 bg-red-50 p-4"
          data-testid="error-diagnostics-panel"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
            Diagnoza błędu
          </p>
          {errorDiagnosticsEntry ? (
            <dl className="space-y-1 text-sm text-red-900">
              {errorDiagnosticsEntry.reason && (
                <div>
                  <dt className="inline font-medium">Powód: </dt>
                  <dd className="inline">{errorDiagnosticsEntry.reason}</dd>
                </div>
              )}
              {errorDiagnosticsEntry.comment && (
                <div>
                  <dt className="inline font-medium">Szczegóły: </dt>
                  <dd className="inline">{errorDiagnosticsEntry.comment}</dd>
                </div>
              )}
              {errorDiagnosticsEntry.statusBefore && (
                <div>
                  <dt className="inline font-medium">Status przed błędem: </dt>
                  <dd className="inline">
                    {PORTING_CASE_STATUS_LABELS[errorDiagnosticsEntry.statusBefore]}
                  </dd>
                </div>
              )}
              {errorDiagnosticsEntry.actorDisplayName && (
                <div>
                  <dt className="inline font-medium">Oznaczył(a): </dt>
                  <dd className="inline">{errorDiagnosticsEntry.actorDisplayName}</dd>
                </div>
              )}
              <div>
                <dt className="inline font-medium">Data: </dt>
                <dd className="inline">
                  {new Date(errorDiagnosticsEntry.timestamp).toLocaleString('pl-PL')}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-red-700">
              Nie znaleziono szczegółów błędu w historii sprawy.
            </p>
          )}
          <p className="mt-2 text-xs text-red-600">
            Wznowienie przywróci sprawę do statusu sprzed wejścia w błąd, jeśli historia na to pozwala.
          </p>
        </div>
      )}

      {canManageStatus ? (
        <div className="space-y-4">
          {availableStatusActions.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {availableStatusActions.map((action) => (
                  <button
                    key={`${action.actionId}-${action.targetStatus}`}
                    type="button"
                    onClick={() => onSelectStatusAction(action)}
                    className={
                      selectedStatusAction?.actionId === action.actionId &&
                      selectedStatusAction.targetStatus === action.targetStatus
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }
                    disabled={isUpdatingStatus || isExporting || isSyncing}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ) : TERMINAL_CLOSED_STATUSES.includes(statusInternal) ? (
            <div className="rounded-panel border border-line bg-ink-50 px-4 py-3 text-sm text-ink-500">
              Sprawa zakończona — brak dostępnych akcji statusowych.
            </div>
          ) : statusInternal === 'ERROR' ? (
            <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {workflowErrorEmptyStateMessage}
            </div>
          ) : (
            <div className="rounded-panel border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Brak akcji dostępnych dla Twojej roli w tym statusie sprawy.
            </div>
          )}

          {selectedStatusAction ? (
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{selectedStatusAction.label}</h3>
                <p className="mt-1 text-sm text-gray-500">{selectedStatusAction.description}</p>
              </div>

              {selectedStatusAction.requiresReason && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600">
                    {selectedStatusAction.reasonLabel ?? 'Powód'}
                  </span>
                  <input
                    type="text"
                    value={statusReason}
                    onChange={(event) => onStatusReasonChange(event.target.value)}
                    className="input-field"
                    placeholder={selectedStatusAction.reasonLabel ?? 'Podaj powód'}
                  />
                  {isCancelStatusAction(selectedStatusAction) && (
                    <span className="mt-1 block text-xs text-gray-500">
                      Powód anulowania trafi do historii sprawy.
                    </span>
                  )}
                </label>
              )}

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  {selectedStatusAction.commentLabel ??
                    (selectedStatusAction.requiresComment ? 'Komentarz' : 'Komentarz (opcjonalnie)')}
                </span>
                <textarea
                  value={statusComment}
                  onChange={(event) => onStatusCommentChange(event.target.value)}
                  rows={selectedStatusAction.requiresComment ? 4 : 3}
                  className="input-field"
                  placeholder={
                    selectedStatusAction.requiresComment
                      ? 'Dodaj wymagany komentarz'
                      : 'Opcjonalny komentarz operacyjny'
                  }
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSubmitStatusAction()}
                  className="btn-primary"
                  disabled={isUpdatingStatus || isExporting || isSyncing}
                >
                  {isUpdatingStatus ? 'Zapisywanie...' : selectedStatusAction.label}
                </button>
                <button
                  type="button"
                  onClick={onResetStatusActionForm}
                  className="btn-secondary"
                  disabled={isUpdatingStatus}
                >
                  Wyczyść
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Wybierz akcję, aby zmienić status sprawy.
            </div>
          )}

          {statusActionSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {statusActionSuccess}
            </div>
          )}

          {statusActionError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {statusActionError}
            </div>
          )}

          {canUseManualPortDateAction && canUseManualPortDateForCurrentStatus && (
            <div className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/60 p-4">
              <div>
                <h3 className="text-sm font-semibold text-sky-900">Potwierdz date przeniesienia</h3>
                <p className="mt-1 text-sm text-sky-800">
                  To zapisuje krok procesu i dodaje zdarzenie w historii sprawy. To nie jest
                  zwykla edycja pola daty — daty pokazane w sekcji Terminy sa read-only i
                  zmienia je dopiero ta akcja procesowa.
                </p>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-sky-900">
                  Data przeniesienia
                </span>
                <input
                  type="date"
                  value={manualConfirmedPortDate}
                  onChange={(event) => onManualConfirmedPortDateChange(event.target.value)}
                  className="input-field"
                  disabled={
                    isSubmittingManualPortDate || isUpdatingStatus || isExporting || isSyncing
                  }
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-sky-900">
                  Komentarz operacyjny (opcjonalnie)
                </span>
                <textarea
                  value={manualPortDateComment}
                  onChange={(event) => onManualPortDateCommentChange(event.target.value)}
                  rows={3}
                  className="input-field"
                  placeholder="Dodaj komentarz do historii operacyjnej"
                  disabled={
                    isSubmittingManualPortDate || isUpdatingStatus || isExporting || isSyncing
                  }
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onConfirmManualPortDate()}
                  className="btn-primary"
                  disabled={
                    isSubmittingManualPortDate || isUpdatingStatus || isExporting || isSyncing
                  }
                >
                  {isSubmittingManualPortDate
                    ? 'Zapisywanie potwierdzenia'
                    : 'Potwierdz date przeniesienia'}
                </button>
                <button
                  type="button"
                  onClick={() => onManualPortDateCommentChange('')}
                  className="btn-secondary"
                  disabled={isSubmittingManualPortDate}
                >
                  Wyczysc komentarz
                </button>
              </div>

              {manualPortDateSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {manualPortDateSuccess}
                </div>
              )}

              {manualPortDateError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {manualPortDateError}
                </div>
              )}
            </div>
          )}

          {canUsePliCbdExternalActions && pliCbdExternalActionsSlot && (
            <div className="mt-6 border-t border-line pt-4">
              <p className="mb-3 text-xs text-ink-500">
                Czynności zewnętrzne dokumentują etap procesu zewnętrznego i są niezależne od akcji
                statusu sprawy.
              </p>
              {pliCbdExternalActionsSlot}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Twoja rola ma dostęp tylko do podglądu sprawy.
        </div>
      )}
    </section>
  )
}
