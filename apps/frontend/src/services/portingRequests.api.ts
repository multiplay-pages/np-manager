import { apiClient } from './api.client'
import type {
  GlobalNotificationFailureQueueResultDto,
  CommercialOwnerCandidatesResultDto,
  UpdatePortingRequestCommercialOwnerDto,
  CommunicationDeliveryAttemptsResultDto,
  CreatePortingRequestDto,
  ExecutePortingRequestExternalActionDto,
  ExecutePortingRequestExternalActionResultDto,
  PliCbdAnyTechnicalPayloadBuildResultDto,
  PliCbdAnyXmlPreviewBuildResultDto,
  PliCbdE03DraftBuildResultDto,
  PliCbdE12DraftBuildResultDto,
  PliCbdE18DraftBuildResultDto,
  PortingCommunicationDto,
  PortingCommunicationListResultDto,
  PortingCommunicationPreviewDto,
  PliCbdIntegrationEventsResultDto,
  PliCbdManualExportMessageType,
  PliCbdManualExportResultDto,
  PliCbdProcessSnapshotDto,
  PortingRequestAssignmentHistoryResultDto,
  PortingRequestAssignmentUsersResultDto,
  PortingRequestCaseHistoryResultDto,
  PortingRequestDetailDto,
  NotificationFailureHistoryResultDto,
  PortingInternalNotificationHistoryResultDto,
  InternalNotificationDeliveryAttemptsResultDto,
  PortingRequestListQueryDto,
  PortingRequestListResultDto,
  PortingRequestOperationalSummaryDto,
  PortingRequestSummaryQueryDto,
  PreparePortingCommunicationDraftDto,
  PortingTimelineResultDto,
  SendPortingCommunicationResultDto,
  UpdatePortingRequestStatusDto,
} from '@np-manager/shared'

export type GetPortingRequestsParams = PortingRequestListQueryDto
export type GetPortingRequestsSummaryParams = PortingRequestSummaryQueryDto
export type CreatePortingRequestPayload = CreatePortingRequestDto
export type UpdatePortingRequestStatusPayload = UpdatePortingRequestStatusDto
export interface UpdatePortingRequestAssignmentPayload {
  assignedUserId: string | null
}
export type PliCbdTechnicalPayloadApiMessageType = 'e03' | 'e12' | 'e18' | 'e23'
export type PreparePortingCommunicationDraftPayload = PreparePortingCommunicationDraftDto
export type ExecutePortingRequestExternalActionPayload = ExecutePortingRequestExternalActionDto
export type UpdatePortingRequestCommercialOwnerPayload = UpdatePortingRequestCommercialOwnerDto

function appendListFiltersToQuery(
  query: URLSearchParams,
  params: {
    search?: string
    status?: string
    portingMode?: string
    donorOperatorId?: string
    ownership?: string
    commercialOwnerFilter?: string
    notificationHealthFilter?: string
  },
): void {
  if (params.search) query.set('search', params.search)
  if (params.status) query.set('status', params.status)
  if (params.portingMode) query.set('portingMode', params.portingMode)
  if (params.donorOperatorId) query.set('donorOperatorId', params.donorOperatorId)
  if (params.ownership && params.ownership !== 'ALL') query.set('ownership', params.ownership)
  if (params.commercialOwnerFilter && params.commercialOwnerFilter !== 'ALL') {
    query.set('commercialOwnerFilter', params.commercialOwnerFilter)
  }
  if (params.notificationHealthFilter && params.notificationHealthFilter !== 'ALL') {
    query.set('notificationHealthFilter', params.notificationHealthFilter)
  }
}

export async function getPortingRequests(
  params: GetPortingRequestsParams = {},
): Promise<PortingRequestListResultDto> {
  const query = new URLSearchParams()
  appendListFiltersToQuery(query, params)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  const suffix = query.toString()
  const response = await apiClient.get<{ success: true; data: PortingRequestListResultDto }>(
    suffix ? `/porting-requests?${suffix}` : '/porting-requests',
  )

  return response.data.data
}

export async function getPortingRequestsSummary(
  params: GetPortingRequestsSummaryParams = {},
): Promise<PortingRequestOperationalSummaryDto> {
  const query = new URLSearchParams()
  appendListFiltersToQuery(query, params)

  const suffix = query.toString()
  const response = await apiClient.get<{ success: true; data: PortingRequestOperationalSummaryDto }>(
    suffix ? `/porting-requests/summary?${suffix}` : '/porting-requests/summary',
  )

  return response.data.data
}

export async function getPortingRequestById(id: string): Promise<PortingRequestDetailDto> {
  const response = await apiClient.get<{
    success: true
    data: { request: PortingRequestDetailDto }
  }>(`/porting-requests/${id}`)

  return response.data.data.request
}

export async function createPortingRequest(
  data: CreatePortingRequestPayload,
): Promise<PortingRequestDetailDto> {
  const response = await apiClient.post<{
    success: true
    data: { request: PortingRequestDetailDto }
  }>('/porting-requests', data)

  return response.data.data.request
}

export async function updatePortingRequestStatus(
  id: string,
  data: UpdatePortingRequestStatusPayload,
): Promise<PortingRequestDetailDto> {
  const response = await apiClient.patch<{
    success: true
    data: { request: PortingRequestDetailDto }
  }>(`/porting-requests/${id}/status`, data)

  return response.data.data.request
}

export async function updatePortingRequestAssignment(
  id: string,
  data: UpdatePortingRequestAssignmentPayload,
): Promise<PortingRequestDetailDto> {
  const response = await apiClient.patch<{
    success: true
    data: { request: PortingRequestDetailDto }
  }>(`/porting-requests/${id}/assignment`, data)

  return response.data.data.request
}

export async function assignPortingRequestToMe(id: string): Promise<PortingRequestDetailDto> {
  const response = await apiClient.post<{
    success: true
    data: { request: PortingRequestDetailDto }
  }>(`/porting-requests/${id}/assignment/assign-to-me`)

  return response.data.data.request
}

export async function getPortingRequestAssignmentHistory(
  id: string,
): Promise<PortingRequestAssignmentHistoryResultDto> {
  const response = await apiClient.get<{
    success: true
    data: PortingRequestAssignmentHistoryResultDto
  }>(`/porting-requests/${id}/assignment-history`)

  return response.data.data
}

export async function getPortingRequestAssignmentUsers(): Promise<PortingRequestAssignmentUsersResultDto> {
  const response = await apiClient.get<{
    success: true
    data: PortingRequestAssignmentUsersResultDto
  }>('/porting-requests/assignment-users')

  return response.data.data
}

export async function exportPortingRequest(id: string): Promise<PortingRequestDetailDto> {
  const response = await apiClient.post<{
    success: true
    data: { request: PortingRequestDetailDto }
  }>(`/porting-requests/${id}/export`)

  return response.data.data.request
}

export async function syncPortingRequest(id: string): Promise<PortingRequestDetailDto> {
  const response = await apiClient.post<{
    success: true
    data: { request: PortingRequestDetailDto }
  }>(`/porting-requests/${id}/sync`)

  return response.data.data.request
}

export async function getPortingRequestTimeline(id: string): Promise<PortingTimelineResultDto> {
  const response = await apiClient.get<{
    success: true
    data: PortingTimelineResultDto
  }>(`/porting-requests/${id}/timeline`)

  return response.data.data
}

export async function getPortingRequestCaseHistory(
  id: string,
): Promise<PortingRequestCaseHistoryResultDto> {
  const response = await apiClient.get<{
    success: true
    data: PortingRequestCaseHistoryResultDto
  }>(`/porting-requests/${id}/case-history`)

  return response.data.data
}

export async function getPortingRequestInternalNotifications(
  id: string,
): Promise<PortingInternalNotificationHistoryResultDto> {
  const response = await apiClient.get<{
    success: true
    data: PortingInternalNotificationHistoryResultDto
  }>(`/porting-requests/${id}/internal-notifications`)

  return response.data.data
}

export async function getPortingRequestInternalNotificationAttempts(
  id: string,
  limit?: number,
): Promise<InternalNotificationDeliveryAttemptsResultDto> {
  const query = new URLSearchParams()
  if (limit) query.set('limit', String(limit))

  const suffix = query.toString()
  const response = await apiClient.get<{
    success: true
    data: InternalNotificationDeliveryAttemptsResultDto
  }>(
    suffix
      ? `/porting-requests/${id}/internal-notification-attempts?${suffix}`
      : `/porting-requests/${id}/internal-notification-attempts`,
  )

  return response.data.data
}

export interface GetGlobalNotificationFailureQueueParams {
  outcomes?: ('FAILED' | 'MISCONFIGURED')[]
  canRetry?: boolean
  sort?: 'newest' | 'retryAvailable'
  limit?: number
  offset?: number
}

export async function getGlobalNotificationFailureQueue(
  params: GetGlobalNotificationFailureQueueParams = {},
): Promise<GlobalNotificationFailureQueueResultDto> {
  const query = new URLSearchParams()
  if (params.outcomes && params.outcomes.length > 0) {
    query.set('outcome', params.outcomes.join(','))
  }
  if (params.canRetry !== undefined) {
    query.set('canRetry', String(params.canRetry))
  }
  if (params.sort) query.set('sort', params.sort)
  if (params.limit) query.set('limit', String(params.limit))
  if (params.offset) query.set('offset', String(params.offset))

  const suffix = query.toString()
  const response = await apiClient.get<{
    success: true
    data: GlobalNotificationFailureQueueResultDto
  }>(suffix ? `/internal-notification-failures?${suffix}` : '/internal-notification-failures')

  return response.data.data
}

export async function getPortingRequestNotificationFailures(
  id: string,
): Promise<NotificationFailureHistoryResultDto> {
  const response = await apiClient.get<{
    success: true
    data: NotificationFailureHistoryResultDto
  }>(`/porting-requests/${id}/notification-failures`)

  return response.data.data
}

export async function getPortingRequestCommunicationHistory(
  id: string,
): Promise<PortingCommunicationListResultDto> {
  const response = await apiClient.get<{
    success: true
    data: PortingCommunicationListResultDto
  }>(`/porting-requests/${id}/communications`)

  return response.data.data
}

export async function previewPortingCommunicationDraft(
  id: string,
  data: PreparePortingCommunicationDraftPayload = {},
): Promise<PortingCommunicationPreviewDto> {
  const response = await apiClient.post<{
    success: true
    data: PortingCommunicationPreviewDto
  }>(`/porting-requests/${id}/communications/preview`, data)

  return response.data.data
}

export async function createPortingCommunicationDraft(
  id: string,
  data: PreparePortingCommunicationDraftPayload = {},
): Promise<PortingCommunicationDto> {
  const response = await apiClient.post<{
    success: true
    data: { communication: PortingCommunicationDto }
  }>(`/porting-requests/${id}/communications/drafts`, data)

  return response.data.data.communication
}

export async function markPortingCommunicationAsSent(
  id: string,
  communicationId: string,
): Promise<PortingCommunicationDto> {
  const response = await apiClient.patch<{
    success: true
    data: { communication: PortingCommunicationDto }
  }>(`/porting-requests/${id}/communications/${communicationId}/mark-sent`, {})

  return response.data.data.communication
}

export async function sendPortingCommunication(
  id: string,
  communicationId: string,
): Promise<SendPortingCommunicationResultDto> {
  const response = await apiClient.post<{
    success: true
    data: SendPortingCommunicationResultDto
  }>(`/porting-requests/${id}/communications/${communicationId}/send`)

  return response.data.data
}

export async function retryPortingCommunication(
  id: string,
  communicationId: string,
): Promise<SendPortingCommunicationResultDto> {
  const response = await apiClient.post<{
    success: true
    data: SendPortingCommunicationResultDto
  }>(`/porting-requests/${id}/communications/${communicationId}/retry`)

  return response.data.data
}

export async function cancelPortingCommunication(
  id: string,
  communicationId: string,
): Promise<PortingCommunicationDto> {
  const response = await apiClient.post<{
    success: true
    data: { communication: PortingCommunicationDto }
  }>(`/porting-requests/${id}/communications/${communicationId}/cancel`)

  return response.data.data.communication
}

export async function getPortingCommunicationDeliveryAttempts(
  id: string,
  communicationId: string,
): Promise<CommunicationDeliveryAttemptsResultDto> {
  const response = await apiClient.get<{
    success: true
    data: CommunicationDeliveryAttemptsResultDto
  }>(`/porting-requests/${id}/communications/${communicationId}/delivery-attempts`)

  return response.data.data
}

export async function executePortingRequestExternalAction(
  id: string,
  data: ExecutePortingRequestExternalActionPayload,
): Promise<ExecutePortingRequestExternalActionResultDto> {
  const response = await apiClient.post<{
    success: true
    data: ExecutePortingRequestExternalActionResultDto
  }>(`/porting-requests/${id}/external-actions`, data)

  return response.data.data
}

export async function getPortingRequestProcessSnapshot(
  id: string,
): Promise<PliCbdProcessSnapshotDto> {
  const response = await apiClient.get<{
    success: true
    data: PliCbdProcessSnapshotDto
  }>(`/porting-requests/${id}/pli-cbd-process`)

  return response.data.data
}

export async function getPortingRequestE03Draft(id: string): Promise<PliCbdE03DraftBuildResultDto> {
  const response = await apiClient.get<{
    success: true
    data: PliCbdE03DraftBuildResultDto
  }>(`/porting-requests/${id}/pli-cbd-drafts/e03`)

  return response.data.data
}

export async function getPortingRequestE12Draft(id: string): Promise<PliCbdE12DraftBuildResultDto> {
  const response = await apiClient.get<{
    success: true
    data: PliCbdE12DraftBuildResultDto
  }>(`/porting-requests/${id}/pli-cbd-drafts/e12`)

  return response.data.data
}

export async function getPortingRequestE18Draft(id: string): Promise<PliCbdE18DraftBuildResultDto> {
  const response = await apiClient.get<{
    success: true
    data: PliCbdE18DraftBuildResultDto
  }>(`/porting-requests/${id}/pli-cbd-drafts/e18`)

  return response.data.data
}

export async function getPortingRequestTechnicalPayload(
  id: string,
  messageType: PliCbdTechnicalPayloadApiMessageType,
): Promise<PliCbdAnyTechnicalPayloadBuildResultDto> {
  const response = await apiClient.get<{
    success: true
    data: PliCbdAnyTechnicalPayloadBuildResultDto
  }>(`/porting-requests/${id}/pli-cbd-payloads/${messageType}`)

  return response.data.data
}

export async function getPortingRequestXmlPreview(
  id: string,
  messageType: PliCbdTechnicalPayloadApiMessageType,
): Promise<PliCbdAnyXmlPreviewBuildResultDto> {
  const response = await apiClient.get<{
    success: true
    data: PliCbdAnyXmlPreviewBuildResultDto
  }>(`/porting-requests/${id}/pli-cbd-xml/${messageType}`)

  return response.data.data
}

export async function getPortingRequestIntegrationEvents(
  id: string,
): Promise<PliCbdIntegrationEventsResultDto> {
  const response = await apiClient.get<{
    success: true
    data: PliCbdIntegrationEventsResultDto
  }>(`/porting-requests/${id}/integration-events`)

  return response.data.data
}

export async function triggerManualPliCbdExport(
  id: string,
  messageType: PliCbdManualExportMessageType,
): Promise<PliCbdManualExportResultDto> {
  const response = await apiClient.post<{
    success: true
    data: { exportResult: PliCbdManualExportResultDto }
  }>(`/porting-requests/${id}/pli-cbd-exports/${messageType.toLowerCase()}/manual`)

  return response.data.data.exportResult
}

export async function listCommercialOwnerCandidates(): Promise<CommercialOwnerCandidatesResultDto> {
  const response = await apiClient.get<{
    success: true
    data: CommercialOwnerCandidatesResultDto
  }>('/porting-requests/commercial-owner-candidates')

  return response.data.data
}

export async function updatePortingRequestCommercialOwner(
  id: string,
  data: UpdatePortingRequestCommercialOwnerPayload,
): Promise<PortingRequestDetailDto> {
  const response = await apiClient.patch<{
    success: true
    data: { request: PortingRequestDetailDto }
  }>(`/porting-requests/${id}/commercial-owner`, data)

  return response.data.data.request
}
