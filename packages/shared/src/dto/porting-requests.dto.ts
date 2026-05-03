import type {
  ClientType,
  ContactChannel,
  NumberType,
  PortingCommunicationTriggerType,
  PortingRequestStatusActionId,
  PortingRequestExternalActionId,
  PortedNumberKind,
  PortingCaseStatus,
  PortingMode,
  PliCbdExportStatus,
  PliCbdExxType,
  SubscriberIdentityType,
  UserRole,
} from '../constants'
import type {
  PortingCommunicationDto,
  PortingCommunicationSummaryDto,
  PortingRequestCommunicationActionDto,
} from './porting-communications.dto'

// ============================================================
// QUERY / LISTA
// ============================================================

export type OwnershipFilter = 'ALL' | 'MINE' | 'UNASSIGNED'
export type CommercialOwnerFilter = 'ALL' | 'WITH_OWNER' | 'WITHOUT_OWNER' | 'MINE'
export type NotificationHealthFilter = 'ALL' | 'HAS_FAILURES' | 'NO_FAILURES'
export type PortingRequestQuickWorkFilter = 'URGENT' | 'NO_DATE' | 'NEEDS_ACTION_TODAY'
export type PortingRequestListSort =
  | 'CREATED_AT_DESC'
  | 'WORK_PRIORITY'
  | 'NUMBER_ASC'
  | 'NUMBER_DESC'
  | 'CLIENT_ASC'
  | 'CLIENT_DESC'
  | 'STATUS_ASC'
  | 'STATUS_DESC'
  | 'CONFIRMED_PORT_DATE_ASC'
  | 'CONFIRMED_PORT_DATE_DESC'
  | 'DONOR_OPERATOR_ASC'
  | 'DONOR_OPERATOR_DESC'
  | 'PORTING_MODE_ASC'
  | 'PORTING_MODE_DESC'
  | 'ASSIGNED_USER_ASC'
  | 'ASSIGNED_USER_DESC'
  | 'COMMERCIAL_OWNER_ASC'
  | 'COMMERCIAL_OWNER_DESC'
export type NotificationHealthStatus = 'OK' | 'FAILED' | 'MISCONFIGURED' | 'MIXED'

export interface NotificationHealthDiagnosticsDto {
  status: NotificationHealthStatus
  failureCount: number
  failedCount: number
  misconfiguredCount: number
  lastFailureAt: string | null
  lastFailureOutcome: 'FAILED' | 'MISCONFIGURED' | null
}

export interface NotificationFailureHistoryItemDto {
  id: string
  occurredAt: string
  outcome: 'FAILED' | 'MISCONFIGURED'
  channel: 'EMAIL' | 'TEAMS' | 'UNKNOWN'
  message: string
  technicalDetailsPreview: string | null
  isConfigurationIssue: boolean
  isDeliveryIssue: boolean
}

export interface NotificationFailureHistoryResultDto {
  items: NotificationFailureHistoryItemDto[]
}

// ============================================================
// OPIEKUN HANDLOWY
// ============================================================

/** Skrócony profil opiekuna handlowego (rola SALES) zwracany w detail DTO. */
export interface CommercialOwnerSummaryDto {
  id: string
  email: string
  displayName: string
  role: UserRole
}

/** Opcja opiekuna handlowego na liście kandydatów (dropdown). */
export interface CommercialOwnerCandidateDto {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
}

export interface CommercialOwnerCandidatesResultDto {
  users: CommercialOwnerCandidateDto[]
}

/** Body żądania zmiany opiekuna handlowego. */
export interface UpdatePortingRequestCommercialOwnerDto {
  commercialOwnerUserId: string | null
}

export interface PortingRequestListQueryDto {
  search?: string
  status?: PortingCaseStatus
  portingMode?: PortingMode
  donorOperatorId?: string
  ownership?: OwnershipFilter
  quickWorkFilter?: PortingRequestQuickWorkFilter
  commercialOwnerFilter?: CommercialOwnerFilter
  notificationHealthFilter?: NotificationHealthFilter
  confirmedPortDateFrom?: string
  confirmedPortDateTo?: string
  sort?: PortingRequestListSort
  page?: number
  pageSize?: number
}

export interface PortingRequestSummaryQueryDto {
  search?: string
  status?: PortingCaseStatus
  portingMode?: PortingMode
  donorOperatorId?: string
  ownership?: OwnershipFilter
  commercialOwnerFilter?: CommercialOwnerFilter
  notificationHealthFilter?: NotificationHealthFilter
  confirmedPortDateFrom?: string
  confirmedPortDateTo?: string
}

export interface PortingRequestListItemDto {
  id: string
  caseNumber: string
  clientId: string
  clientDisplayName: string
  numberDisplay: string
  confirmedPortDate: string | null
  donorOperatorId: string
  donorOperatorName: string
  portingMode: PortingMode
  statusInternal: PortingCaseStatus
  assignedUserSummary: PortingRequestAssigneeSummaryDto | null
  commercialOwnerSummary: CommercialOwnerSummaryDto | null
  hasNotificationFailures: boolean
  notificationHealthStatus: NotificationHealthStatus
  notificationFailureCount: number
  notificationLastFailureAt: string | null
  notificationLastFailureOutcome: 'FAILED' | 'MISCONFIGURED' | null
  createdAt: string
}

export interface PortingRequestListResultDto {
  items: PortingRequestListItemDto[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface PortingRequestQuickWorkCountsDto {
  urgent: number
  noDate: number
  needsActionToday: number
}

export interface PortingRequestOperationalSummaryDto {
  totalRequests: number
  withCommercialOwner: number
  withoutCommercialOwner: number
  myCommercialRequests: number
  requestsWithNotificationFailures: number
  quickWorkCounts: PortingRequestQuickWorkCountsDto
}

// ============================================================
// CREATE
// ============================================================

export interface CreatePortingRequestDto {
  clientId: string
  donorOperatorId: string
  numberType?: NumberType
  numberRangeKind: PortedNumberKind
  primaryNumber?: string
  rangeStart?: string
  rangeEnd?: string
  requestDocumentNumber?: string
  portingMode: PortingMode
  requestedPortDate?: string
  earliestAcceptablePortDate?: string
  subscriberKind: ClientType
  subscriberFirstName?: string
  subscriberLastName?: string
  subscriberCompanyName?: string
  identityType: SubscriberIdentityType
  identityValue: string
  correspondenceAddress: string
  hasPowerOfAttorney: boolean
  linkedWholesaleServiceOnRecipientSide: boolean
  infrastructureOperatorId?: string
  contactChannel: ContactChannel
  internalNotes?: string
}

export interface UpdatePortingRequestStatusDto {
  targetStatus: PortingCaseStatus
  actionId?: PortingRequestStatusActionId
  reason?: string
  comment?: string
}

/**
 * Operacyjna edycja danych sprawy v1.
 * Dozwolony waski zestaw pol kontaktowo/operacyjnych.
 * Wszystkie pola opcjonalne, przynajmniej jedno musi byc obecne w request.
 */
export interface UpdatePortingRequestDetailsDto {
  correspondenceAddress?: string
  contactChannel?: ContactChannel
  internalNotes?: string | null
  requestDocumentNumber?: string | null
}

/** Ręczne uzupełnienie wyznaczonej daty przeniesienia numeru (tryb manualny). */
export interface UpdatePortingRequestPortDateDto {
  confirmedPortDate: string | null
}

export interface ConfirmPortingRequestPortDateDto {
  confirmedPortDate: string
  comment?: string
}

export interface PortingRequestStatusActionDto {
  actionId: PortingRequestStatusActionId
  label: string
  targetStatus: PortingCaseStatus
  requiresReason: boolean
  requiresComment: boolean
  reasonLabel: string | null
  commentLabel: string | null
  description: string
}

export interface PortingRequestExternalActionDto {
  actionId: PortingRequestExternalActionId
  label: string
  description: string
  requiresScheduledPortDate: boolean
  requiresRejectionReason: boolean
  suggestedCommunicationTriggerType: PortingCommunicationTriggerType
}

export interface ExecutePortingRequestExternalActionDto {
  actionId: PortingRequestExternalActionId
  scheduledPortDate?: string
  rejectionReason?: string
  comment?: string
  createCommunicationDraft?: boolean
  recipient?: string
}

export interface ExecutePortingRequestExternalActionResultDto {
  request: PortingRequestDetailDto
  communication: PortingCommunicationDto | null
}

// ============================================================
// SZCZEGÓŁY
// ============================================================

export interface PortingRequestClientRefDto {
  id: string
  clientType: ClientType
  displayName: string
}

export interface PortingRequestOperatorRefDto {
  id: string
  name: string
  shortName: string
  routingNumber: string
}

export interface PortingRequestAssigneeSummaryDto {
  id: string
  email: string
  displayName: string
  role: UserRole
}

export interface PortingRequestDetailDto {
  id: string
  caseNumber: string
  client: PortingRequestClientRefDto
  numberType: NumberType
  numberRangeKind: PortedNumberKind
  primaryNumber: string | null
  rangeStart: string | null
  rangeEnd: string | null
  numberDisplay: string
  requestDocumentNumber: string | null
  donorOperator: PortingRequestOperatorRefDto
  recipientOperator: PortingRequestOperatorRefDto
  infrastructureOperator: PortingRequestOperatorRefDto | null
  donorRoutingNumber: string
  recipientRoutingNumber: string
  sentToExternalSystemAt: string | null
  portingMode: PortingMode
  requestedPortDate: string | null
  requestedPortTime: string | null
  earliestAcceptablePortDate: string | null
  confirmedPortDate: string | null
  donorAssignedPortDate: string | null
  donorAssignedPortTime: string | null
  statusInternal: PortingCaseStatus
  statusPliCbd: string | null
  pliCbdCaseId: string | null
  pliCbdCaseNumber: string | null
  pliCbdPackageId: string | null
  pliCbdExportStatus: PliCbdExportStatus
  pliCbdLastSyncAt: string | null
  lastExxReceived: PliCbdExxType | null
  lastPliCbdMessageType: PliCbdExxType | null
  lastPliCbdStatusCode: string | null
  lastPliCbdStatusDescription: string | null
  rejectionCode: string | null
  rejectionReason: string | null
  subscriberKind: ClientType
  subscriberDisplayName: string
  subscriberFirstName: string | null
  subscriberLastName: string | null
  subscriberCompanyName: string | null
  identityType: SubscriberIdentityType
  identityValue: string
  correspondenceAddress: string
  hasPowerOfAttorney: boolean
  linkedWholesaleServiceOnRecipientSide: boolean
  contactChannel: ContactChannel
  internalNotes: string | null
  createdByUserId: string
  assignedUser: PortingRequestAssigneeSummaryDto | null
  assignedAt: string | null
  assignedByUserId: string | null
  commercialOwner: CommercialOwnerSummaryDto | null
  createdAt: string
  updatedAt: string
  availableStatusActions: PortingRequestStatusActionDto[]
  availableExternalActions: PortingRequestExternalActionDto[]
  availableCommunicationActions: PortingRequestCommunicationActionDto[]
  communicationSummary: PortingCommunicationSummaryDto
  notificationHealth: NotificationHealthDiagnosticsDto
}

export interface PortingRequestAssignmentHistoryItemDto {
  id: string
  portingRequestId: string
  previousAssignedUser: PortingRequestAssigneeSummaryDto | null
  nextAssignedUser: PortingRequestAssigneeSummaryDto | null
  changedByUser: PortingRequestAssigneeSummaryDto
  createdAt: string
}

export interface PortingRequestAssignmentHistoryResultDto {
  items: PortingRequestAssignmentHistoryItemDto[]
}

// ============================================================
// ASSIGNMENT USERS (lightweight list for reassignment UI)
// ============================================================

export interface PortingRequestAssignmentUserOptionDto {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
}

export interface PortingRequestAssignmentUsersResultDto {
  users: PortingRequestAssignmentUserOptionDto[]
}
