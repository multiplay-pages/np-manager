import type { UserRole } from '../constants'

export type DetailsHistoryFieldName =
  | 'correspondenceAddress'
  | 'contactChannel'
  | 'internalNotes'
  | 'requestDocumentNumber'
  | 'confirmedPortDate'

export interface PortingRequestDetailsHistoryItemDto {
  id: string
  fieldName: DetailsHistoryFieldName
  oldValue: string | null
  newValue: string | null
  actorDisplayName: string | null
  actorRole: UserRole | null
  timestamp: string
}

export interface PortingRequestDetailsHistoryResultDto {
  items: PortingRequestDetailsHistoryItemDto[]
}
