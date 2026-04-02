import { apiClient } from './api.client'
import type {
  CreatePortingRequestDto,
  PliCbdIntegrationEventsResultDto,
  PliCbdProcessSnapshotDto,
  PortingRequestDetailDto,
  PortingRequestListQueryDto,
  PortingRequestListResultDto,
  PortingTimelineResultDto,
  UpdatePortingRequestStatusDto,
} from '@np-manager/shared'

export type GetPortingRequestsParams = PortingRequestListQueryDto
export type CreatePortingRequestPayload = CreatePortingRequestDto
export type UpdatePortingRequestStatusPayload = UpdatePortingRequestStatusDto

export async function getPortingRequests(
  params: GetPortingRequestsParams = {},
): Promise<PortingRequestListResultDto> {
  const query = new URLSearchParams()

  if (params.search) query.set('search', params.search)
  if (params.status) query.set('status', params.status)
  if (params.portingMode) query.set('portingMode', params.portingMode)
  if (params.donorOperatorId) query.set('donorOperatorId', params.donorOperatorId)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  const suffix = query.toString()
  const response = await apiClient.get<{ success: true; data: PortingRequestListResultDto }>(
    suffix ? `/porting-requests?${suffix}` : '/porting-requests',
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

export async function getPortingRequestProcessSnapshot(
  id: string,
): Promise<PliCbdProcessSnapshotDto> {
  const response = await apiClient.get<{
    success: true
    data: PliCbdProcessSnapshotDto
  }>(`/porting-requests/${id}/pli-cbd-process`)

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
