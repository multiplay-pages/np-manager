import { COMMUNICATION_TEMPLATE_CODE_LABELS, CONTACT_CHANNEL_LABELS } from '@np-manager/shared'
import type {
  CommunicationTemplateGroupView,
  CommunicationTemplateListFilterStatus,
} from '@/lib/communicationTemplates'
import {
  getCommunicationTemplateStatusClasses,
  getCommunicationTemplateStatusLabel,
  getTemplateGroupName,
} from '@/lib/communicationTemplates'

interface CommunicationTemplatesListFilters {
  search: string
  status: CommunicationTemplateListFilterStatus
  code: string
  channel: string
}

interface CommunicationTemplatesListProps {
  groups: CommunicationTemplateGroupView[]
  isLoading: boolean
  error: string | null
  filters: CommunicationTemplatesListFilters
  onSearchChange: (value: string) => void
  onStatusChange: (value: CommunicationTemplateListFilterStatus) => void
  onCodeChange: (value: string) => void
  onChannelChange: (value: string) => void
  onCreate: () => void
  onOpen: (group: CommunicationTemplateGroupView) => void
  onCreateDraft: (group: CommunicationTemplateGroupView) => void
  onPreviewPublished: (group: CommunicationTemplateGroupView) => void
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

export function CommunicationTemplatesList({
  groups,
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
  const totalDrafts = groups.reduce((acc, group) => acc + group.draftVersions.length, 0)
  const totalArchived = groups.reduce((acc, group) => acc + group.archivedVersions.length, 0)
  const publishedCount = groups.filter((group) => group.publishedVersion).length
  const codeOptions = [...new Set(groups.map((group) => group.code))]
  const channelOptions = [...new Set(groups.map((group) => group.channel))]

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Szablony komunikatow
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Zarzadzaj trescia komunikatow wysylanych do klientow na kolejnych etapach procesu.
            Zmiany publikujesz bez modyfikacji kodu aplikacji.
          </p>
        </div>

        <button type="button" onClick={onCreate} className="btn-primary">
          + Nowy szablon
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Lacznie szablonow" value={String(groups.length)} tone="neutral" />
        <SummaryCard label="Opublikowane" value={String(publishedCount)} tone="published" />
        <SummaryCard label="Wersje robocze" value={String(totalDrafts)} tone="draft" />
        <SummaryCard label="Archiwalne" value={String(totalArchived)} tone="archived" />
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
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
            <span className="label">Kanal</span>
            <select
              value={filters.channel}
              onChange={(event) => onChannelChange(event.target.value)}
              className="input-field mt-1"
            >
              <option value="">Wszystkie kanaly</option>
              {channelOptions.map((channel) => (
                <option key={channel} value={channel}>
                  {CONTACT_CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-600">
          Ladowanie szablonow komunikatow...
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <h2 className="text-xl font-semibold text-gray-900">Brak szablonow komunikatow</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Dodaj pierwszy szablon, aby system mogl generowac komunikaty dla klientow.
          </p>
          <button type="button" onClick={onCreate} className="btn-primary mt-6">
            Utworz pierwszy szablon
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <article
              key={group.key}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">{getTemplateGroupName(group)}</h2>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getCommunicationTemplateStatusClasses(group.primaryStatus)}`}
                    >
                      {getCommunicationTemplateStatusLabel(group.primaryStatus)}
                    </span>
                    {group.activeVersionNumber !== null && (
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                        Wersja aktywna: v{group.activeVersionNumber}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm font-medium text-gray-600">
                    {COMMUNICATION_TEMPLATE_CODE_LABELS[group.code]} · {group.code}
                  </p>

                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {group.description || 'Brak opisu operacyjnego dla tego szablonu.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => onOpen(group)} className="btn-primary">
                    Otworz
                  </button>

                  <details className="relative">
                    <summary className="btn-secondary cursor-pointer list-none">Akcje</summary>
                    <div className="absolute right-0 z-10 mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                      <button
                        type="button"
                        onClick={() => onCreateDraft(group)}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        Utworz nowa wersje robocza
                      </button>
                      <button
                        type="button"
                        onClick={() => onPreviewPublished(group)}
                        className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                        disabled={!group.publishedVersion}
                      >
                        Podglad aktywnej wersji
                      </button>
                    </div>
                  </details>
                </div>
              </div>

              <div className="mt-5 grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-5">
                <InfoBox label="Kanal" value={CONTACT_CHANNEL_LABELS[group.channel]} />
                <InfoBox label="Status operacyjny" value={group.statusSummary} />
                <InfoBox
                  label="Ostatnia zmiana"
                  value={formatDateTime(group.lastUpdatedAt)}
                />
                <InfoBox
                  label="Autor ostatniej zmiany"
                  value={group.lastUpdatedByDisplayName ?? 'Brak danych'}
                />
                <InfoBox
                  label="Zakres wersji"
                  value={`${group.versions.length} lacznie · ${group.draftVersions.length} robocze`}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'neutral' | 'published' | 'draft' | 'archived'
}) {
  const toneClasses = {
    neutral: 'border-gray-200 bg-white text-gray-900',
    published: 'border-green-200 bg-green-50 text-green-800',
    draft: 'border-amber-200 bg-amber-50 text-amber-800',
    archived: 'border-gray-200 bg-gray-100 text-gray-700',
  } as const

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-800">{value}</div>
    </div>
  )
}
