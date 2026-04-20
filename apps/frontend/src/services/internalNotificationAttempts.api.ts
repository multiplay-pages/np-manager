import type { GlobalInternalNotificationAttemptsResultDto } from '@np-manager/shared'
import { apiClient } from './api.client'

export interface GetGlobalInternalNotificationAttemptsParams {
  limit?: number
  offset?: number
}

export async function getGlobalInternalNotificationAttempts(
  params: GetGlobalInternalNotificationAttemptsParams = {},
): Promise<GlobalInternalNotificationAttemptsResultDto> {
  const query = new URLSearchParams()
  if (params.limit) query.set('limit', String(params.limit))
  if (params.offset !== undefined) query.set('offset', String(params.offset))

  const suffix = query.toString()
  const response = await apiClient.get<{
    success: true
    data: GlobalInternalNotificationAttemptsResultDto
  }>(suffix ? `/internal-notification-attempts?${suffix}` : '/internal-notification-attempts')

  return response.data.data
}
