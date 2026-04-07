import type {
  CommunicationTemplateCode,
  CommunicationTemplatePlaceholder,
  ContactChannel,
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
  portedNumber: string
  donorOperatorName: string
  recipientOperatorName: string
  plannedPortDate: string | null
  issueDescription: string | null
  contactEmail: string | null
  contactPhone: string | null
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

export interface CommunicationTemplateDto {
  id: string
  code: CommunicationTemplateCode
  name: string
  description: string | null
  channel: ContactChannel
  subjectTemplate: string
  bodyTemplate: string
  isActive: boolean
  version: number
  createdAt: string
  updatedAt: string
  createdByUserId: string
  updatedByUserId: string
  createdByDisplayName: string | null
  updatedByDisplayName: string | null
}

export interface CommunicationTemplateListResultDto {
  items: CommunicationTemplateDto[]
}

export interface CreateCommunicationTemplateDto {
  code: CommunicationTemplateCode
  name: string
  description?: string | null
  channel: ContactChannel
  subjectTemplate: string
  bodyTemplate: string
  isActive?: boolean
}

export interface UpdateCommunicationTemplateDto {
  code?: CommunicationTemplateCode
  name?: string
  description?: string | null
  channel?: ContactChannel
  subjectTemplate?: string
  bodyTemplate?: string
  isActive?: boolean
}

export interface RenderCommunicationTemplateResultDto {
  renderedSubject: string
  renderedBody: string
  missingPlaceholders: CommunicationTemplatePlaceholder[]
  unknownPlaceholders: string[]
  isRenderable: boolean
}
