import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import type { NotificationFallbackReadiness } from '@np-manager/shared'
import {
  AlertBanner,
  Badge,
  Button,
  DataField,
  EmptyState,
  PageHeader,
  SectionCard,
  type BadgeTone,
} from '@/components/ui'
import { useAuthStore } from '@/stores/auth.store'
import {
  getAdminNotificationFallbackSettings,
  updateAdminNotificationFallbackSettings,
} from '@/services/adminNotificationFallbackSettings.api'

interface FallbackFormState {
  fallbackEnabled: boolean
  fallbackRecipientEmail: string
  fallbackRecipientName: string
  applyToFailed: boolean
  applyToMisconfigured: boolean
}

const READINESS_BADGE_CONFIG: Record<
  NotificationFallbackReadiness,
  { label: string; tone: BadgeTone }
> = {
  READY: { label: 'Fallback aktywny', tone: 'emerald' },
  DISABLED: { label: 'Fallback wyłączony', tone: 'neutral' },
  INCOMPLETE: { label: 'Konfiguracja niekompletna', tone: 'amber' },
}

const EMPTY_FORM: FallbackFormState = {
  fallbackEnabled: false,
  fallbackRecipientEmail: '',
  fallbackRecipientName: '',
  applyToFailed: true,
  applyToMisconfigured: true,
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const message = (error.response?.data as { error?: { message?: string } } | undefined)?.error
    ?.message
  return message ?? fallback
}

function getPreviewText(form: FallbackFormState, readiness: NotificationFallbackReadiness): string {
  if (readiness === 'DISABLED') {
    return 'Fallback jest wyłączony. Błędy notyfikacji nie będą eskalowane na zapasowy adres.'
  }

  if (readiness === 'INCOMPLETE') {
    return 'Uzupełnij adres e-mail, aby fallback mógł eskalować błędy notyfikacji.'
  }

  const triggers: string[] = []
  if (form.applyToFailed) triggers.push('FAILED')
  if (form.applyToMisconfigured) triggers.push('MISCONFIGURED')

  const triggerLabel =
    triggers.length === 2 ? 'FAILED oraz MISCONFIGURED' : triggers.join(', ') || 'brak zdarzeń'

  return `Fallback zostanie użyty dla ${triggerLabel}. Alert trafi do: ${form.fallbackRecipientEmail.trim()}.`
}

export function computeReadiness(form: FallbackFormState): NotificationFallbackReadiness {
  if (!form.fallbackEnabled) return 'DISABLED'
  if (!form.fallbackRecipientEmail.trim()) return 'INCOMPLETE'
  return 'READY'
}

export function validateFallbackForm(form: FallbackFormState): string | null {
  const email = form.fallbackRecipientEmail.trim()

  if (form.fallbackEnabled && !email) {
    return 'Podaj adres e-mail odbiorcy fallbacku, gdy fallback jest włączony.'
  }

  if (form.fallbackEnabled && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Podaj poprawny adres e-mail.'
  }

  return null
}

export function shouldRequireEnableConfirmation(
  savedSettings: FallbackFormState | null,
  form: FallbackFormState,
): boolean {
  return !savedSettings?.fallbackEnabled && form.fallbackEnabled
}

function ReadinessBadge({ readiness }: { readiness: NotificationFallbackReadiness }) {
  const badgeCfg = READINESS_BADGE_CONFIG[readiness]
  return (
    <Badge tone={badgeCfg.tone} leadingDot>
      {badgeCfg.label}
    </Badge>
  )
}

export function NotificationFallbackSettingsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const [form, setForm] = useState<FallbackFormState>(EMPTY_FORM)
  const [savedSettings, setSavedSettings] = useState<FallbackFormState | null>(null)
  const [serverReadiness, setServerReadiness] = useState<NotificationFallbackReadiness>('DISABLED')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showEnableConfirmation, setShowEnableConfirmation] = useState(false)

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getAdminNotificationFallbackSettings()
      const nextSettings = {
        fallbackEnabled: result.fallbackEnabled,
        fallbackRecipientEmail: result.fallbackRecipientEmail,
        fallbackRecipientName: result.fallbackRecipientName,
        applyToFailed: result.applyToFailed,
        applyToMisconfigured: result.applyToMisconfigured,
      }

      setForm(nextSettings)
      setSavedSettings(nextSettings)
      setServerReadiness(result.readiness)
    } catch (errorValue) {
      setError(getErrorMessage(errorValue, 'Nie udało się załadować ustawień fallbacku.'))
      setForm(EMPTY_FORM)
      setSavedSettings(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false)
      return
    }

    void loadSettings()
  }, [isAdmin, loadSettings])

  const handleChange = <K extends keyof FallbackFormState>(
    field: K,
    value: FallbackFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }))
    setShowEnableConfirmation(false)
    setError(null)
    setSuccess(null)
  }

  const saveSettings = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    setShowEnableConfirmation(false)

    try {
      const result = await updateAdminNotificationFallbackSettings({
        fallbackEnabled: form.fallbackEnabled,
        fallbackRecipientEmail: form.fallbackRecipientEmail.trim(),
        fallbackRecipientName: form.fallbackRecipientName.trim(),
        applyToFailed: form.applyToFailed,
        applyToMisconfigured: form.applyToMisconfigured,
      })
      const nextSettings = {
        fallbackEnabled: result.fallbackEnabled,
        fallbackRecipientEmail: result.fallbackRecipientEmail,
        fallbackRecipientName: result.fallbackRecipientName,
        applyToFailed: result.applyToFailed,
        applyToMisconfigured: result.applyToMisconfigured,
      }

      setForm(nextSettings)
      setSavedSettings(nextSettings)
      setServerReadiness(result.readiness)
      setSuccess('Ustawienia fallbacku zostały zapisane.')
    } catch (errorValue) {
      setError(getErrorMessage(errorValue, 'Nie udało się zapisać ustawień fallbacku.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    if (isSaving) return

    const validationError = validateFallbackForm(form)
    if (validationError) {
      setError(validationError)
      setSuccess(null)
      setShowEnableConfirmation(false)
      return
    }

    if (shouldRequireEnableConfirmation(savedSettings, form)) {
      setError(null)
      setSuccess(null)
      setShowEnableConfirmation(true)
      return
    }

    await saveSettings()
  }

  const liveReadiness = computeReadiness(form)
  const savedRecipientName = savedSettings?.fallbackRecipientName.trim()

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-4xl space-y-5">
          <PageHeader
            eyebrow="Administracja"
            title="Fallback notyfikacji"
            description="Konfiguracja zapasowego odbiorcy dla błędów wysyłki wewnętrznych notyfikacji portingowych."
          />
          <EmptyState
            title="Brak dostępu do administracji"
            description="Ta sekcja jest dostępna tylko dla administratora systemu."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <PageHeader
          eyebrow="Administracja"
          title="Fallback notyfikacji"
          description="Konfiguracja zapasowego odbiorcy dla błędów wysyłki wewnętrznych notyfikacji portingowych."
        />

        {isLoading ? (
          <SectionCard title="Ładowanie ustawień">
            <AlertBanner
              tone="neutral"
              title="Ładowanie ustawień..."
              description="Pobieram aktualną konfigurację fallbacku z serwera."
            />
          </SectionCard>
        ) : (
          <>
            {success && <AlertBanner tone="success" title={success} />}
            {error && <AlertBanner tone="danger" title={error} />}

            <SectionCard
              title="Aktualny stan"
              description="Stan zapisany na serwerze. To on decyduje o realnym zachowaniu fallbacku do czasu kolejnego zapisu."
              action={<ReadinessBadge readiness={serverReadiness} />}
            >
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DataField
                  label="Fallback"
                  value={savedSettings?.fallbackEnabled ? 'Włączony' : 'Wyłączony'}
                />
                <DataField
                  label="Adres fallbacku"
                  value={savedSettings?.fallbackRecipientEmail}
                  emptyText="Nie ustawiono"
                />
                <DataField
                  label="Odbiorca"
                  value={savedRecipientName}
                  emptyText="Brak nazwy"
                />
                <DataField label="Readiness" value={READINESS_BADGE_CONFIG[serverReadiness].label} />
              </dl>
            </SectionCard>

            <SectionCard
              title="Konfiguracja fallbacku"
              description="Edytowany formularz. Zmiany zaczną działać dopiero po zapisie."
              action={<ReadinessBadge readiness={liveReadiness} />}
            >
              <div className="space-y-5">
                <label className="flex items-start gap-3 rounded-ui border border-line bg-ink-50/70 p-4">
                  <input
                    type="checkbox"
                    checked={form.fallbackEnabled}
                    onChange={(event) => handleChange('fallbackEnabled', event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink-900">
                      Włącz fallback notyfikacji
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-ink-500">
                      Po włączeniu błędy wysyłki wewnętrznych notyfikacji portingowych mogą być
                      eskalowane na wskazany adres.
                    </span>
                  </span>
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-ink-700">
                      Adres e-mail odbiorcy fallbacku
                      {form.fallbackEnabled && <span className="text-red-600"> *</span>}
                    </span>
                    <input
                      type="email"
                      value={form.fallbackRecipientEmail}
                      onChange={(event) =>
                        handleChange('fallbackRecipientEmail', event.target.value)
                      }
                      className="h-10 w-full rounded-ui border border-line bg-surface px-3 text-sm text-ink-900 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                      placeholder="fallback@example.com"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-ink-700">
                      Nazwa odbiorcy
                    </span>
                    <input
                      type="text"
                      value={form.fallbackRecipientName}
                      onChange={(event) =>
                        handleChange('fallbackRecipientName', event.target.value)
                      }
                      className="h-10 w-full rounded-ui border border-line bg-surface px-3 text-sm text-ink-900 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                      placeholder="np. Zespół BOK"
                    />
                  </label>
                </div>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-ink-700">
                    Typy problemów objęte fallbackiem
                  </legend>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-start gap-3 rounded-ui border border-line bg-surface p-4">
                      <input
                        type="checkbox"
                        checked={form.applyToFailed}
                        onChange={(event) => handleChange('applyToFailed', event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-ink-900">
                          Błędy wysyłki
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-ink-500">
                          Outcome FAILED, czyli problem z dostarczeniem notyfikacji.
                        </span>
                      </span>
                    </label>

                    <label className="flex items-start gap-3 rounded-ui border border-line bg-surface p-4">
                      <input
                        type="checkbox"
                        checked={form.applyToMisconfigured}
                        onChange={(event) =>
                          handleChange('applyToMisconfigured', event.target.checked)
                        }
                        className="mt-1 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-ink-900">
                          Błędy konfiguracji
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-ink-500">
                          Outcome MISCONFIGURED, czyli brak lub błędna konfiguracja transportu.
                        </span>
                      </span>
                    </label>
                  </div>
                </fieldset>

                {showEnableConfirmation && (
                  <AlertBanner
                    tone="warning"
                    title="Potwierdź włączenie fallbacku"
                    description={`Po zapisie błędy notyfikacji będą eskalowane na adres ${form.fallbackRecipientEmail.trim()}. Sprawdź, czy to właściwy odbiorca operacyjny.`}
                    action={
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isSaving}
                        loadingLabel="Zapisywanie..."
                        onClick={() => void saveSettings()}
                      >
                        Potwierdź włączenie
                      </Button>
                    }
                  />
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    onClick={() => void handleSave()}
                    isLoading={isSaving}
                    loadingLabel="Zapisywanie..."
                  >
                    Zapisz ustawienia
                  </Button>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Skutek konfiguracji"
              description="Podgląd konsekwencji na podstawie edytowanego formularza, jeszcze przed zapisem."
            >
              <AlertBanner
                tone={liveReadiness === 'READY' ? 'info' : liveReadiness === 'INCOMPLETE' ? 'warning' : 'neutral'}
                title={READINESS_BADGE_CONFIG[liveReadiness].label}
                description={getPreviewText(form, liveReadiness)}
              />
            </SectionCard>
          </>
        )}
      </div>
    </div>
  )
}
