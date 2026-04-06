import type {
  PortingCommunicationStatus,
  PortingCommunicationTemplateKey,
  PortingCommunicationTriggerType,
  PortingCommunicationType,
  PortingRequestCommunicationActionType,
  UserRole,
} from '../constants'

export interface PortingCommunicationTemplateContextDto {
  clientName: string
  caseNumber: string
  phoneNumber: string
  scheduledPortDate: string | null
  rejectionReason: string | null
}

export interface PreparePortingCommunicationDraftDto {
  actionType?: PortingRequestCommunicationActionType
  type?: PortingCommunicationType
  triggerType?: PortingCommunicationTriggerType
  templateKey?: PortingCommunicationTemplateKey
  recipient?: string
  metadata?: Record<string, string | number | boolean | null>
}

export interface PortingCommunicationPreviewDto {
  actionType: PortingRequestCommunicationActionType
  type: PortingCommunicationType
  triggerType: PortingCommunicationTriggerType
  templateKey: PortingCommunicationTemplateKey
  recipient: string
  subject: string
  body: string
  context: PortingCommunicationTemplateContextDto
}

export interface PortingCommunicationDto {
  id: string
  portingRequestId: string
  actionType: PortingRequestCommunicationActionType
  type: PortingCommunicationType
  status: PortingCommunicationStatus
  triggerType: PortingCommunicationTriggerType
  recipient: string
  subject: string
  body: string
  templateKey: PortingCommunicationTemplateKey
  createdByUserId: string
  createdByDisplayName: string | null
  createdByRole: UserRole | null
  sentAt: string | null
  errorMessage: string | null
  metadata: Record<string, string | number | boolean | null> | null
  createdAt: string
  updatedAt: string
}

export interface PortingCommunicationListResultDto {
  items: PortingCommunicationDto[]
}

export interface PortingCommunicationDraftInfoDto {
  id: string
  status: PortingCommunicationStatus
  recipient: string
  subject: string
  createdAt: string
  createdByDisplayName: string | null
}

export interface PortingRequestCommunicationActionDto {
  type: PortingRequestCommunicationActionType
  label: string
  description: string
  canPreview: boolean
  canCreateDraft: boolean
  canMarkSent: boolean
  disabled: boolean
  disabledReason: string | null
  existingDraftId: string | null
  existingDraftInfo: PortingCommunicationDraftInfoDto | null
  allowsMultipleDrafts: boolean
}

export interface PortingCommunicationSummaryDto {
  totalCount: number
  draftCount: number
  sentCount: number
  errorCount: number
  lastCommunicationAt: string | null
  lastCommunicationType: PortingRequestCommunicationActionType | null
}

export interface MarkPortingCommunicationSentDto {
  sentAt?: string
}
