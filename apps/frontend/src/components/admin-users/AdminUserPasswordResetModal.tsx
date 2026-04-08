interface AdminUserPasswordResetModalProps {
  isOpen: boolean
  email: string
  temporaryPassword: string
  error: string | null
  isSaving: boolean
  onTemporaryPasswordChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}

export function AdminUserPasswordResetModal({
  isOpen,
  email,
  temporaryPassword,
  error,
  isSaving,
  onTemporaryPasswordChange,
  onClose,
  onSubmit,
}: AdminUserPasswordResetModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-950/40 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Reset hasla</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Ustaw nowe haslo tymczasowe dla konta <span className="font-medium">{email}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            Zamknij
          </button>
        </div>

        <label className="mt-6 block">
          <span className="label">Haslo tymczasowe</span>
          <input
            type="password"
            value={temporaryPassword}
            onChange={(event) => onTemporaryPasswordChange(event.target.value)}
            className={`input-field ${error ? 'input-error' : ''}`}
            placeholder="Minimum 8 znakow"
            autoComplete="new-password"
            disabled={isSaving}
            data-testid="admin-user-reset-password"
          />
        </label>

        <p className="mt-3 text-xs leading-5 text-gray-500">
          Haslo nie jest wyswietlane po zapisaniu i nie trafia do historii administracyjnej.
        </p>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={isSaving}>
            Anuluj
          </button>
          <button type="button" onClick={onSubmit} className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Resetowanie...' : 'Zresetuj haslo'}
          </button>
        </div>
      </div>
    </div>
  )
}
