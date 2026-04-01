import type { PortingTimelineItemDto } from '@np-manager/shared'

const KIND_COLORS: Record<string, string> = {
  STATUS: 'bg-blue-100 text-blue-700',
  PLI_EVENT: 'bg-purple-100 text-purple-700',
  SYSTEM_EVENT: 'bg-gray-100 text-gray-700',
}

const KIND_DOT_COLORS: Record<string, string> = {
  STATUS: 'bg-blue-500',
  PLI_EVENT: 'bg-purple-500',
  SYSTEM_EVENT: 'bg-gray-400',
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function TimelineItem({ item }: { item: PortingTimelineItemDto }) {
  const dotColor = KIND_DOT_COLORS[item.kind] ?? 'bg-gray-400'
  const badgeColor = KIND_COLORS[item.kind] ?? 'bg-gray-100 text-gray-700'

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full mt-1.5 ${dotColor} ring-2 ring-white`} />
        <div className="w-px flex-1 bg-gray-200" />
      </div>
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">{item.title}</span>
          {item.badge && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeColor}`}>
              {item.badge}
            </span>
          )}
          {item.exxType && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-amber-50 text-amber-700">
              {item.exxType}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-1">
          <span>{formatTimestamp(item.timestamp)}</span>
          {item.authorDisplayName && (
            <span>{item.authorDisplayName}</span>
          )}
          {item.statusCode && (
            <span className="font-mono">{item.statusCode}</span>
          )}
        </div>
        {(item.statusBefore || item.statusAfter) && (
          <div className="text-xs text-gray-500 mb-1">
            {item.statusBefore && <span>{item.statusBefore}</span>}
            {item.statusBefore && item.statusAfter && <span> {'→'} </span>}
            {item.statusAfter && <span className="font-medium text-gray-700">{item.statusAfter}</span>}
          </div>
        )}
        {item.description && (
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.description}</p>
        )}
      </div>
    </div>
  )
}

interface PortingTimelineProps {
  items: PortingTimelineItemDto[]
  isLoading: boolean
}

export function PortingTimeline({ items, isLoading }: PortingTimelineProps) {
  if (isLoading) {
    return (
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Historia sprawy
        </h2>
        <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
          Ladowanie historii...
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Historia sprawy
        </h2>
        <p className="text-sm text-gray-500 py-4 text-center">
          Brak zdarzen w historii sprawy.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Historia sprawy
      </h2>
      <div>
        {items.map((item) => (
          <TimelineItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
