import type { PortingNotificationSettingsDiagnosticsDto } from '@np-manager/shared'

export interface PortingNotificationSettingsFormState {
  sharedEmails: string
  teamsEnabled: boolean
  teamsWebhookUrl: string
}

interface PortingNotificationSettingsPanelProps {
  form: PortingNotificationSettingsFormState
  diagnostics: PortingNotificationSettingsDiagnosticsDto | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  success: string | null
  onChange: <K extends keyof PortingNotificationSettingsFormState>(
    field: K,
    value: PortingNotificationSettingsFormState[K],
  ) => void
  onSave: () => void
}

export function PortingNotificationSettingsPanel({
  form,
  diagnostics,
  isLoading,
  isSaving,
  error,
  success,
  onChange,
  onSave,
}: PortingNotificationSettingsPanelProps) {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="card p-6">
          <h1 className="text-xl font-semibold text-gray-900">
            Ustawienia powiadomien portingowych
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Konfiguracja fallbackowych odbiorcow dla wewnetrznych notyfikacji procesu portowania.
          </p>
        </div>

        <div className="card p-6">
          {isLoading ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Ladowanie ustawien...
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Fallback shared emails
                </span>
                <textarea
                  value={form.sharedEmails}
                  onChange={(event) => onChange('sharedEmails', event.target.value)}
                  rows={3}
                  className="input-field"
                  placeholder="bok@multiplay.pl, sud@multiplay.pl"
                />
              </label>

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.teamsEnabled}
                  onChange={(event) => onChange('teamsEnabled', event.target.checked)}
                />
                <span className="text-sm text-gray-700">Teams enabled</span>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Teams webhook URL</span>
                <input
                  type="url"
                  value={form.teamsWebhookUrl}
                  onChange={(event) => onChange('teamsWebhookUrl', event.target.value)}
                  className="input-field"
                  placeholder="https://..."
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onSave}
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
            Diagnostyka transportu (read-only)
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Tryb adaptera email i stan konfiguracji SMTP pochodza z env i nie sa edytowalne w tym panelu.
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-gray-500">Email adapter mode</dt>
              <dd className="text-sm text-gray-900">{diagnostics?.emailAdapterMode ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">SMTP host skonfigurowany</dt>
              <dd className="text-sm text-gray-900">
                {diagnostics ? (diagnostics.smtpConfigured ? 'Tak' : 'Nie') : '-'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
