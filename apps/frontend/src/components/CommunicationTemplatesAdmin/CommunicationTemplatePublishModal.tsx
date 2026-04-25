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
          description="Przed zatwierdzeniem upewnij się, że temat, treść i placeholdery zostały sprawdzone w podglądzie."
          className="mt-5"
        />

        <div className="mt-5 rounded-panel border border-line bg-ink-50/60 px-4 py-4">
          <div className="text-sm font-medium text-ink-900">{templateName}</div>
          <div className="mt-1 text-sm text-ink-600">{versionLabel}</div>
        </div>

        {publishError && (
          <AlertBanner tone="danger" title="Nie udało się opublikować wersji" description={publishError} className="mt-5" />
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={onCancel} disabled={isPublishing}>
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            variant="primary"
            isLoading={isPublishing}
            loadingLabel="Publikowanie..."
          >
            Publikuj wersję
          </Button>
        </div>
      </div>
    </div>
  )
}
