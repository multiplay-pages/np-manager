import type { PortingNotificationSettingsDiagnosticsDto } from '@np-manager/shared'
import { AlertBanner } from '@/components/ui/AlertBanner'
import { Button } from '@/components/ui/Button'
import { DataField } from '@/components/ui/DataField'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'

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
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Administracja"
          title="Powiadomienia portingowe"
          description="Konfiguracja odbiorców i kanałów dla wewnętrznych powiadomień o sprawach przeniesienia numerów."
        />

        {isLoading ? (
          <SectionCard>
            <p className="text-sm text-ink-500">Ładowanie ustawień...</p>
          </SectionCard>
        ) : (
          <>
            <SectionCard title="Konfiguracja odbiorców">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-ink-700">
                    Adresy e-mail zespołu
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
                  <span className="text-sm text-ink-700">Wysyłaj powiadomienia do Teams</span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-ink-700">
                    Webhook Teams
                  </span>
                  <input
                    type="url"
                    value={form.teamsWebhookUrl}
                    onChange={(event) => onChange('teamsWebhookUrl', event.target.value)}
                    className="input-field"
                    placeholder="https://..."
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

            <SectionCard
              title="Diagnostyka transportu"
              description="Dane pochodzą z konfiguracji środowiska i nie są edytowalne w tym panelu."
            >
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DataField
                  label="Tryb wysyłki e-mail"
                  value={diagnostics?.emailAdapterMode ?? null}
                />
                <DataField
                  label="Konfiguracja SMTP"
                  value={diagnostics ? (diagnostics.smtpConfigured ? 'Tak' : 'Nie') : null}
                />
              </dl>
            </SectionCard>
          </>
        )}
      </div>
    </div>
  )
}
