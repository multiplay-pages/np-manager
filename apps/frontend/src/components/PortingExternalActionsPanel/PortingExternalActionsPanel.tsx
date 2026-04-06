import type { PortingRequestExternalActionDto } from '@np-manager/shared'

interface PortingExternalActionsPanelProps {
  availableActions: PortingRequestExternalActionDto[]
  selectedAction: PortingRequestExternalActionDto | null
  scheduledPortDate: string
  rejectionReason: string
  comment: string
  createDraft: boolean
  isSubmitting: boolean
  successMessage: string | null
  errorMessage: string | null
  onSelectAction: (action: PortingRequestExternalActionDto) => void
  onScheduledPortDateChange: (value: string) => void
  onRejectionReasonChange: (value: string) => void
  onCommentChange: (value: string) => void
  onCreateDraftChange: (value: boolean) => void
  onSubmit: () => void
  onReset: () => void
}

export function PortingExternalActionsPanel({
  availableActions,
  selectedAction,
  scheduledPortDate,
  rejectionReason,
  comment,
  createDraft,
  isSubmitting,
  successMessage,
  errorMessage,
  onSelectAction,
  onScheduledPortDateChange,
  onRejectionReasonChange,
  onCommentChange,
  onCreateDraftChange,
  onSubmit,
  onReset,
}: PortingExternalActionsPanelProps) {
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">Etapy zewnetrzne</h3>
        <p className="mt-1 text-sm text-gray-500">
          Reczne akcje foundation pod Adescom/PLI CBD. Dzialaja bez realnej integracji API.
        </p>
      </div>

      {availableActions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {availableActions.map((action) => (
            <button
              key={action.actionId}
              type="button"
              onClick={() => onSelectAction(action)}
              className={
                selectedAction?.actionId === action.actionId ? 'btn-primary' : 'btn-secondary'
              }
              disabled={isSubmitting}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Dla aktualnego stanu sprawy nie ma dostepnych recznych akcji zewnetrznych.
        </div>
      )}

      {selectedAction && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-800">{selectedAction.label}</h4>
            <p className="mt-1 text-sm text-gray-500">{selectedAction.description}</p>
          </div>

          {selectedAction.requiresScheduledPortDate && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">Data przeniesienia</span>
              <input
                type="date"
                value={scheduledPortDate}
                onChange={(event) => onScheduledPortDateChange(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </label>
          )}

          {selectedAction.requiresRejectionReason && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">Powod odrzucenia</span>
              <textarea
                value={rejectionReason}
                onChange={(event) => onRejectionReasonChange(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                placeholder="Podaj powod odrzucenia od dawcy"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Komentarz operacyjny</span>
            <textarea
              value={comment}
              onChange={(event) => onCommentChange(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              placeholder="Opcjonalny komentarz do historii operacyjnej"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={createDraft}
              onChange={(event) => onCreateDraftChange(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Utworz draft e-mail do klienta po wykonaniu akcji
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSubmit}
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Zapisywanie...' : selectedAction.label}
            </button>
            <button type="button" onClick={onReset} className="btn-secondary" disabled={isSubmitting}>
              Wyczysc
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
    </div>
  )
}
