import { CONTACT_CHANNEL_LABELS } from '@np-manager/shared'
import type { CommunicationTemplateGroupView, CommunicationTemplateVersionView } from '@/lib/communicationTemplates'
import { AlertBanner, Badge, Button, DataField, EmptyState, PageHeader, SectionCard } from '@/components/ui'
import { CommunicationTemplatePlaceholdersCard } from './CommunicationTemplatePlaceholdersCard'
import { CommunicationTemplateVersionCard } from './CommunicationTemplateVersionCard'

interface CommunicationTemplateDetailProps {
  group: CommunicationTemplateGroupView | null
  isLoading: boolean
  error: string | null
  feedbackSuccess: string | null
  feedbackError: string | null
  onBack: () => void
  onCreateDraft: (group: CommunicationTemplateGroupView) => void
  onEditDraft: (version: CommunicationTemplateVersionView) => void
  onPreviewVersion: (version: CommunicationTemplateVersionView) => void
  onPublishVersion: (version: CommunicationTemplateVersionView) => void
  onArchiveVersion: (version: CommunicationTemplateVersionView) => void
  onCloneVersion: (version: CommunicationTemplateVersionView) => void
  onDetailsVersion: (version: CommunicationTemplateVersionView) => void
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Brak danych'
  }

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function CommunicationTemplateDetail({
  group,
  isLoading,
  error,
  feedbackSuccess,
  feedbackError,
  onBack,
  onCreateDraft,
  onEditDraft,
  onPreviewVersion,
  onPublishVersion,
  onArchiveVersion,
  onCloneVersion,
  onDetailsVersion,
}: CommunicationTemplateDetailProps) {
  if (isLoading) {
    return (
      <div className="p-6">
        <SectionCard padding="none">
          <EmptyState title="Ładowanie szczegółów szablonu..." />
        </SectionCard>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <Button type="button" onClick={onBack}>
          Wróć do listy
        </Button>
        <AlertBanner tone="danger" title="Nie udało się pobrać szablonu" description={error} />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="space-y-6 p-6">
        <Button type="button" onClick={onBack}>
          Wróć do listy
        </Button>
        <SectionCard padding="none">
          <EmptyState
            title="Nie znaleziono szablonu"
            description="Wybrany kod komunikatu nie istnieje albo nie ma jeszcze żadnych wersji."
          />
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="Szablon komunikatu"
        title={group.name}
        description={group.description || 'Brak opisu operacyjnego dla tego szablonu.'}
        actions={
          <>
            <Button type="button" onClick={onBack}>
              Wróć do listy
            </Button>
            <Button type="button" onClick={() => onCreateDraft(group)} variant="primary">
              Utwórz nową wersję roboczą
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge tone={group.publishedVersion ? 'green' : 'amber'} leadingDot>
          {group.publishedVersion ? 'Opublikowana' : 'Brak opublikowanej wersji'}
        </Badge>
        <Badge tone="brand">
          {group.publishedVersion
            ? `Wersja aktywna: v${group.publishedVersion.versionNumber}`
            : 'Wersja aktywna: brak'}
        </Badge>
      </div>

      {feedbackSuccess && (
        <AlertBanner tone="success" title="Zapisano zmianę" description={feedbackSuccess} />
      )}

      {feedbackError && (
        <AlertBanner tone="danger" title="Nie udało się wykonać akcji" description={feedbackError} />
      )}

      <SectionCard
        title="Aktualnie opublikowana wersja"
        description="Ta wersja jest obecnie używana przez system przy przygotowywaniu komunikacji."
      >
        {group.publishedVersion ? (
          <CommunicationTemplateVersionCard
            version={group.publishedVersion}
            title={group.name}
            subtitle={`Opublikowana ${formatDateTime(group.publishedVersion.publishedAt ?? group.publishedVersion.updatedAt)} przez ${group.publishedVersion.publishedByDisplayName ?? group.publishedVersion.updatedByDisplayName ?? 'nieznanego autora'}.`}
            highlight
            onPreview={onPreviewVersion}
            onClone={onCloneVersion}
            onDetails={onDetailsVersion}
          />
        ) : (
          <EmptyState
            title="Brak opublikowanej wersji"
            description="Utwórz wersję roboczą, sprawdź podgląd i opublikuj ją dopiero po weryfikacji treści."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Wersje robocze"
        description="Tutaj przygotowujesz zmiany. Opublikowana wersja pozostaje aktywna do momentu świadomej publikacji."
      >
        {group.draftVersions.length > 0 ? (
          <div className="space-y-4">
            {group.draftVersions.map((version) => (
              <CommunicationTemplateVersionCard
                key={version.id}
                version={version}
                title={`${group.name} - wersja robocza`}
                subtitle={`Ostatnia edycja ${formatDateTime(version.updatedAt)} przez ${version.updatedByDisplayName ?? 'nieznanego autora'}.`}
                onPreview={onPreviewVersion}
                onEdit={onEditDraft}
                onPublish={onPublishVersion}
                onArchive={onArchiveVersion}
                onClone={onCloneVersion}
                onDetails={onDetailsVersion}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Brak wersji roboczych"
            description="Aby przygotować zmianę treści, utwórz nową wersję roboczą na podstawie istniejącego szablonu."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Wersje archiwalne"
        description="Historia poprzednich wersji jest dostępna do wglądu i klonowania, bez wpływu na aktywną komunikację."
      >
        {group.archivedVersions.length > 0 ? (
          <div className="space-y-4">
            {group.archivedVersions.map((version) => (
              <CommunicationTemplateVersionCard
                key={version.id}
                version={version}
                title={`${group.name} - v${version.versionNumber}`}
                subtitle={`Utworzono ${formatDateTime(version.createdAt)} · ostatnia zmiana ${formatDateTime(version.updatedAt)}.`}
                onPreview={onPreviewVersion}
                onClone={onCloneVersion}
                onDetails={onDetailsVersion}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="Brak wersji archiwalnych" description="Ten szablon nie ma jeszcze starszych wersji." />
        )}
      </SectionCard>

      <SectionCard title="Metadane szablonu" description="Informacje porządkujące szablon w administracji.">
        <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DataField label="Kod komunikatu" value={group.code} mono />
          <DataField label="Kanał" value={CONTACT_CHANNEL_LABELS[group.channel]} />
          <DataField label="Wersje łącznie" value={group.versions.length} />
          <DataField label="Ostatnia aktualizacja" value={formatDateTime(group.lastUpdatedAt)} />
        </dl>
      </SectionCard>

      <CommunicationTemplatePlaceholdersCard code={group.code} />
    </div>
  )
}
