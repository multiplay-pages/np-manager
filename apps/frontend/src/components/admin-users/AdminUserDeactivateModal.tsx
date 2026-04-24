import { Button } from '@/components/ui'

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
      <div className="w-full max-w-lg rounded-panel border border-line bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-ink-900">Potwierdź dezaktywację konta</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              Konto <span className="font-medium">{email}</span> zostanie dezaktywowane, a
              użytkownik utraci możliwość logowania do aplikacji do czasu ponownej aktywacji.
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="sm"
            disabled={isSaving}
            data-testid="admin-user-deactivate-close"
          >
            Zamknij
          </Button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            data-testid="admin-user-deactivate-cancel"
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            variant="primary"
            isLoading={isSaving}
            loadingLabel="Dezaktywowanie..."
            data-testid="admin-user-deactivate-confirm"
          >
            Potwierdź dezaktywację
          </Button>
        </div>
      </div>
    </div>
  )
}
