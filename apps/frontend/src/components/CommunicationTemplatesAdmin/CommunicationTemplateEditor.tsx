import { useEffect, useMemo, useState } from 'react'
import {
  COMMUNICATION_TEMPLATE_CODES,
  COMMUNICATION_TEMPLATE_CODE_LABELS,
  type CommunicationTemplateCode,
  type ContactChannel,
} from '@np-manager/shared'
import type { CommunicationTemplatePreviewResult } from '@/lib/communicationTemplates'
import { getSupportedCommunicationTemplateChannelOptions } from '@/lib/communicationTemplateAdmin'
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
  const subjectError = !form.subjectTemplate.trim() ? 'Temat wiadomosci jest wymagany.' : null
  const bodyError = !form.bodyTemplate.trim() ? 'Tresc wiadomosci jest wymagana.' : null
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

    return 'Uzupelnij wymagane pola przed zapisem lub publikacja.'
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">{subtitle}</p>
        </div>

        <button type="button" onClick={onCancel} className="btn-secondary">
          Anuluj
        </button>
      </div>

      {feedbackSuccess && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {feedbackSuccess}
        </div>
      )}

      {(feedbackError || validationFeedbackError) && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {feedbackError ?? validationFeedbackError}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.95fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Dane podstawowe</h2>
              <p className="mt-2 text-sm text-gray-600">
                Te dane identyfikuja szablon i porzadkuja komunikacje po stronie administracyjnej.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="label">Nazwa biznesowa</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => onChange('name', event.target.value)}
                  onBlur={() => markFieldTouched('name')}
                  className={`input-field ${shouldShowNameError ? 'input-error' : ''}`}
                  placeholder="Np. Potwierdzenie przyjecia sprawy"
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
                <span className="label">Kanal</span>
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
                <span className="label">Opis wewnetrzny</span>
                <textarea
                  value={form.description}
                  onChange={(event) => onChange('description', event.target.value)}
                  className="input-field min-h-[108px]"
                  placeholder="Krotki opis dla administratora i QA"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Temat wiadomosci</h2>
              <p className="mt-2 text-sm text-gray-600">
                Mozesz uzywac placeholderow, np. {'{{portedNumber}}'} lub {'{{plannedPortDate}}'}.
              </p>
            </div>

            <textarea
              value={form.subjectTemplate}
              onChange={(event) => onChange('subjectTemplate', event.target.value)}
              onBlur={() => markFieldTouched('subjectTemplate')}
              className={`input-field min-h-[120px] ${shouldShowSubjectError ? 'input-error' : ''}`}
              placeholder="Np. Sprawa {{caseNumber}} - aktualizacja procesu"
            />
            {shouldShowSubjectError && <p className="error-message">{subjectError}</p>}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Tresc wiadomosci</h2>
              <p className="mt-2 text-sm text-gray-600">
                Tresc zostanie wyrenderowana z danymi sprawy podczas tworzenia draftu.
              </p>
            </div>

            <textarea
              value={form.bodyTemplate}
              onChange={(event) => onChange('bodyTemplate', event.target.value)}
              onBlur={() => markFieldTouched('bodyTemplate')}
              className={`input-field min-h-[340px] font-mono ${shouldShowBodyError ? 'input-error' : ''}`}
              placeholder={'Dzien dobry {{clientName}},\n\nnumer sprawy: {{caseNumber}}'}
            />
            {shouldShowBodyError && <p className="error-message">{bodyError}</p>}

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {preview.usedPlaceholders.length > 0 ? (
                  <>
                    Wykryte placeholdery:{' '}
                    {preview.usedPlaceholders.map((item) => `{{${item}}}`).join(', ')}
                  </>
                ) : (
                  'W tej wersji nie wykryto placeholderow.'
                )}
              </div>

              {preview.unknownPlaceholders.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Wykryto nieznane placeholdery:{' '}
                  {preview.unknownPlaceholders.map((item) => `{{${item}}}`).join(', ')}
                </div>
              )}
            </div>
          </section>

          <div className="sticky bottom-0 z-10 rounded-3xl border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                {isPublishReady
                  ? 'Wersja jest gotowa do publikacji.'
                  : 'Przed publikacja popraw walidacje widoczne po prawej stronie.'}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveClick}
                  className="btn-secondary"
                  disabled={isSaving || isPublishing}
                >
                  {isSaving ? 'Zapisywanie...' : 'Zapisz draft'}
                </button>
                <button type="button" onClick={onPreview} className="btn-secondary" disabled={isSaving || isPublishing}>
                  Podglad
                </button>
                <button
                  type="button"
                  onClick={handlePublishClick}
                  className="btn-primary"
                  disabled={!isPublishReady || isSaving || isPublishing}
                >
                  {isPublishing ? 'Publikowanie...' : 'Publikuj'}
                </button>
                <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSaving || isPublishing}>
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              Status wersji
            </h2>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Wersja</div>
                <div className="mt-1 text-base font-medium text-gray-900">{statusInfo.versionLabel}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Status</div>
                <div className="mt-1 text-base font-medium text-gray-900">{statusInfo.statusLabel}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Ostatnia edycja</div>
                <div className="mt-1 text-base font-medium text-gray-900">
                  {statusInfo.lastEditedAt ?? 'Jeszcze nie zapisano'}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Autor</div>
                <div className="mt-1 text-base font-medium text-gray-900">
                  {statusInfo.lastEditedByDisplayName ?? 'Biezacy administrator'}
                </div>
              </div>
            </div>
          </section>

          <CommunicationTemplatePlaceholdersCard code={form.code} />

          <CommunicationTemplateValidationPanel
            preview={preview}
            subjectTemplate={form.subjectTemplate}
            bodyTemplate={form.bodyTemplate}
            showRequiredFieldIssues={hasAttemptedSubmit}
          />

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              Szybki podglad
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Podglad korzysta z testowych danych biznesowych i pomaga ocenic tonalnosc komunikatu.
            </p>
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Temat</div>
              <p className="mt-2 text-sm text-gray-800">
                {preview.renderedSubject || 'Brak tematu.'}
              </p>
            </div>
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Tresc</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                {preview.renderedBody.slice(0, 280) || 'Brak tresci.'}
                {preview.renderedBody.length > 280 ? '...' : ''}
              </p>
            </div>
            <button type="button" onClick={onPreview} className="btn-secondary mt-4">
              Otworz pelny podglad
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
