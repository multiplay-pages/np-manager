import type {
  PliCbdIntegrationDirection,
  PliCbdIntegrationStatus,
} from '../constants'
import type { FnpBlockingReason } from './pli-cbd-process.dto'
import type { PliCbdTechnicalPayloadWarningDto } from './pli-cbd-technical-payload.dto'

export type PliCbdManualExportMessageType = 'E03' | 'E12' | 'E18' | 'E23'
export type PliCbdTransportMode = 'DISABLED' | 'STUB' | 'REAL_SOAP'
export type PliCbdTransportOutcome =
  | 'ACCEPTED'
  | 'REJECTED'
  | 'TRANSPORT_ERROR'
  | 'STUBBED'
  | 'DISABLED'
  | 'NOT_IMPLEMENTED'

export interface PliCbdIntegrationEventDto {
  id: string
  portingRequestId: string
  operationType: PliCbdIntegrationDirection
  operationStatus: PliCbdIntegrationStatus
  actionName: string | null
  transportMode: PliCbdTransportMode | null
  transportAdapterName: string | null
  transportOutcome: PliCbdTransportOutcome | null
  requestPayloadJson: unknown | null
  responsePayloadJson: unknown | null
  errorMessage: string | null
  triggeredByUserId: string | null
  triggeredByDisplayName: string | null
  createdAt: string
  completedAt: string | null
}

export interface PliCbdIntegrationEventsResultDto {
  items: PliCbdIntegrationEventDto[]
}

export interface PliCbdTransportEnvelopeDto {
  messageId: string
  messageType: PliCbdManualExportMessageType
  caseNumber: string
  senderRoutingNumber: string
  receiverRoutingNumber: string
  soapAction: string
  protocolVersion: string
  xmlPayload: string
  builtAt: string
}

export interface PliCbdTransportResultDto {
  outcome: PliCbdTransportOutcome
  adapterName: string
  referenceId: string | null
  rejectionReason: string | null
  errorMessage: string | null
  diagnostics: Record<string, unknown> | null
  respondedAt: string
}

export interface PliCbdManualExportResultDto {
  integrationEventId: string
  portingRequestId: string
  messageType: PliCbdManualExportMessageType
  status: 'SUCCESS' | 'ERROR'
  transportMode: PliCbdTransportMode | null
  blockingReasons: FnpBlockingReason[]
  technicalWarnings: PliCbdTechnicalPayloadWarningDto[]
  xml: string | null
  envelopeSnapshot: PliCbdTransportEnvelopeDto | null
  transportResult: PliCbdTransportResultDto | null
  errorMessage: string | null
  startedAt: string
  finishedAt: string
}
