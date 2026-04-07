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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 px-4 py-6">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-gray-900">Opublikowac te wersje?</h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Po publikacji ta wersja stanie sie aktywnym szablonem uzywanym przez system przy
          tworzeniu nowych draftow komunikacji. Poprzednia opublikowana wersja zostanie zastapiona.
        </p>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
          <div className="text-sm font-medium text-gray-900">{templateName}</div>
          <div className="mt-1 text-sm text-gray-600">{versionLabel}</div>
        </div>

        {publishError && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {publishError}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn-secondary" disabled={isPublishing}>
            Anuluj
          </button>
          <button type="button" onClick={onConfirm} className="btn-primary" disabled={isPublishing}>
            {isPublishing ? 'Publikowanie...' : 'Publikuj wersje'}
          </button>
        </div>
      </div>
    </div>
  )
}
