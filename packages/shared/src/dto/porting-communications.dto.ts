import type {
  CommunicationDeliveryOutcome,
  CommunicationTemplateCode,
  CommunicationTemplateVersionStatus,
  CommunicationTemplatePlaceholder,
  ContactChannel,
  PortingCaseStatus,
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

export interface CommunicationDeliveryAttemptDto {
  id: string
  communicationId: string
  attemptedAt: string
  attemptedByUserId: string
  attemptedByDisplayName: string | null
  channel: PortingCommunicationType
  recipient: string
  subjectSnapshot: string
  bodySnapshot: string
  outcome: CommunicationDeliveryOutcome
  transportMessageId: string | null
  transportReference: string | null
  errorCode: string | null
  errorMessage: string | null
  responsePayloadJson: Record<string, unknown> | null
  adapterName: string
}

export interface CommunicationDeliveryAttemptsResultDto {
  communicationId: string
  attempts: CommunicationDeliveryAttemptDto[]
}

export interface SendPortingCommunicationResultDto {
  communication: PortingCommunicationDto
  attempt: CommunicationDeliveryAttemptDto
}

export interface CommunicationTemplateDto {
  id: string
  code: CommunicationTemplateCode
  name: string
  description: string | null
  channel: ContactChannel
  createdAt: string
  updatedAt: string
  createdByUserId: string
  updatedByUserId: string
  createdByDisplayName: string | null
  updatedByDisplayName: string | null
  publishedVersionId: string | null
  publishedVersionNumber: number | null
  publishedAt: string | null
  publishedByDisplayName: string | null
  versions: CommunicationTemplateVersionDto[]
}

export interface CommunicationTemplateVersionDto {
  id: string
  templateId: string
  versionNumber: number
  status: CommunicationTemplateVersionStatus
  subjectTemplate: string
  bodyTemplate: string
  createdAt: string
  updatedAt: string
  createdByUserId: string
  updatedByUserId: string
  createdByDisplayName: string | null
  updatedByDisplayName: string | null
  publishedAt: string | null
  publishedByUserId: string | null
  publishedByDisplayName: string | null
}

export interface CommunicationTemplateListItemDto {
  id: string
  code: CommunicationTemplateCode
  name: string
  description: string | null
  channel: ContactChannel
  createdAt: string
  updatedAt: string
  createdByUserId: string
  updatedByUserId: string
  createdByDisplayName: string | null
  updatedByDisplayName: string | null
  publishedVersionId: string | null
  publishedVersionNumber: number | null
  publishedAt: string | null
  publishedByDisplayName: string | null
  lastVersionUpdatedAt: string | null
  lastVersionUpdatedByDisplayName: string | null
  versionCounts: {
    total: number
    draft: number
    published: number
    archived: number
  }
}

export interface CommunicationTemplateListResultDto {
  items: CommunicationTemplateListItemDto[]
}

export interface CreateCommunicationTemplateDto {
  code: CommunicationTemplateCode
  name: string
  description?: string | null
  channel: ContactChannel
  subjectTemplate: string
  bodyTemplate: string
}

export interface CreateCommunicationTemplateVersionDto {
  name?: string
  description?: string | null
  subjectTemplate: string
  bodyTemplate: string
  sourceVersionId?: string | null
}

export interface UpdateCommunicationTemplateVersionDto {
  name?: string
  description?: string | null
  subjectTemplate?: string
  bodyTemplate?: string
}

export interface CommunicationTemplateVersionListResultDto {
  items: CommunicationTemplateVersionDto[]
}

export interface RenderCommunicationTemplateResultDto {
  renderedSubject: string
  renderedBody: string
  usedPlaceholders: string[]
  missingPlaceholders: CommunicationTemplatePlaceholder[]
  unknownPlaceholders: string[]
  isRenderable: boolean
}

export interface CommunicationTemplatePreviewContextSummaryDto {
  portingRequestId: string
  caseNumber: string
  clientName: string
  donorOperatorName: string
  recipientOperatorName: string
  plannedPortDate: string | null
  statusInternal: PortingCaseStatus
}

export interface CommunicationTemplatePreviewRealCaseRequestDto {
  portingRequestId?: string
  caseNumber?: string
  issueDescription?: string | null
}

export interface CommunicationTemplatePreviewRealCaseDto extends RenderCommunicationTemplateResultDto {
  previewContextSummary: CommunicationTemplatePreviewContextSummaryDto
  warnings: string[]
}
