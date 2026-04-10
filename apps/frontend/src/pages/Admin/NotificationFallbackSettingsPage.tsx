import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import type { NotificationFallbackReadiness } from '@np-manager/shared'
import { useAuthStore } from '@/stores/auth.store'
import {
  getAdminNotificationFallbackSettings,
  updateAdminNotificationFallbackSettings,
} from '@/services/adminNotificationFallbackSettings.api'

// ============================================================
// Typy lokalne
// ============================================================

interface FallbackFormState {
  fallbackEnabled: boolean
  fallbackRecipientEmail: string
  fallbackRecipientName: string
  applyToFailed: boolean
  applyToMisconfigured: boolean
}

// ============================================================
// Komponenty pomocnicze — design system (wzorzec z AdminUserDetail)
// ============================================================

type BadgeTone = 'success' | 'neutral' | 'warning'

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  const toneClasses: Record<BadgeTone, string> = {
    success: 'border-green-200 bg-green-50 text-green-700',
    neutral: 'border-gray-200 bg-gray-100 text-gray-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  )
}

const READINESS_BADGE_CONFIG: Record<
  NotificationFallbackReadiness,
  { label: string; tone: BadgeTone }
> = {
  READY: { label: 'Fallback aktywny', tone: 'success' },
  DISABLED: { label: 'Fallback wyłączony', tone: 'neutral' },
  INCOMPLETE: { label: 'Konfiguracja niekompletna', tone: 'warning' },
}

// ============================================================
// Helpery
// ============================================================

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
    return 'Fallback jest wyłączony — błędy notyfikacji nie są eskalowane.'
  }

  if (readiness === 'INCOMPLETE') {
    return 'Uzupełnij adres email, aby aktywować fallback.'
  }

  const triggers: string[] = []
  if (form.applyToFailed) triggers.push('FAILED')
  if (form.applyToMisconfigured) triggers.push('MISCONFIGURED')

  const triggerLabel = triggers.length === 2 ? 'obu' : triggers.join(', ')

  return `Fallback zostanie użyty dla ${triggerLabel}, alert trafi do: ${form.fallbackRecipientEmail}`
}

export function computeReadiness(form: FallbackFormState): NotificationFallbackReadiness {
  if (!form.fallbackEnabled) return 'DISABLED'
  if (!form.fallbackRecipientEmail.trim()) return 'INCOMPLETE'
  return 'READY'
}

// ============================================================
// Stałe
// ============================================================

const EMPTY_FORM: FallbackFormState = {
  fallbackEnabled: false,
  fallbackRecipientEmail: '',
  fallbackRecipientName: '',
  applyToFailed: true,
  applyToMisconfigured: true,
}

// ============================================================
// Strona
// ============================================================

export function NotificationFallbackSettingsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const [form, setForm] = useState<FallbackFormState>(EMPTY_FORM)
  // serverReadiness: readiness z backendu — source of truth dla badge
  const [serverReadiness, setServerReadiness] = useState<NotificationFallbackReadiness>('DISABLED')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await getAdminNotificationFallbackSettings()
      setForm({
        fallbackEnabled: result.fallbackEnabled,
        fallbackRecipientEmail: result.fallbackRecipientEmail,
        fallbackRecipientName: result.fallbackRecipientName,
        applyToFailed: result.applyToFailed,
        applyToMisconfigured: result.applyToMisconfigured,
      })
      setServerReadiness(result.readiness)
    } catch (errorValue) {
      setError(getErrorMessage(errorValue, 'Nie udalo sie zaladowac ustawien fallbacku.'))
      setForm(EMPTY_FORM)
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

  useEffect(() => {
    if (!success) return

    const timer = window.setTimeout(() => {
      setSuccess(null)
    }, 4000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [success])

  const handleChange = <K extends keyof FallbackFormState>(
    field: K,
    value: FallbackFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError(null)
    setSuccess(null)
  }

  const handleSave = async () => {
    if (isSaving) return

    if (form.fallbackEnabled && !form.fallbackRecipientEmail.trim()) {
      setError('Podaj adres email odbiorcy fallback, gdy fallback jest wlaczony.')
      setSuccess(null)
      return
    }

    if (
      form.fallbackEnabled &&
      form.fallbackRecipientEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.fallbackRecipientEmail.trim())
    ) {
      setError('Podaj poprawny adres e-mail.')
      setSuccess(null)
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateAdminNotificationFallbackSettings({
        fallbackEnabled: form.fallbackEnabled,
        fallbackRecipientEmail: form.fallbackRecipientEmail.trim(),
        fallbackRecipientName: form.fallbackRecipientName.trim(),
        applyToFailed: form.applyToFailed,
        applyToMisconfigured: form.applyToMisconfigured,
      })

      setForm({
        fallbackEnabled: result.fallbackEnabled,
        fallbackRecipientEmail: result.fallbackRecipientEmail,
        fallbackRecipientName: result.fallbackRecipientName,
        applyToFailed: result.applyToFailed,
        applyToMisconfigured: result.applyToMisconfigured,
      })
      setServerReadiness(result.readiness)
      setSuccess('Ustawienia fallbacku zostały zapisane.')
    } catch (errorValue) {
      setError(getErrorMessage(errorValue, 'Nie udalo sie zapisac ustawien fallbacku.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Brak dostepu do administracji</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Ta sekcja jest dostepna tylko dla administratora systemu.
          </p>
        </div>
      </div>
    )
  }

  // liveReadiness: podgląd oparty na aktualnym stanie formularza (przed zapisem)
  const liveReadiness = computeReadiness(form)
  const badgeCfg = READINESS_BADGE_CONFIG[serverReadiness]

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Ustawienia fallback notyfikacji
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Konfiguracja zapasowego odbiorcy dla nieudanych notyfikacji.
              </p>
            </div>
            {!isLoading && <Badge tone={badgeCfg.tone}>{badgeCfg.label}</Badge>}
          </div>
        </div>

        <div className="card p-6">
          {isLoading ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Ladowanie ustawien...
            </div>
          ) : (
            <div className="space-y-4">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.fallbackEnabled}
                  onChange={(event) => handleChange('fallbackEnabled', event.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">
                  Włącz fallback notyfikacji
                </span>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Adres email odbiorcy fallback
                  {form.fallbackEnabled && <span className="text-red-500"> *</span>}
                </span>
                <input
                  type="email"
                  value={form.fallbackRecipientEmail}
                  onChange={(event) => handleChange('fallbackRecipientEmail', event.target.value)}
                  className="input-field"
                  placeholder="fallback@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Nazwa odbiorcy
                </span>
                <input
                  type="text"
                  value={form.fallbackRecipientName}
                  onChange={(event) => handleChange('fallbackRecipientName', event.target.value)}
                  className="input-field"
                  placeholder="np. Zespol BOK"
                />
              </label>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-gray-700">
                  Zastosuj fallback do:
                </legend>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.applyToFailed}
                    onChange={(event) => handleChange('applyToFailed', event.target.checked)}
                  />
                  <span className="text-sm text-gray-700">Dla błędów wysyłki (FAILED)</span>
                </label>
                <br />
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.applyToMisconfigured}
                    onChange={(event) => handleChange('applyToMisconfigured', event.target.checked)}
                  />
                  <span className="text-sm text-gray-700">
                    Dla błędów konfiguracji (MISCONFIGURED)
                  </span>
                </label>
              </fieldset>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="btn-primary"
                >
                  {isSaving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
            Podglad skutku konfiguracji
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {!isLoading && getPreviewText(form, liveReadiness)}
          </p>
        </div>
      </div>
    </div>
  )
}
