import { CONTACT_CHANNEL_LABELS, type ContactChannel } from '@np-manager/shared'
import {
  getCommunicationTemplateStatusLabel,
  type CommunicationTemplateUiStatus,
  type CommunicationTemplateVersionView,
} from '@/lib/communicationTemplates'
import { Badge, Button, DataField, type BadgeTone } from '@/components/ui'

interface CommunicationTemplateVersionCardProps {
  version: CommunicationTemplateVersionView
  title?: string
  subtitle?: string
  highlight?: boolean
  onPreview?: (version: CommunicationTemplateVersionView) => void
  onEdit?: (version: CommunicationTemplateVersionView) => void
  onPublish?: (version: CommunicationTemplateVersionView) => void
  onArchive?: (version: CommunicationTemplateVersionView) => void
  onClone?: (version: CommunicationTemplateVersionView) => void
  onDetails?: (version: CommunicationTemplateVersionView) => void
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

function getChannelLabel(channel: ContactChannel): string {
  return CONTACT_CHANNEL_LABELS[channel] ?? channel
}

function getStatusTone(status: CommunicationTemplateUiStatus): BadgeTone {
  if (status === 'PUBLISHED') return 'green'
  if (status === 'DRAFT') return 'amber'
  if (status === 'ARCHIVED') return 'neutral'
  return 'orange'
}

export function CommunicationTemplateVersionCard({
  version,
  title,
  subtitle,
  highlight = false,
  onPreview,
  onEdit,
  onPublish,
  onArchive,
  onClone,
  onDetails,
}: CommunicationTemplateVersionCardProps) {
  return (
    <article
      className={`rounded-panel border p-5 ${
        highlight ? 'border-emerald-200 bg-emerald-50/50' : 'border-line bg-surface'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {title && <h3 className="text-lg font-semibold text-ink-900">{title}</h3>}
            <Badge tone={getStatusTone(version.uiStatus)} leadingDot>
              {getCommunicationTemplateStatusLabel(version.uiStatus)}
            </Badge>
            <Badge tone="brand">v{version.versionNumber}</Badge>
          </div>
          {subtitle && <p className="mt-2 text-sm leading-6 text-ink-600">{subtitle}</p>}
        </div>

        {onPreview && (
          <Button type="button" onClick={() => onPreview(version)} size="sm">
            Podgląd
          </Button>
        )}
      </div>

      <dl className="mt-5 grid gap-4 rounded-panel border border-line bg-ink-50/60 p-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <DataField label="Kanał" value={getChannelLabel(version.channel)} />
        <DataField label="Ostatnia zmiana" value={formatDateTime(version.updatedAt)} />
        <DataField label="Autor" value={version.updatedByDisplayName ?? 'Brak danych'} />
        <DataField label="Temat" value={version.subjectTemplate || 'Brak tematu'} />
      </dl>

      <div className="mt-5 rounded-panel border border-line bg-surface px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-400">Fragment treści</div>
        <p className="mt-2 text-sm leading-6 text-ink-700">{version.excerpt || 'Brak treści.'}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {onEdit && version.uiStatus === 'DRAFT' && (
          <Button type="button" onClick={() => onEdit(version)} variant="primary" size="sm">
            Edytuj
          </Button>
        )}

        {onPublish && version.uiStatus === 'DRAFT' && (
          <Button type="button" onClick={() => onPublish(version)} variant="primary" size="sm">
            Publikuj
          </Button>
        )}

        {onArchive && version.uiStatus === 'DRAFT' && (
          <Button type="button" onClick={() => onArchive(version)} size="sm">
            Archiwizuj
          </Button>
        )}

        {onClone && (
          <Button type="button" onClick={() => onClone(version)} size="sm">
            Sklonuj do wersji roboczej
          </Button>
        )}

        {onDetails && (
          <Button type="button" onClick={() => onDetails(version)} size="sm">
            Szczegóły
          </Button>
        )}
      </div>
    </article>
  )
}
