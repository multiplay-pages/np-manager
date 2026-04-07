import { CONTACT_CHANNEL_LABELS, type ContactChannel } from '@np-manager/shared'
import {
  getCommunicationTemplateStatusClasses,
  getCommunicationTemplateStatusLabel,
  type CommunicationTemplateUiStatus,
  type CommunicationTemplateVersionView,
} from '@/lib/communicationTemplates'

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

function StatusBadge({ status }: { status: CommunicationTemplateUiStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getCommunicationTemplateStatusClasses(status)}`}
    >
      {getCommunicationTemplateStatusLabel(status)}
    </span>
  )
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
      className={`rounded-3xl border p-5 shadow-sm ${
        highlight ? 'border-green-200 bg-green-50/60' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            <StatusBadge status={version.uiStatus} />
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
              v{version.versionNumber}
            </span>
          </div>
          {subtitle && <p className="mt-2 text-sm leading-6 text-gray-600">{subtitle}</p>}
        </div>

        <button type="button" onClick={() => onPreview?.(version)} className="btn-secondary">
          Podglad
        </button>
      </div>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Kanal</dt>
          <dd className="mt-1 text-gray-800">{getChannelLabel(version.channel)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Ostatnia zmiana</dt>
          <dd className="mt-1 text-gray-800">{formatDateTime(version.updatedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Autor</dt>
          <dd className="mt-1 text-gray-800">{version.updatedByDisplayName ?? 'Brak danych'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Temat</dt>
          <dd className="mt-1 line-clamp-2 text-gray-800">{version.subjectTemplate || 'Brak tematu'}</dd>
        </div>
      </dl>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Fragment tresci</div>
        <p className="mt-2 text-sm leading-6 text-gray-700">{version.excerpt || 'Brak tresci.'}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {onEdit && version.uiStatus === 'DRAFT' && (
          <button type="button" onClick={() => onEdit(version)} className="btn-primary">
            Edytuj
          </button>
        )}

        {onPublish && version.uiStatus === 'DRAFT' && (
          <button type="button" onClick={() => onPublish(version)} className="btn-primary">
            Publikuj
          </button>
        )}

        {onArchive && version.uiStatus === 'DRAFT' && (
          <button type="button" onClick={() => onArchive(version)} className="btn-secondary">
            Archiwizuj
          </button>
        )}

        {onClone && (
          <button type="button" onClick={() => onClone(version)} className="btn-secondary">
            Sklonuj do nowej wersji roboczej
          </button>
        )}

        {onDetails && (
          <button type="button" onClick={() => onDetails(version)} className="btn-secondary">
            Szczegoly
          </button>
        )}
      </div>
    </article>
  )
}
