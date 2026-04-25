import { useEffect, useMemo, useState } from 'react'
import {
  COMMUNICATION_TEMPLATE_CODES,
  COMMUNICATION_TEMPLATE_CODE_LABELS,
  type CommunicationTemplateCode,
  type ContactChannel,
} from '@np-manager/shared'
import type { CommunicationTemplatePreviewResult } from '@/lib/communicationTemplates'
import { getSupportedCommunicationTemplateChannelOptions } from '@/lib/communicationTemplateAdmin'
import { AlertBanner, Badge, Button, DataField, PageHeader, SectionCard } from '@/components/ui'
import { CommunicationTemplatePlaceholdersCard } from './CommunicationTemplatePlaceholdersCard'
import { CommunicationTemplateValidationPanel } from './CommunicationTemplateValidationPanel'
import type {
  CommunicationTemplateEditorFormState,
  CommunicationTemplateEditorStatusInfo,
} from './types'

interface CommunicationTemplateEditorProps {
  title: string
  subtitle: string
  form: CommunicationTemplateEditorFormState
  statusInfo: CommunicationTemplateEditorStatusInfo
  preview: CommunicationTemplatePreviewResult
  feedbackSuccess: string | null
  feedbackError: string | null
  isSaving: boolean
  isPublishing: boolean
  lockIdentityFields: boolean
  onChange: <K extends keyof CommunicationTemplateEditorFormState>(
    field: K,
    value: CommunicationTemplateEditorFormState[K],
  ) => void
  onSave: () => void
  onPreview: () => void
  onPublish: () => void
  onCancel: () => void
}

const TEMPLATE_CODES = Object.values(COMMUNICATION_TEMPLATE_CODES) as CommunicationTemplateCode[]
const CHANNEL_OPTIONS = getSupportedCommunicationTemplateChannelOptions() as Array<{
  value: ContactChannel
  label: string
}>

export function CommunicationTemplateEditor({
  title,
  subtitle,
  form,
  statusInfo,
  preview,
  feedbackSuccess,
  feedbackError,
  isSaving,
  isPublishing,
  lockIdentityFields,
  onChange,
  onSave,
  onPreview,
  onPublish,
  onCancel,
}: CommunicationTemplateEditorProps) {
  const [touchedFields, setTouchedFields] = useState({
    name: false,
    subjectTemplate: false,
    bodyTemplate: false,
  })
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const subjectError = !form.subjectTemplate.trim() ? 'Temat wiadomości jest wymagany.' : null
  const bodyError = !form.bodyTemplate.trim() ? 'Treść wiadomości jest wymagana.' : null
  const nameError = !form.name.trim() ? 'Nazwa biznesowa jest wymagana.' : null
  const shouldShowNameError = !!nameError && (hasAttemptedSubmit || touchedFields.name)
  const shouldShowSubjectError = !!subjectError && (hasAttemptedSubmit || touchedFields.subjectTemplate)
  const shouldShowBodyError = !!bodyError && (hasAttemptedSubmit || touchedFields.bodyTemplate)
  const hasRequiredFieldErrors = !!nameError || !!subjectError || !!bodyError
  const isPublishReady =
    !subjectError && !bodyError && !nameError && preview.unknownPlaceholders.length === 0
  const validationFeedbackError = useMemo(() => {
    if (!hasAttemptedSubmit || !hasRequiredFieldErrors) {
      return null
    }

    return 'Uzupełnij wymagane pola przed zapisem lub publikacją.'
  }, [hasAttemptedSubmit, hasRequiredFieldErrors])

  useEffect(() => {
    setTouchedFields({
      name: false,
      subjectTemplate: false,
      bodyTemplate: false,
    })
    setHasAttemptedSubmit(false)
  }, [form.id, form.versionNumber, form.code])

  const markFieldTouched = (field: keyof typeof touchedFields) => {
    setTouchedFields((current) => ({
      ...current,
      [field]: true,
    }))
  }

  const handleSaveClick = () => {
    setHasAttemptedSubmit(true)

    if (hasRequiredFieldErrors) {
      return
    }

    onSave()
  }

  const handlePublishClick = () => {
    setHasAttemptedSubmit(true)

    if (hasRequiredFieldErrors) {
      return
    }

    onPublish()
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="Edycja szablonu"
        title={title}
        description={subtitle}
        actions={
          <Button type="button" onClick={onCancel}>
            Anuluj
          </Button>
        }
      />

      {feedbackSuccess && (
        <AlertBanner tone="success" title="Wersja robocza zapisana" description={feedbackSuccess} />
      )}

      {(feedbackError || validationFeedbackError) && (
        <AlertBanner tone="danger" title="Nie można kontynuować" description={feedbackError ?? validationFeedbackError} />
      )}

      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.95fr]">
        <div className="space-y-6">
          <SectionCard
            title="Dane podstawowe"
            description="Te dane identyfikują szablon i porządkują komunikację po stronie administracyjnej."
            padding="md"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="label">Nazwa biznesowa</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => onChange('name', event.target.value)}
                  onBlur={() => markFieldTouched('name')}
                  className={`input-field ${shouldShowNameError ? 'input-error' : ''}`}
                  placeholder="Np. Potwierdzenie przyjęcia sprawy"
                />
                {shouldShowNameError && <p className="error-message">{nameError}</p>}
              </label>

              <label className="block">
                <span className="label">Kod komunikatu</span>
                <select
                  value={form.code}
                  onChange={(event) => onChange('code', event.target.value as CommunicationTemplateCode)}
                  className="input-field"
                  disabled={lockIdentityFields}
                >
                  {TEMPLATE_CODES.map((code) => (
                    <option key={code} value={code}>
                      {COMMUNICATION_TEMPLATE_CODE_LABELS[code]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="label">Kanał</span>
                <select
                  value={form.channel}
                  onChange={(event) => onChange('channel', event.target.value as ContactChannel)}
                  className="input-field"
                  disabled={lockIdentityFields}
                >
                  {CHANNEL_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="label">Opis wewnętrzny</span>
                <textarea
                  value={form.description}
                  onChange={(event) => onChange('description', event.target.value)}
                  className="input-field min-h-[108px]"
                  placeholder="Krótki opis dla administratora i QA"
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="Temat wiadomości"
            description={<>Możesz używać placeholderów, np. {'{{portedNumber}}'} lub {'{{plannedPortDate}}'}.</>}
          >
            <textarea
              value={form.subjectTemplate}
              onChange={(event) => onChange('subjectTemplate', event.target.value)}
              onBlur={() => markFieldTouched('subjectTemplate')}
              className={`input-field min-h-[120px] ${shouldShowSubjectError ? 'input-error' : ''}`}
              placeholder="Np. Sprawa {{caseNumber}} - aktualizacja procesu"
            />
            {shouldShowSubjectError && <p className="error-message">{subjectError}</p>}
          </SectionCard>

          <SectionCard
            title="Treść wiadomości"
            description="Treść zostanie wyrenderowana z danymi sprawy podczas przygotowania komunikatu."
          >
            <textarea
              value={form.bodyTemplate}
              onChange={(event) => onChange('bodyTemplate', event.target.value)}
              onBlur={() => markFieldTouched('bodyTemplate')}
              className={`input-field min-h-[340px] font-mono ${shouldShowBodyError ? 'input-error' : ''}`}
              placeholder={'Dzień dobry {{clientName}},\n\nnumer sprawy: {{caseNumber}}'}
            />
            {shouldShowBodyError && <p className="error-message">{bodyError}</p>}

            <div className="mt-5 space-y-3">
                <AlertBanner
                  tone="neutral"
                  title="Placeholdery w tej wersji"
                  description={
                    preview.usedPlaceholders.length > 0
                      ? preview.usedPlaceholders.map((item) => `{{${item}}}`).join(', ')
                      : 'W tej wersji nie wykryto placeholderów.'
                  }
                />

              {preview.unknownPlaceholders.length > 0 && (
                <AlertBanner
                  tone="warning"
                  title="Nieznane placeholdery"
                  description={preview.unknownPlaceholders.map((item) => `{{${item}}}`).join(', ')}
                />
              )}
            </div>
          </SectionCard>

          <div className="sticky bottom-0 z-10 rounded-panel border border-line bg-surface/95 p-4 shadow-panel backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-ink-600">
                <Badge tone={isPublishReady ? 'green' : 'amber'} leadingDot>
                  {isPublishReady ? 'Gotowa do publikacji' : 'Wymaga uwagi'}
                </Badge>
                {isPublishReady
                  ? 'Wersja jest gotowa do publikacji.'
                  : 'Przed publikacją popraw walidację widoczną po prawej stronie.'}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleSaveClick}
                  disabled={isPublishing}
                  isLoading={isSaving}
                  loadingLabel="Zapisywanie..."
                >
                  Zapisz wersję roboczą
                </Button>
                <Button type="button" onClick={onPreview} disabled={isSaving || isPublishing}>
                  Podgląd
                </Button>
                <Button
                  type="button"
                  onClick={handlePublishClick}
                  variant="primary"
                  disabled={!isPublishReady || isSaving || isPublishing}
                >
                  Publikuj
                </Button>
                <Button type="button" onClick={onCancel} disabled={isSaving || isPublishing}>
                  Anuluj
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <SectionCard title="Status wersji" description="Bieżący stan edytowanej wersji szablonu.">
            <dl className="space-y-3">
              <DataField label="Wersja" value={statusInfo.versionLabel} />
              <DataField label="Status" value={statusInfo.statusLabel} />
              <DataField label="Ostatnia edycja" value={statusInfo.lastEditedAt ?? 'Jeszcze nie zapisano'} />
              <DataField label="Autor" value={statusInfo.lastEditedByDisplayName ?? 'Bieżący administrator'} />
            </dl>
          </SectionCard>

          <CommunicationTemplatePlaceholdersCard code={form.code} />

          <CommunicationTemplateValidationPanel
            preview={preview}
            subjectTemplate={form.subjectTemplate}
            bodyTemplate={form.bodyTemplate}
            showRequiredFieldIssues={hasAttemptedSubmit}
          />

          <SectionCard
            title="Szybki podgląd"
            description="Podgląd korzysta z testowych danych biznesowych i pomaga ocenić ton komunikatu."
          >
            <div className="rounded-panel border border-line bg-ink-50/60 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-400">Temat</div>
              <p className="mt-2 text-sm text-ink-800">
                {preview.renderedSubject || 'Brak tematu.'}
              </p>
            </div>
            <div className="mt-4 rounded-panel border border-line bg-ink-50/60 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-400">Treść</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-800">
                {preview.renderedBody.slice(0, 280) || 'Brak treści.'}
                {preview.renderedBody.length > 280 ? '...' : ''}
              </p>
            </div>
            <Button type="button" onClick={onPreview} className="mt-4">
              Otwórz pełny podgląd
            </Button>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
