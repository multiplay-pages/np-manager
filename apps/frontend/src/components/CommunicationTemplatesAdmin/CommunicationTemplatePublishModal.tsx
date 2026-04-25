import { useEffect, useState } from 'react'
import { AlertBanner, Button } from '@/components/ui'

interface CommunicationTemplatePublishModalProps {
  isOpen: boolean
  versionLabel: string
  templateName: string
  isPublishing: boolean
  publishError: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function CommunicationTemplatePublishModal({
  isOpen,
  versionLabel,
  templateName,
  isPublishing,
  publishError,
  onConfirm,
  onCancel,
}: CommunicationTemplatePublishModalProps) {
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setConfirmed(false)
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 px-4 py-6">
      <div className="w-full max-w-xl rounded-panel bg-surface p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-ink-900">Opublikować tę wersję?</h2>
        <p className="mt-3 text-sm leading-6 text-ink-600">
          Po publikacji ta wersja stanie się aktywnym szablonem używanym przez system przy
          przygotowywaniu nowych komunikatów. Poprzednia opublikowana wersja zostanie zastąpiona.
        </p>

        <AlertBanner
          tone="warning"
          title="Publikacja wpływa na przyszłe komunikaty"
          description="Przed zatwierdzeniem upewnij się, że temat, treść i placeholdery zostały sprawdzone w podglądzie. Tej operacji nie można cofnąć — opublikowana wersja zacznie być używana natychmiast."
          className="mt-5"
        />

        <div className="mt-5 rounded-panel border border-line bg-ink-50/60 px-4 py-4">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <span className="font-medium text-ink-700">Szablon:</span>
            <span className="text-ink-900">{templateName}</span>
            <span className="font-medium text-ink-700">Wersja:</span>
            <span className="text-ink-900">{versionLabel}</span>
            <span className="font-medium text-ink-700">Skutek:</span>
            <span className="text-ink-600">
              Ta wersja stanie się aktywna dla kolejnych komunikatów tego typu.
            </span>
          </div>
        </div>

        {publishError && (
          <AlertBanner
            tone="danger"
            title="Nie udało się opublikować wersji"
            description={publishError}
            className="mt-5"
          />
        )}

        <label className="mt-5 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line accent-primary-600"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={isPublishing}
            aria-label="Potwierdzenie publikacji"
            data-testid="publish-confirm-checkbox"
          />
          <span className="text-sm leading-6 text-ink-700">
            Rozumiem, że ta wersja będzie używana w kolejnych komunikatach.
          </span>
        </label>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={onCancel} disabled={isPublishing} data-testid="publish-cancel-button">
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            variant="primary"
            isLoading={isPublishing}
            loadingLabel="Publikowanie..."
            disabled={!confirmed || isPublishing}
            data-testid="publish-confirm-button"
          >
            Publikuj wersję
          </Button>
        </div>
      </div>
    </div>
  )
}
