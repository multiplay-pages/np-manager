import { useEffect } from 'react'
import {
  getCommunicationTemplatePlaceholderItems,
  type CommunicationTemplatePreviewResult,
} from '@/lib/communicationTemplates'
import { createPreviewModalKeydownHandler as createEscapeHandler } from '@/lib/communicationTemplateAdmin'
import { AlertBanner, Badge, Button, DataField, SectionCard } from '@/components/ui'

interface CommunicationTemplatePreviewModalProps {
  isOpen: boolean
  title: string
  subtitle?: string
  preview: CommunicationTemplatePreviewResult
  mode: 'TEST' | 'REAL'
  realCaseReference: string
  realCaseLabel: string
  isRealCaseAvailable: boolean
  isRealCaseLoading: boolean
  realCaseError: string | null
  realCaseHelpText: string | null
  onModeChange: (mode: 'TEST' | 'REAL') => void
  onRealCaseReferenceChange: (value: string) => void
  onRunRealCasePreview: () => void
  onClose: () => void
}

export function CommunicationTemplatePreviewModal({
  isOpen,
  title,
  subtitle,
  preview,
  mode,
  realCaseReference,
  realCaseLabel,
  isRealCaseAvailable,
  isRealCaseLoading,
  realCaseError,
  realCaseHelpText,
  onModeChange,
  onRealCaseReferenceChange,
  onRunRealCasePreview,
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/50 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-panel bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-ink-900">{title}</h2>
            <p className="mt-2 text-sm text-ink-600">
              {subtitle ??
                'Sprawdź temat, treść oraz placeholdery przed zapisaniem lub publikacją wersji.'}
            </p>
          </div>

          <Button type="button" onClick={onClose}>
            Zamknij
          </Button>
        </div>

        <div className="border-b border-line px-6 py-4">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => onModeChange('TEST')}
              variant={mode === 'TEST' ? 'primary' : 'secondary'}
            >
              Dane testowe
            </Button>
            <Button
              type="button"
              onClick={() => onModeChange('REAL')}
              variant={mode === 'REAL' ? 'primary' : 'secondary'}
            >
              Realna sprawa
            </Button>
          </div>

          {mode === 'REAL' && (
            <div className="mt-4 space-y-4 rounded-panel border border-line bg-ink-50/60 px-4 py-4">
              <div className="grid gap-3 lg:grid-cols-[1.4fr,auto]">
                <label className="block">
                  <span className="label">Numer sprawy lub ID sprawy</span>
                  <input
                    type="text"
                    value={realCaseReference}
                    onChange={(event) => onRealCaseReferenceChange(event.target.value)}
                    className="input-field mt-1"
                    placeholder="Np. FNP-SEED-COMM-DRAFT-001 albo UUID sprawy"
                    disabled={!isRealCaseAvailable || isRealCaseLoading}
                  />
                </label>

                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={onRunRealCasePreview}
                    variant="primary"
                    disabled={!isRealCaseAvailable || isRealCaseLoading}
                    isLoading={isRealCaseLoading}
                    loadingLabel="Ładowanie..."
                  >
                    Uruchom podgląd
                  </Button>
                </div>
              </div>

              {!isRealCaseAvailable && (
                <AlertBanner
                  tone="neutral"
                  title="Podgląd na realnej sprawie jest niedostępny"
                  description={realCaseHelpText ?? 'Podgląd na realnej sprawie jest dostępny dla zapisanych wersji.'}
                />
              )}

              {isRealCaseAvailable && realCaseHelpText && (
                <AlertBanner tone="info" title="Podgląd na realnej sprawie" description={realCaseHelpText} />
              )}

              {realCaseError && (
                <AlertBanner tone="danger" title="Nie udało się przygotować podglądu" description={realCaseError} />
              )}
            </div>
          )}
        </div>

        <div className="grid max-h-[calc(90vh-180px)] gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[1.45fr,0.95fr]">
          <div className="space-y-5">
            {mode === 'REAL' && preview.previewContextSummary && (
              <SectionCard title="Podgląd na realnej sprawie" description={`Uruchomiono na: ${realCaseLabel}`}>
                <dl className="grid gap-3 text-sm md:grid-cols-2">
                  <DataField label="Sprawa" value={preview.previewContextSummary.caseNumber} />
                  <DataField label="Klient" value={preview.previewContextSummary.clientName} />
                  <DataField label="Dawca" value={preview.previewContextSummary.donorOperatorName} />
                  <DataField label="Planowana data" value={preview.previewContextSummary.plannedPortDate ?? 'Brak danych'} />
                </dl>
              </SectionCard>
            )}

            <SectionCard title="Temat">
              <p className="whitespace-pre-wrap text-sm leading-6 text-ink-800">
                {preview.renderedSubject || 'Brak tematu.'}
              </p>
            </SectionCard>

            <SectionCard title="Treść">
              <p className="whitespace-pre-wrap text-sm leading-6 text-ink-800">
                {preview.renderedBody || 'Brak treści.'}
              </p>
            </SectionCard>
          </div>

          <div className="space-y-5">
            <SectionCard title="Stan renderowania">
              <AlertBanner
                tone={preview.isRenderable ? 'success' : 'warning'}
                title={
                  preview.isRenderable
                    ? mode === 'REAL'
                      ? 'Szablon renderuje się na wskazanej sprawie.'
                      : 'Szablon renderuje się na danych testowych.'
                    : 'Szablon wymaga poprawek przed publikacją.'
                }
              />
            </SectionCard>

            <SectionCard title="Użyte placeholdery">
              <div className="mt-3 flex flex-wrap gap-2">
                {preview.usedPlaceholders.length > 0 ? (
                  preview.usedPlaceholders.map((item) => (
                    <Badge key={item} tone="neutral">
                      {`{{${item}}}`}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-ink-500">Brak placeholderów.</span>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Problemy">
              <div className="space-y-3 text-sm">
                <AlertBanner
                  tone={preview.unknownPlaceholders.length > 0 ? 'warning' : 'neutral'}
                  title={preview.unknownPlaceholders.length > 0 ? 'Nieznane placeholdery' : 'Brak nieznanych placeholderów.'}
                  description={
                    preview.unknownPlaceholders.length > 0
                      ? preview.unknownPlaceholders.map((item) => `{{${item}}}`).join(', ')
                      : undefined
                  }
                />
                <AlertBanner
                  tone={preview.missingPlaceholders.length > 0 ? 'warning' : 'neutral'}
                  title={
                    preview.missingPlaceholders.length > 0
                      ? 'Brakujące dane'
                      : mode === 'REAL'
                        ? 'Brak brakujących danych w wybranej sprawie.'
                        : 'Brak brakujących danych testowych.'
                  }
                  description={
                    preview.missingPlaceholders.length > 0
                      ? preview.missingPlaceholders.map((item) => `{{${item}}}`).join(', ')
                      : undefined
                  }
                />
                {preview.warnings.length > 0 && (
                  <AlertBanner
                    tone="warning"
                    title="Uwagi"
                    description={
                      <ul className="space-y-1">
                        {preview.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    }
                  />
                )}
              </div>
            </SectionCard>

            <SectionCard title="Ściąga placeholderów">
              <div className="mt-3 space-y-2">
                {placeholders.map((item) => (
                  <div key={item.placeholder} className="text-sm text-ink-600">
                    <span className="font-mono text-xs text-ink-900">{`{{${item.placeholder}}}`}</span>
                    {' - '}
                    {item.label}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  )
}
