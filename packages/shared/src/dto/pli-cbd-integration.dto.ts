import type {
  PliCbdIntegrationDirection,
  PliCbdIntegrationStatus,
} from '../constants'

export interface PliCbdIntegrationEventDto {
  id: string
  portingRequestId: string
  operationType: PliCbdIntegrationDirection
  operationStatus: PliCbdIntegrationStatus
  actionName: string | null
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
