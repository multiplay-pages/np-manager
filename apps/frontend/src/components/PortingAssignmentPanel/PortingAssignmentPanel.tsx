import type {
  PortingRequestAssigneeSummaryDto,
  PortingRequestAssignmentHistoryItemDto,
} from '@np-manager/shared'
import {
  formatAssigneeLabel,
  formatAssignmentHistoryHeadline,
} from '@/lib/portingOwnership'

export interface PortingAssignmentOption {
  id: string
  label: string
}

interface PortingAssignmentPanelProps {
  assignedUser: PortingRequestAssigneeSummaryDto | null
  assignedAt: string | null
  assignedByDisplayName: string | null
  historyItems: PortingRequestAssignmentHistoryItemDto[]
  isHistoryLoading: boolean
  canManageAssignment: boolean
  canSelectAssignee: boolean
  isLoadingAssigneeOptions: boolean
  assigneeOptions: PortingAssignmentOption[]
  selectedAssigneeId: string
  currentUserId: string | null
  isAssigningToMe: boolean
  isUpdatingAssignment: boolean
  isUnassigning: boolean
  feedbackError: string | null
  feedbackSuccess: string | null
  onSelectedAssigneeIdChange: (value: string) => void
  onAssignToMe: () => void
  onUpdateAssignment: () => void
  onUnassign: () => void
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildHistoryActorLabel(item: PortingRequestAssignmentHistoryItemDto): string {
  return `${item.changedByUser.displayName} (${item.changedByUser.email})`
}

export function PortingAssignmentPanel({
  assignedUser,
  assignedAt,
  assignedByDisplayName,
  historyItems,
  isHistoryLoading,
  canManageAssignment,
  canSelectAssignee,
  isLoadingAssigneeOptions,
  assigneeOptions,
  selectedAssigneeId,
  currentUserId,
  isAssigningToMe,
  isUpdatingAssignment,
  isUnassigning,
  feedbackError,
  feedbackSuccess,
  onSelectedAssigneeIdChange,
  onAssignToMe,
  onUpdateAssignment,
  onUnassign,
}: PortingAssignmentPanelProps) {
  const isAssignedToMe = assignedUser?.id === currentUserId
  const isAnyAssignmentActionLoading = isAssigningToMe || isUpdatingAssignment || isUnassigning

  return (
    <div className="panel p-5" data-testid="porting-assignment-panel">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Przypisanie</h2>
        <p className="mt-1 text-sm text-gray-500">Kto aktualnie prowadzi te sprawe.</p>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="mb-0.5 text-xs text-gray-500">Aktualny wlasciciel</dt>
          <dd className="text-sm text-gray-900" data-testid="assignment-owner-value">
            {formatAssigneeLabel(assignedUser)}
          </dd>
        </div>
        <div>
          <dt className="mb-0.5 text-xs text-gray-500">Data przypisania</dt>
          <dd className="text-sm text-gray-900">{assignedAt ? formatDateTime(assignedAt) : '-'}</dd>
        </div>
        {assignedByDisplayName && (
          <div className="sm:col-span-2">
            <dt className="mb-0.5 text-xs text-gray-500">Przypisal</dt>
            <dd className="text-sm text-gray-900">{assignedByDisplayName}</dd>
          </div>
        )}
      </dl>

      {canManageAssignment ? (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={onAssignToMe}
              disabled={isAnyAssignmentActionLoading || isAssignedToMe}
              data-testid="assignment-assign-to-me"
            >
              {isAssigningToMe ? 'Przypisywanie...' : 'Przypisz do mnie'}
            </button>

            {assignedUser && (
              <button
                type="button"
                className="btn-secondary"
                onClick={onUnassign}
                disabled={isAnyAssignmentActionLoading}
                data-testid="assignment-unassign"
              >
                {isUnassigning ? 'Usuwanie...' : 'Zdejmij przypisanie'}
              </button>
            )}
          </div>

          {canSelectAssignee ? (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Zmien przypisanie na innego uzytkownika
                </span>
                <select
                  value={selectedAssigneeId}
                  onChange={(event) => onSelectedAssigneeIdChange(event.target.value)}
                  className="input-field"
                  disabled={isLoadingAssigneeOptions || isAnyAssignmentActionLoading}
                  data-testid="assignment-select"
                >
                  <option value="">Wybierz uzytkownika</option>
                  {assigneeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="btn-primary"
                onClick={onUpdateAssignment}
                disabled={
                  isLoadingAssigneeOptions ||
                  isAnyAssignmentActionLoading ||
                  !selectedAssigneeId
                }
                data-testid="assignment-update"
              >
                {isUpdatingAssignment ? 'Zapisywanie...' : 'Zapisz przypisanie'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Zmiana przypisania na innego uzytkownika jest dostepna w panelu administratora.
            </p>
          )}

          {feedbackSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {feedbackSuccess}
            </div>
          )}

          {feedbackError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {feedbackError}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600">
          Twoja rola ma dostep tylko do podgladu przypisania.
        </div>
      )}

      <div className="mt-4 border-t border-gray-100 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">
          Historia przypisan
        </h3>

        {isHistoryLoading ? (
          <p className="mt-2 text-sm text-gray-500">Ladowanie historii przypisan...</p>
        ) : historyItems.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Brak zmian przypisania dla tej sprawy.</p>
        ) : (
          <ol className="mt-2 space-y-2" data-testid="assignment-history-list">
            {historyItems.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <p className="text-sm text-gray-800">{formatAssignmentHistoryHeadline(item)}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatDateTime(item.createdAt)} · przez {buildHistoryActorLabel(item)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
