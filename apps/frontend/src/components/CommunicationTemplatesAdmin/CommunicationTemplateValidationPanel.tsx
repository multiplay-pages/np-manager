import type { CommunicationTemplatePreviewResult } from '@/lib/communicationTemplates'

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
    issues.push('Temat wiadomosci jest wymagany.')
  }

  if (showRequiredFieldIssues && !bodyTemplate.trim()) {
    issues.push('Tresc wiadomosci jest wymagana.')
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

  warnings.push('Walidacja na realnej sprawie bedzie dostepna po rozszerzeniu backendowego preview.')

  const isReady = issues.length === 0 && !hasEmptyRequiredFields

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Walidacja</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Sprawdzamy podstawowa gotowosc wersji do publikacji i wykrywamy placeholdery, ktore wymagaja poprawy.
        </p>
      </div>

      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          isReady
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}
      >
        {isReady ? 'Szablon jest gotowy do publikacji.' : 'Wersja nie jest gotowa do publikacji.'}
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
          {preview.unknownPlaceholders.length === 0 ? (
            'Brak nieznanych placeholderow.'
          ) : (
            <span>
              Wykryto nieznane placeholdery:{' '}
              {preview.unknownPlaceholders.map((item) => `{{${item}}}`).join(', ')}
            </span>
          )}
        </div>

        {issues.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <ul className="space-y-1">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-orange-700">
            <ul className="space-y-1">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
