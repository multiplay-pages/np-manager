import type {
  ClientType,
  ContactChannel,
  NumberType,
  PortedNumberKind,
  PortingCaseStatus,
  PortingMode,
  PliCbdExportStatus,
  PliCbdExxType,
  SubscriberIdentityType,
} from '../constants'

// ============================================================
// QUERY / LISTA
// ============================================================

export interface PortingRequestListQueryDto {
  search?: string
  status?: PortingCaseStatus
  portingMode?: PortingMode
  donorOperatorId?: string
  page?: number
  pageSize?: number
}

export interface PortingRequestListItemDto {
  id: string
  caseNumber: string
  clientId: string
  clientDisplayName: string
  numberDisplay: string
  donorOperatorId: string
  donorOperatorName: string
  portingMode: PortingMode
  statusInternal: PortingCaseStatus
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
  createdAt: string
  updatedAt: string
}
