import type {
  ClientType,
  FnpExxMessage,
  FnpProcessStage,
  ContactChannel,
  NumberType,
  PliCbdExportStatus,
  PortingCaseStatus,
  PortedNumberKind,
  PortingMode,
  SubscriberIdentityType,
} from '../constants'
import type { FnpBlockingReason } from './pli-cbd-process.dto'

export interface PliCbdDraftOperatorDto {
  id: string
  name: string
  shortName: string
  routingNumber: string
}

export interface PliCbdDraftIdentityDto {
  type: SubscriberIdentityType
  value: string
}

export interface PliCbdDraftBuildResultDto<TDraft> {
  requestId: string
  caseNumber: string
  isReady: boolean
  blockingReasons: FnpBlockingReason[]
  draft: TDraft | null
}

export interface PliCbdE03DraftDto {
  messageType: 'E03'
  serviceType: 'FNP'
  requestId: string
  caseNumber: string
  clientId: string
  clientDisplayName: string
  subscriberKind: ClientType
  subscriberDisplayName: string
  subscriberFirstName: string | null
  subscriberLastName: string | null
  subscriberCompanyName: string | null
  numberType: NumberType
  portedNumberKind: PortedNumberKind
  primaryNumber: string | null
  rangeStart: string | null
  rangeEnd: string | null
  numberDisplay: string
  portingMode: PortingMode
  requestedPortDate: string | null
  earliestAcceptablePortDate: string | null
  requestDocumentNumber: string
  donorOperator: PliCbdDraftOperatorDto
  recipientOperator: PliCbdDraftOperatorDto
  infrastructureOperator: PliCbdDraftOperatorDto | null
  identity: PliCbdDraftIdentityDto
  correspondenceAddress: string
  hasPowerOfAttorney: boolean
  linkedWholesaleServiceOnRecipientSide: boolean
  contactChannel: ContactChannel
  technicalHints: {
    portDateSource: 'REQUESTED_PORT_DATE' | 'EARLIEST_ACCEPTABLE_PORT_DATE'
    numberSelectionSource: 'PRIMARY_NUMBER' | 'NUMBER_RANGE'
  }
}

export interface PliCbdE03DraftBuildResultDto extends PliCbdDraftBuildResultDto<PliCbdE03DraftDto> {}

export interface PliCbdE12DraftDto {
  messageType: 'E12'
  serviceType: 'FNP'
  portingRequestId: string
  caseNumber: string
  clientId: string
  clientDisplayName: string
  subscriberDisplayName: string
  donorOperator: PliCbdDraftOperatorDto
  recipientOperator: PliCbdDraftOperatorDto
  portingMode: PortingMode
  numberType: NumberType
  numberRangeKind: PortedNumberKind
  numberDisplay: string
  confirmationContext: {
    currentStage: FnpProcessStage
    currentStageLabel: string
    statusInternal: PortingCaseStatus
    statusInternalLabel: string
    exportStatus: PliCbdExportStatus
    lastReceivedMessageType: FnpExxMessage | null
    donorAssignedPortDate: string | null
    donorAssignedPortTime: string | null
  }
  reasonHints: string[]
  technicalHints: {
    dataSource: 'CURRENT_CASE_AND_PROCESS_SNAPSHOT'
    portDateSource: 'DONOR_ASSIGNED_PORT_DATE'
    numberSelectionSource: 'PRIMARY_NUMBER' | 'NUMBER_RANGE'
    allowedMessagesAtStage: FnpExxMessage[]
  }
}

export interface PliCbdE12DraftBuildResultDto extends PliCbdDraftBuildResultDto<PliCbdE12DraftDto> {}
