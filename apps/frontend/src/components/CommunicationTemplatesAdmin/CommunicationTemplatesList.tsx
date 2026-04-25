import { COMMUNICATION_TEMPLATE_CODE_LABELS, CONTACT_CHANNEL_LABELS } from '@np-manager/shared'
import type {
  CommunicationTemplateListFilterStatus,
  CommunicationTemplateListItemView,
  CommunicationTemplateUiStatus,
} from '@/lib/communicationTemplates'
import {
  getCommunicationTemplateStatusLabel,
} from '@/lib/communicationTemplates'
import {
  ActionMenu,
  AlertBanner,
  Badge,
  Button,
  DataField,
  EmptyState,
  MetricCard,
  PageHeader,
  SectionCard,
  type BadgeTone,
} from '@/components/ui'

interface CommunicationTemplatesListFilters {
  search: string
  status: CommunicationTemplateListFilterStatus
  code: string
  channel: string
}

interface CommunicationTemplatesListProps {
  items: CommunicationTemplateListItemView[]
  isLoading: boolean
  error: string | null
  filters: CommunicationTemplatesListFilters
  onSearchChange: (value: string) => void
  onStatusChange: (value: CommunicationTemplateListFilterStatus) => void
  onCodeChange: (value: string) => void
  onChannelChange: (value: string) => void
  onCreate: () => void
  onOpen: (code: string) => void
  onCreateDraft: (code: string) => void
  onPreviewPublished: (code: string) => void
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getStatusBadgeTone(status: CommunicationTemplateUiStatus): BadgeTone {
  if (status === 'PUBLISHED') return 'green'
  if (status === 'DRAFT') return 'amber'
  if (status === 'ARCHIVED') return 'neutral'
  return 'orange'
}

export function CommunicationTemplatesList({
  items,
  isLoading,
  error,
  filters,
  onSearchChange,
  onStatusChange,
  onCodeChange,
  onChannelChange,
  onCreate,
  onOpen,
  onCreateDraft,
  onPreviewPublished,
}: CommunicationTemplatesListProps) {
  const totalDrafts = items.reduce((acc, item) => acc + item.versionCounts.draft, 0)
  const totalArchived = items.reduce((acc, item) => acc + item.versionCounts.archived, 0)
  const publishedCount = items.filter((item) => item.versionCounts.published > 0).length
  const codeOptions = [...new Set(items.map((item) => item.code))]
  const channelOptions = [...new Set(items.map((item) => item.channel))]

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="Administracja"
        title="Szablony komunikatów"
        description="Zarządzaj treścią wiadomości wysyłanych do klientów i operatorów na kolejnych etapach procesu przeniesienia numeru."
        actions={
          <Button type="button" onClick={onCreate} variant="primary">
            Nowy szablon
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Łącznie szablonów" value={items.length} description="Wynik po aktywnych filtrach" />
        <MetricCard title="Opublikowane" value={publishedCount} tone="success" description="Mają aktywną wersję" />
        <MetricCard title="Wersje robocze" value={totalDrafts} tone="warning" description="Czekają na decyzję" />
        <MetricCard title="Archiwalne" value={totalArchived} description="Zachowane historycznie" />
      </section>

      <SectionCard
        title="Filtry"
        description="Zawęź listę po nazwie, kodzie komunikatu, kanale albo stanie aktywnej wersji."
      >
        <div className="grid gap-4 lg:grid-cols-[1.4fr,0.8fr,0.8fr,0.8fr]">
          <label className="block">
            <span className="label">Wyszukaj</span>
            <input
              type="search"
              value={filters.search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="input-field mt-1"
              placeholder="Szukaj po nazwie, kodzie lub opisie"
            />
          </label>

          <label className="block">
            <span className="label">Status</span>
            <select
              value={filters.status}
              onChange={(event) => onStatusChange(event.target.value as CommunicationTemplateListFilterStatus)}
              className="input-field mt-1"
            >
              <option value="ALL">Wszystkie</option>
              <option value="PUBLISHED">Opublikowane</option>
              <option value="DRAFT">Robocze</option>
              <option value="ARCHIVED">Archiwalne</option>
            </select>
          </label>

          <label className="block">
            <span className="label">Kod komunikatu</span>
            <select
              value={filters.code}
              onChange={(event) => onCodeChange(event.target.value)}
              className="input-field mt-1"
            >
              <option value="">Wszystkie kody</option>
              {codeOptions.map((code) => (
                <option key={code} value={code}>
                  {COMMUNICATION_TEMPLATE_CODE_LABELS[code]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Kanał</span>
            <select
              value={filters.channel}
              onChange={(event) => onChannelChange(event.target.value)}
              className="input-field mt-1"
            >
              <option value="">Wszystkie kanały</option>
              {channelOptions.map((channel) => (
                <option key={channel} value={channel}>
                  {CONTACT_CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SectionCard>

      {error && (
        <AlertBanner tone="danger" title="Nie udało się pobrać szablonów" description={error} />
      )}

      {isLoading ? (
        <SectionCard padding="none">
          <EmptyState title="Ładowanie szablonów komunikatów..." />
        </SectionCard>
      ) : items.length === 0 ? (
        <SectionCard padding="none">
          <EmptyState
            title="Brak szablonów komunikatów"
            description="Dodaj pierwszy szablon, aby system mógł przygotowywać czytelne komunikaty dla klientów i operatorów."
            action={
              <Button type="button" onClick={onCreate} variant="primary">
                Utwórz pierwszy szablon
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <SectionCard
          title="Lista szablonów"
          description="Każdy szablon może mieć wersję opublikowaną, roboczą i archiwalną."
        >
          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={item.key}
                className="rounded-panel border border-line bg-surface p-5 transition hover:border-brand-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-ink-900">
                        {item.name || COMMUNICATION_TEMPLATE_CODE_LABELS[item.code]}
                      </h2>
                      <Badge tone={getStatusBadgeTone(item.primaryStatus)} leadingDot>
                        {getCommunicationTemplateStatusLabel(item.primaryStatus)}
                      </Badge>
                      {item.publishedVersionNumber !== null && (
                        <Badge tone="brand">Wersja aktywna: v{item.publishedVersionNumber}</Badge>
                      )}
                    </div>

                    <p className="mt-2 text-sm font-medium text-ink-500">
                      {COMMUNICATION_TEMPLATE_CODE_LABELS[item.code]} · {item.code}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-ink-600">
                      {item.description || 'Brak opisu operacyjnego dla tego szablonu.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" onClick={() => onOpen(item.code)} variant="primary" size="sm">
                      Otwórz
                    </Button>

                    <ActionMenu
                      items={[
                        {
                          label: 'Utwórz nową wersję roboczą',
                          description: 'Na podstawie istniejącej wersji szablonu.',
                          onClick: () => onCreateDraft(item.code),
                        },
                        {
                          label: 'Podgląd aktywnej wersji',
                          description: 'Sprawdź treść aktualnie używaną operacyjnie.',
                          disabled: !item.publishedVersionId,
                          onClick: () => onPreviewPublished(item.code),
                        },
                      ]}
                    />
                  </div>
                </div>

                <dl className="mt-5 grid gap-4 rounded-panel border border-line bg-ink-50/60 p-4 text-sm md:grid-cols-2 xl:grid-cols-5">
                  <DataField label="Kanał" value={CONTACT_CHANNEL_LABELS[item.channel]} />
                  <DataField label="Status operacyjny" value={item.statusSummary} />
                  <DataField
                    label="Ostatnia zmiana"
                    value={formatDateTime(item.lastVersionUpdatedAt ?? item.updatedAt)}
                  />
                  <DataField
                    label="Autor ostatniej zmiany"
                    value={item.lastVersionUpdatedByDisplayName ?? item.updatedByDisplayName ?? 'Brak danych'}
                  />
                  <DataField
                    label="Zakres wersji"
                    value={`${item.versionCounts.total} łącznie · ${item.versionCounts.draft} robocze`}
                  />
                </dl>
              </article>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
