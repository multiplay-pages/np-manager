interface AdminUserDeactivateModalProps {
  isOpen: boolean
  email: string
  isSaving: boolean
  onClose: () => void
  onConfirm: () => void
}

export function AdminUserDeactivateModal({
  isOpen,
  email,
  isSaving,
  onClose,
  onConfirm,
}: AdminUserDeactivateModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-950/40 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Potwierdź dezaktywację konta</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Konto <span className="font-medium">{email}</span> zostanie dezaktywowane, a
              użytkownik utraci możliwość logowania do aplikacji do czasu ponownej aktywacji.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            disabled={isSaving}
            data-testid="admin-user-deactivate-close"
          >
            Zamknij
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={isSaving}
            data-testid="admin-user-deactivate-cancel"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary"
            disabled={isSaving}
            data-testid="admin-user-deactivate-confirm"
          >
            {isSaving ? 'Dezaktywowanie...' : 'Potwierdź dezaktywację'}
          </button>
        </div>
      </div>
    </div>
  )
}
