import type {
  AdminSystemModeMissingField,
  AdminSystemModeSettingsDiagnosticsDto,
  SystemMode,
} from '@np-manager/shared'

export interface SystemModeSettingsFormState {
  mode: SystemMode
  pliCbdEnabled: boolean
  pliCbdEndpointUrl: string
  pliCbdCredentialsRef: string
  pliCbdOperatorCode: string
}

interface SystemModeSettingsPanelProps {
  form: SystemModeSettingsFormState
  diagnostics: AdminSystemModeSettingsDiagnosticsDto | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  success: string | null
  onChange: <K extends keyof SystemModeSettingsFormState>(
    field: K,
    value: SystemModeSettingsFormState[K],
  ) => void
  onSave: () => void
}

const MISSING_FIELD_LABELS: Record<AdminSystemModeMissingField, string> = {
  endpointUrl: 'Endpoint PLI CBD',
  credentialsRef: 'Referencja credentials',
  operatorCode: 'Kod operatora',
}

function getEffectiveStateLabel(
  form: SystemModeSettingsFormState,
  diagnostics: AdminSystemModeSettingsDiagnosticsDto | null,
): string {
  if (!diagnostics) return '-'
  if (diagnostics.active) return 'Modul aktywny'
  if (form.mode === 'STANDALONE') return 'Modul niedostepny w trybie standalone'
  if (!form.pliCbdEnabled) return 'Modul wylaczony, konfiguracja zachowana'
  return 'Konfiguracja niekompletna'
}

function getMissingFieldsLabel(
  diagnostics: AdminSystemModeSettingsDiagnosticsDto | null,
): string {
  if (!diagnostics) return '-'
  if (diagnostics.missingFields.length === 0) return 'Brak'

  return diagnostics.missingFields.map((field) => MISSING_FIELD_LABELS[field]).join(', ')
}

export function SystemModeSettingsPanel({
  form,
  diagnostics,
  isLoading,
  isSaving,
  error,
  success,
  onChange,
  onSave,
}: SystemModeSettingsPanelProps) {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="card p-6">
          <h1 className="text-xl font-semibold text-gray-900">Tryb systemu i PLI CBD</h1>
          <p className="mt-1 text-sm text-gray-600">
            Ustaw tryb pracy systemu oraz konfiguracje modulu integracji z PLI CBD.
          </p>
        </div>

        {isLoading ? (
          <div className="card p-6">
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Ladowanie ustawien...
            </div>
          </div>
        ) : (
          <>
            <div className="card p-6">
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                  Tryb systemu
                </legend>
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="systemMode"
                    checked={form.mode === 'STANDALONE'}
                    onChange={() => onChange('mode', 'STANDALONE')}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">
                      Manualny standalone
                    </span>
                    <span className="block text-sm text-gray-600">
                      PLI CBD jest niedostepne w UI i chronione w backendzie jako nieaktywna
                      capability.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="systemMode"
                    checked={form.mode === 'PLI_CBD_INTEGRATED'}
                    onChange={() => onChange('mode', 'PLI_CBD_INTEGRATED')}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">
                      Zintegrowany z PLI CBD
                    </span>
                    <span className="block text-sm text-gray-600">
                      Modul moze byc aktywny dopiero po wlaczeniu i uzupelnieniu konfiguracji.
                    </span>
                  </span>
                </label>
              </fieldset>
            </div>

            <div className="card p-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                    Konfiguracja PLI CBD
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Niepelna konfiguracja moze zostac zapisana; capability pozostanie wtedy
                    nieaktywna.
                  </p>
                </div>

                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.pliCbdEnabled}
                    onChange={(event) => onChange('pliCbdEnabled', event.target.checked)}
                  />
                  <span className="text-sm font-medium text-gray-700">Wlacz modul PLI CBD</span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Endpoint URL
                  </span>
                  <input
                    type="url"
                    value={form.pliCbdEndpointUrl}
                    onChange={(event) => onChange('pliCbdEndpointUrl', event.target.value)}
                    className="input-field"
                    placeholder="https://pli.example.test/api"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Credentials ref
                  </span>
                  <input
                    type="text"
                    value={form.pliCbdCredentialsRef}
                    onChange={(event) => onChange('pliCbdCredentialsRef', event.target.value)}
                    className="input-field"
                    placeholder="secret/pli-cbd"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Kod operatora
                  </span>
                  <input
                    type="text"
                    value={form.pliCbdOperatorCode}
                    onChange={(event) => onChange('pliCbdOperatorCode', event.target.value)}
                    className="input-field uppercase"
                    placeholder="OP01"
                  />
                </label>

                <button type="button" onClick={onSave} disabled={isSaving} className="btn-primary">
                  {isSaving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
                </button>
              </div>

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
          </>
        )}

        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
            Efektywny stan modulu
          </h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-gray-500">Stan</dt>
              <dd className="text-sm font-semibold text-gray-900">
                {getEffectiveStateLabel(form, diagnostics)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Capability active</dt>
              <dd className="text-sm text-gray-900">
                {diagnostics ? (diagnostics.active ? 'Tak' : 'Nie') : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Konfiguracja kompletna</dt>
              <dd className="text-sm text-gray-900">
                {diagnostics ? (diagnostics.configured ? 'Tak' : 'Nie') : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Brakujace pola</dt>
              <dd className="text-sm text-gray-900">{getMissingFieldsLabel(diagnostics)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
