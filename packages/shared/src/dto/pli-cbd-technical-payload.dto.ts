import type {
  ClientType,
  ContactChannel,
  FnpExxMessage,
  FnpProcessStage,
  NumberType,
  PliCbdExportStatus,
  PliCbdTechnicalPayloadVersion,
  PortedNumberKind,
  PortingCaseStatus,
  PortingMode,
  SubscriberIdentityType,
} from '../constants'
import type { FnpBlockingReason } from './pli-cbd-process.dto'

export interface PliCbdTechnicalPayloadWarningDto {
  code: string
  message: string
  field?: string
}

export interface PliCbdTechnicalPayloadSubscriberDto {
  kind: ClientType
  displayName: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  identity: {
    type: SubscriberIdentityType
    value: string
  }
  correspondenceAddress: string
  contactChannel: ContactChannel
}

export interface PliCbdTechnicalPayloadNumberingDto {
  numberType: NumberType
  portedNumberKind: PortedNumberKind
  numberDisplay: string
  primaryNumber: string | null
  rangeStart: string | null
  rangeEnd: string | null
  selectionSource: 'PRIMARY_NUMBER' | 'NUMBER_RANGE'
}

export interface PliCbdTechnicalPayloadPortingDto {
  portingMode: PortingMode
  requestedPortDate: string | null
  earliestAcceptablePortDate: string | null
  donorAssignedPortDate: string | null
  donorAssignedPortTime: string | null
  confirmedPortDate: string | null
  requestDocumentNumber: string | null
  hasPowerOfAttorney: boolean
  linkedWholesaleServiceOnRecipientSide: boolean
}

export interface PliCbdTechnicalPayloadContextDto {
  currentStage: FnpProcessStage | null
  currentStageLabel: string | null
  statusInternal: PortingCaseStatus | null
  statusInternalLabel: string | null
  exportStatus: PliCbdExportStatus | null
  lastReceivedMessageType: FnpExxMessage | null
  allowedMessagesAtStage: FnpExxMessage[]
  dataSource: 'CURRENT_CASE_AND_PROCESS_SNAPSHOT'
  reasonHints: string[]
}

export interface PliCbdTechnicalPayloadMetadataDto {
  requestId: string
  clientId: string
  clientDisplayName: string
  subscriberDisplayName: string
  sourceDraftMessageType: 'E03' | 'E12' | 'E18' | 'E23'
  serializerTarget: 'XML_PENDING'
  envelopeTarget: 'SOAP_PENDING'
  transportTarget: 'NONE'
}

export interface PliCbdTechnicalPayloadDto {
  messageType: 'E03' | 'E12' | 'E18' | 'E23'
  serviceType: 'FNP'
  messageVersion: PliCbdTechnicalPayloadVersion
  caseNumber: string
  recipientOperatorRoutingNumber: string
  donorOperatorRoutingNumber: string
  infrastructureOperatorRoutingNumber: string | null
  subscriber: PliCbdTechnicalPayloadSubscriberDto
  numbering: PliCbdTechnicalPayloadNumberingDto
  porting: PliCbdTechnicalPayloadPortingDto
  context: PliCbdTechnicalPayloadContextDto
  metadata: PliCbdTechnicalPayloadMetadataDto
}

export interface PliCbdE03TechnicalPayloadDto extends PliCbdTechnicalPayloadDto {
  messageType: 'E03'
  context: PliCbdTechnicalPayloadContextDto & {
    portDateSource: 'REQUESTED_PORT_DATE' | 'EARLIEST_ACCEPTABLE_PORT_DATE'
  }
}

export interface PliCbdE12TechnicalPayloadDto extends PliCbdTechnicalPayloadDto {
  messageType: 'E12'
  context: PliCbdTechnicalPayloadContextDto & {
    portDateSource: 'DONOR_ASSIGNED_PORT_DATE'
  }
}

export interface PliCbdE18TechnicalPayloadDto extends PliCbdTechnicalPayloadDto {
  messageType: 'E18'
}

export interface PliCbdE23TechnicalPayloadDto extends PliCbdTechnicalPayloadDto {
  messageType: 'E23'
  context: PliCbdTechnicalPayloadContextDto & {
    cancellationReasonCode: 'RECIPIENT_MANUAL_CANCELLATION'
  }
}

export type PliCbdAnyTechnicalPayloadDto =
  | PliCbdE03TechnicalPayloadDto
  | PliCbdE12TechnicalPayloadDto
  | PliCbdE18TechnicalPayloadDto
  | PliCbdE23TechnicalPayloadDto

export interface PliCbdTechnicalPayloadBuildResultDto<TPayload extends PliCbdTechnicalPayloadDto> {
  requestId: string
  caseNumber: string
  isReady: boolean
  blockingReasons: FnpBlockingReason[]
  technicalWarnings: PliCbdTechnicalPayloadWarningDto[]
  payload: TPayload | null
}

export interface PliCbdE03TechnicalPayloadBuildResultDto extends PliCbdTechnicalPayloadBuildResultDto<PliCbdE03TechnicalPayloadDto> {}

export interface PliCbdE12TechnicalPayloadBuildResultDto extends PliCbdTechnicalPayloadBuildResultDto<PliCbdE12TechnicalPayloadDto> {}

export interface PliCbdE18TechnicalPayloadBuildResultDto extends PliCbdTechnicalPayloadBuildResultDto<PliCbdE18TechnicalPayloadDto> {}

export interface PliCbdE23TechnicalPayloadBuildResultDto extends PliCbdTechnicalPayloadBuildResultDto<PliCbdE23TechnicalPayloadDto> {}

export type PliCbdAnyTechnicalPayloadBuildResultDto =
  | PliCbdE03TechnicalPayloadBuildResultDto
  | PliCbdE12TechnicalPayloadBuildResultDto
  | PliCbdE18TechnicalPayloadBuildResultDto
  | PliCbdE23TechnicalPayloadBuildResultDto
