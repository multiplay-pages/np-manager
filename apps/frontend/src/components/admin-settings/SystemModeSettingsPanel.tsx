import type {
  AdminSystemModeMissingField,
  AdminSystemModeSettingsDiagnosticsDto,
  SystemMode,
} from '@np-manager/shared'
import { AlertBanner } from '@/components/ui/AlertBanner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataField } from '@/components/ui/DataField'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'

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
  credentialsRef: 'Referencja poświadczeń',
  operatorCode: 'Kod operatora',
}

function getEffectiveStateLabel(
  form: SystemModeSettingsFormState,
  diagnostics: AdminSystemModeSettingsDiagnosticsDto | null,
): string {
  if (!diagnostics) return '-'
  if (diagnostics.active) return 'Modul aktywny'
  if (form.mode === 'STANDALONE') return 'Moduł niedostępny w trybie standalone'
  if (!form.pliCbdEnabled) return 'Moduł wyłączony, konfiguracja zachowana'
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
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Administracja"
          title="Tryb systemu i PLI CBD"
          description="Ustaw, czy NP-Manager działa w trybie manualnym, czy z aktywną integracją PLI CBD."
        />

        {isLoading ? (
          <SectionCard>
            <p className="text-sm text-ink-500">Ładowanie ustawień...</p>
          </SectionCard>
        ) : (
          <>
            <SectionCard title="Aktualny stan">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DataField
                  label="Stan integracji"
                  value={getEffectiveStateLabel(form, diagnostics)}
                />
                <DataField
                  label="Aktywna integracja"
                  value={
                    diagnostics ? (
                      <Badge tone={diagnostics.active ? 'green' : 'neutral'} leadingDot>
                        {diagnostics.active ? 'Tak' : 'Nie'}
                      </Badge>
                    ) : null
                  }
                />
                <DataField
                  label="Konfiguracja kompletna"
                  value={diagnostics ? (diagnostics.configured ? 'Tak' : 'Nie') : null}
                />
                <DataField label="Brakujące pola" value={getMissingFieldsLabel(diagnostics)} />
              </dl>
            </SectionCard>

            <SectionCard
              title="Konfiguracja trybu"
              description="Wybierz, w jakim trybie pracuje system."
            >
              <fieldset className="space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="systemMode"
                    checked={form.mode === 'STANDALONE'}
                    onChange={() => onChange('mode', 'STANDALONE')}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink-900">
                      Manualny standalone
                    </span>
                    <span className="block text-sm text-ink-500">
                      Operator prowadzi sprawy ręcznie. Sekcje PLI CBD są niedostępne.
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
                    <span className="block text-sm font-semibold text-ink-900">
                      Zintegrowany z PLI CBD
                    </span>
                    <span className="block text-sm text-ink-500">
                      PLI CBD może być aktywne dopiero po pełnej konfiguracji.
                    </span>
                  </span>
                </label>
              </fieldset>
            </SectionCard>

            <SectionCard
              title="Konfiguracja PLI CBD"
              description="Niepełna konfiguracja może zostać zapisana — integracja pozostanie nieaktywna, dopóki brakuje wymaganych pól."
            >
              <div className="space-y-4">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.pliCbdEnabled}
                    onChange={(event) => onChange('pliCbdEnabled', event.target.checked)}
                  />
                  <span className="text-sm font-medium text-ink-700">
                    Aktywna integracja PLI CBD
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-ink-700">Endpoint URL</span>
                  <input
                    type="url"
                    value={form.pliCbdEndpointUrl}
                    onChange={(event) => onChange('pliCbdEndpointUrl', event.target.value)}
                    className="input-field"
                    placeholder="https://pli.example.test/api"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-ink-700">
                    Referencja poświadczeń
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
                  <span className="mb-1 block text-sm font-medium text-ink-700">
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

                <Button
                  variant="primary"
                  onClick={onSave}
                  isLoading={isSaving}
                  loadingLabel="Zapisywanie..."
                >
                  Zapisz ustawienia
                </Button>

                {success && <AlertBanner tone="success" title={success} />}
                {error && <AlertBanner tone="danger" title={error} />}
              </div>
            </SectionCard>

            <AlertBanner
              tone="info"
              title="Skutki zmian konfiguracji"
              description="Zmiana trybu systemu wpływa na dostępność sekcji PLI CBD w aplikacji. Integracja pozostaje nieaktywna, dopóki konfiguracja jest niekompletna."
            />
          </>
        )}
      </div>
    </div>
  )
}
