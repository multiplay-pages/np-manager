// ============================================================
// TIMELINE SPRAWY PORTOWANIA
// ============================================================

export type PortingTimelineItemKind = 'STATUS' | 'PLI_EVENT' | 'SYSTEM_EVENT'

export interface PortingTimelineItemDto {
  id: string
  kind: PortingTimelineItemKind
  timestamp: string
  title: string
  description: string | null
  badge: string | null
  statusBefore: string | null
  statusAfter: string | null
  exxType: string | null
  statusCode: string | null
  authorDisplayName: string | null
}

export interface PortingTimelineResultDto {
  items: PortingTimelineItemDto[]
}
