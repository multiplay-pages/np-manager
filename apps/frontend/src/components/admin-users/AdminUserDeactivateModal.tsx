import { useEffect, useMemo, useState } from 'react'
import { AlertBanner, Button } from '@/components/ui'

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
  const [confirmEmail, setConfirmEmail] = useState('')
  const isConfirmed = useMemo(
    () => confirmEmail.trim().toLowerCase() === email.trim().toLowerCase(),
    [confirmEmail, email],
  )

  useEffect(() => {
    if (!isOpen) {
      setConfirmEmail('')
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const handleClose = () => {
    setConfirmEmail('')
    onClose()
  }

  const handleConfirm = () => {
    if (!isConfirmed) {
      return
    }

    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-950/40 px-4">
      <div className="w-full max-w-lg rounded-panel border border-line bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-ink-900">Potwierdź dezaktywację konta</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              Konto <span className="font-medium">{email}</span> zostanie dezaktywowane.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleClose}
            variant="ghost"
            size="sm"
            disabled={isSaving}
            data-testid="admin-user-deactivate-close"
          >
            Zamknij
          </Button>
        </div>

        <AlertBanner
          className="mt-5"
          tone="danger"
          title="To ryzykowna akcja administracyjna"
          description={
            <ul className="list-disc space-y-1 pl-5">
              <li>Użytkownik straci możliwość logowania.</li>
              <li>Konto nie zostanie usunięte.</li>
              <li>Historię i audyt nadal będzie można odczytać.</li>
              <li>Konto można później reaktywować.</li>
            </ul>
          }
        />

        <label className="mt-5 block">
          <span className="label">Aby potwierdzić, wpisz adres e-mail użytkownika.</span>
          <input
            type="email"
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
            className="input-field"
            placeholder={email}
            autoComplete="off"
            disabled={isSaving}
            data-testid="admin-user-deactivate-confirm-email"
          />
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            data-testid="admin-user-deactivate-cancel"
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            variant="danger"
            disabled={!isConfirmed}
            isLoading={isSaving}
            loadingLabel="Dezaktywowanie..."
            data-testid="admin-user-deactivate-confirm"
          >
            Dezaktywuj konto
          </Button>
        </div>
      </div>
    </div>
  )
}
