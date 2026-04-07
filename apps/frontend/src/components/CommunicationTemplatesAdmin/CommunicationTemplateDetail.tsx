import type { CommunicationTemplateGroupView, CommunicationTemplateVersionView } from '@/lib/communicationTemplates'
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
  onCloneVersion,
  onDetailsVersion,
}: CommunicationTemplateDetailProps) {
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-600">
          Ladowanie szczegolow szablonu...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <button type="button" onClick={onBack} className="btn-secondary">
          Wroc do listy
        </button>
        <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-6 text-sm text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="space-y-6 p-6">
        <button type="button" onClick={onBack} className="btn-secondary">
          Wroc do listy
        </button>
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Nie znaleziono szablonu</h1>
          <p className="mt-3 text-sm text-gray-600">
            Wybrany kod komunikatu nie istnieje albo nie ma jeszcze zadnych wersji.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button type="button" onClick={onBack} className="btn-secondary">
            Wroc do listy
          </button>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900">{group.name}</h1>
          <p className="mt-2 text-sm font-medium text-gray-600">{group.code}</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            {group.description || 'Brak opisu operacyjnego dla tego szablonu.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 font-medium text-green-700">
              {group.publishedVersion ? 'Opublikowana' : 'Brak opublikowanej wersji'}
            </span>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-medium">
              {group.publishedVersion ? `Wersja aktywna: v${group.publishedVersion.version}` : 'Wersja aktywna: brak'}
            </span>
          </div>
        </div>

        <button type="button" onClick={() => onCreateDraft(group)} className="btn-primary">
          Utworz nowa wersje robocza
        </button>
      </div>

      {feedbackSuccess && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {feedbackSuccess}
        </div>
      )}

      {feedbackError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {feedbackError}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Aktualnie uzywane operacyjnie</h2>
            <p className="mt-2 text-sm text-gray-600">
              To ta wersja jest obecnie wykorzystywana przez system przy tworzeniu nowych draftow komunikacji.
            </p>
          </div>
        </div>

        {group.publishedVersion ? (
          <CommunicationTemplateVersionCard
            version={group.publishedVersion}
            title={group.name}
            subtitle={`Opublikowana ${formatDateTime(group.publishedVersion.updatedAt)} przez ${group.publishedVersion.updatedByDisplayName ?? 'nieznanego autora'}.`}
            highlight
            onPreview={onPreviewVersion}
            onClone={onCloneVersion}
            onDetails={onDetailsVersion}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-8 text-sm text-gray-600">
            Brak opublikowanej wersji tego szablonu.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Wersje robocze</h2>
          <p className="mt-2 text-sm text-gray-600">
            Zmiany przygotowujesz w wersjach roboczych. Opublikowanej wersji nie edytujemy bezposrednio.
          </p>
        </div>

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
                onClone={onCloneVersion}
                onDetails={onDetailsVersion}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-8 text-sm text-gray-600">
            Brak wersji roboczych. Aby przygotowac zmiany, utworz nowa wersje robocza na podstawie aktualnie opublikowanego szablonu.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Historia wersji</h2>
          <p className="mt-2 text-sm text-gray-600">
            Lista wszystkich wersji od najnowszej do najstarszej, z widocznym statusem i szybkim podgladem.
          </p>
        </div>

        <div className="space-y-4">
          {group.versions.map((version) => (
            <CommunicationTemplateVersionCard
              key={version.id}
              version={version}
              title={`${group.name} - v${version.version}`}
              subtitle={`Utworzono ${formatDateTime(version.createdAt)} · ostatnia zmiana ${formatDateTime(version.updatedAt)}.`}
              onPreview={onPreviewVersion}
              onClone={onCloneVersion}
              onDetails={onDetailsVersion}
            />
          ))}
        </div>
      </section>

      <CommunicationTemplatePlaceholdersCard code={group.code} />
    </div>
  )
}
