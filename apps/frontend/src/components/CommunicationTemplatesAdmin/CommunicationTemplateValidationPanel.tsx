import type { CommunicationTemplatePreviewResult } from '@/lib/communicationTemplates'
import { AlertBanner, SectionCard } from '@/components/ui'

interface CommunicationTemplateValidationPanelProps {
  preview: CommunicationTemplatePreviewResult
  subjectTemplate: string
  bodyTemplate: string
  showRequiredFieldIssues?: boolean
}

export function CommunicationTemplateValidationPanel({
  preview,
  subjectTemplate,
  bodyTemplate,
  showRequiredFieldIssues = true,
}: CommunicationTemplateValidationPanelProps) {
  const issues: string[] = []
  const warnings: string[] = []
  const hasEmptyRequiredFields = !subjectTemplate.trim() || !bodyTemplate.trim()

  if (showRequiredFieldIssues && !subjectTemplate.trim()) {
    issues.push('Temat wiadomości jest wymagany.')
  }

  if (showRequiredFieldIssues && !bodyTemplate.trim()) {
    issues.push('Treść wiadomości jest wymagana.')
  }

  if (preview.unknownPlaceholders.length > 0) {
    issues.push(
      `Wykryto nieznane placeholdery: ${preview.unknownPlaceholders.map((item) => `{{${item}}}`).join(', ')}.`,
    )
  }

  if (preview.missingPlaceholders.length > 0) {
    warnings.push(
      `Brakuje danych testowych dla: ${preview.missingPlaceholders.map((item) => `{{${item}}}`).join(', ')}.`,
    )
  }

  warnings.push('Podgląd na realnej sprawie uruchomisz z poziomu pełnego podglądu wersji.')

  const isReady = issues.length === 0 && !hasEmptyRequiredFields

  return (
    <SectionCard
      title="Walidacja"
      description="Sprawdzamy podstawową gotowość wersji do publikacji i wykrywamy placeholdery wymagające poprawy."
    >
      <AlertBanner
        tone={isReady ? 'success' : 'warning'}
        title={isReady ? 'Szablon jest gotowy do publikacji.' : 'Wersja nie jest gotowa do publikacji.'}
      />

      <div className="mt-4 space-y-3 text-sm">
        <AlertBanner
          tone={preview.unknownPlaceholders.length === 0 ? 'neutral' : 'warning'}
          title={preview.unknownPlaceholders.length === 0 ? 'Brak nieznanych placeholderów.' : 'Wykryto nieznane placeholdery'}
          description={
            preview.unknownPlaceholders.length > 0
              ? preview.unknownPlaceholders.map((item) => `{{${item}}}`).join(', ')
              : undefined
          }
        />

        {issues.length > 0 && (
          <AlertBanner tone="danger" title="Błędy wymagające poprawy" description={
            <ul className="space-y-1">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          } />
        )}

        {warnings.length > 0 && (
          <AlertBanner tone="warning" title="Uwagi do sprawdzenia" description={
            <ul className="space-y-1">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          } />
        )}
      </div>
    </SectionCard>
  )
}
