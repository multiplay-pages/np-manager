import { AlertBanner, Button } from '@/components/ui'

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
      <div className="w-full max-w-lg rounded-panel border border-line bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-ink-900">Reset hasła</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              Ustaw nowe hasło tymczasowe dla konta <span className="font-medium">{email}</span>.
            </p>
          </div>
          <Button type="button" onClick={onClose} variant="ghost" size="sm">
            Zamknij
          </Button>
        </div>

        <label className="mt-6 block">
          <span className="label">Hasło tymczasowe</span>
          <input
            type="password"
            value={temporaryPassword}
            onChange={(event) => onTemporaryPasswordChange(event.target.value)}
            className={`input-field ${error ? 'input-error' : ''}`}
            placeholder="Minimum 8 znaków"
            autoComplete="new-password"
            disabled={isSaving}
            data-testid="admin-user-reset-password"
          />
        </label>

        <p className="mt-3 text-xs leading-5 text-ink-500">
          Hasło nie jest wyświetlane po zapisaniu i nie trafia do historii administracyjnej.
        </p>

        {error && <AlertBanner className="mt-4" tone="danger" title={error} />}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" onClick={onClose} disabled={isSaving}>
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            variant="primary"
            isLoading={isSaving}
            loadingLabel="Resetowanie..."
          >
            Zresetuj hasło
          </Button>
        </div>
      </div>
    </div>
  )
}
