import type {
  PortingCaseStatus,
  PortingRequestCaseHistoryEventType,
  UserRole,
} from '../constants'

export interface PortingRequestCaseHistoryItemDto {
  id: string
  eventType: PortingRequestCaseHistoryEventType
  timestamp: string
  statusBefore: PortingCaseStatus | null
  statusAfter: PortingCaseStatus | null
  actorDisplayName: string | null
  actorRole: UserRole | null
  reason: string | null
  comment: string | null
  metadata: Record<string, string | number | boolean | null> | null
}

export interface PortingRequestCaseHistoryResultDto {
  items: PortingRequestCaseHistoryItemDto[]
}
