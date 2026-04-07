import { useEffect } from 'react'
import {
  getCommunicationTemplatePlaceholderItems,
  type CommunicationTemplatePreviewResult,
} from '@/lib/communicationTemplates'
import { createPreviewModalKeydownHandler as createEscapeHandler } from '@/lib/communicationTemplateAdmin'

interface CommunicationTemplatePreviewModalProps {
  isOpen: boolean
  title: string
  subtitle?: string
  preview: CommunicationTemplatePreviewResult
  mode: 'TEST' | 'REAL'
  onModeChange: (mode: 'TEST' | 'REAL') => void
  onClose: () => void
}

export function CommunicationTemplatePreviewModal({
  isOpen,
  title,
  subtitle,
  preview,
  mode,
  onModeChange,
  onClose,
}: CommunicationTemplatePreviewModalProps) {
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return
    }

    const handleKeydown = createEscapeHandler(onClose)
    window.addEventListener('keydown', handleKeydown)

    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const placeholders = getCommunicationTemplatePlaceholderItems()

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-950/50 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="mt-2 text-sm text-gray-600">
              {subtitle ??
                'Sprawdz temat, tresc oraz placeholdery przed zapisaniem lub publikacja wersji.'}
            </p>
          </div>

          <button type="button" onClick={onClose} className="btn-secondary">
            Zamknij
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onModeChange('TEST')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                mode === 'TEST'
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-700'
              }`}
            >
              Dane testowe
            </button>
            <button
              type="button"
              onClick={() => onModeChange('REAL')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                mode === 'REAL'
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-700'
              }`}
            >
              Realna sprawa
            </button>
          </div>

          {mode === 'REAL' && (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Podglad na realnej sprawie bedzie dostepny w kolejnym etapie po rozszerzeniu backendowego preview.
            </div>
          )}
        </div>

        <div className="grid max-h-[calc(90vh-180px)] gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[1.45fr,0.95fr]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                Temat
              </h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                {preview.renderedSubject || 'Brak tematu.'}
              </p>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                Tresc
              </h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                {preview.renderedBody || 'Brak tresci.'}
              </p>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                Stan renderowania
              </h3>
              <div
                className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
                  preview.isRenderable
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                {preview.isRenderable
                  ? 'Szablon jest renderowalny na danych testowych.'
                  : 'Szablon wymaga poprawek przed publikacja.'}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                Uzyte placeholdery
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {preview.usedPlaceholders.length > 0 ? (
                  preview.usedPlaceholders.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
                    >
                      {`{{${item}}}`}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">Brak placeholderow.</span>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                Problemy
              </h3>
              <div className="mt-3 space-y-3 text-sm">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
                  {preview.unknownPlaceholders.length > 0
                    ? `Nieznane placeholdery: ${preview.unknownPlaceholders.map((item) => `{{${item}}}`).join(', ')}`
                    : 'Brak nieznanych placeholderow.'}
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
                  {preview.missingPlaceholders.length > 0
                    ? `Brakujace dane: ${preview.missingPlaceholders.map((item) => `{{${item}}}`).join(', ')}`
                    : 'Brak brakujacych danych testowych.'}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                Sciaga placeholderow
              </h3>
              <div className="mt-3 space-y-2">
                {placeholders.map((item) => (
                  <div key={item.placeholder} className="text-sm text-gray-600">
                    <span className="font-mono text-xs text-gray-900">{`{{${item.placeholder}}}`}</span>
                    {' - '}
                    {item.label}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
