import type {
  GlobalInternalNotificationAttemptsResultDto,
  InternalNotificationAttemptChannelDto,
  InternalNotificationAttemptOutcomeDto,
} from '@np-manager/shared'
import { apiClient } from './api.client'

export interface GetGlobalInternalNotificationAttemptsParams {
  limit?: number
  offset?: number
  outcome?: InternalNotificationAttemptOutcomeDto
  channel?: InternalNotificationAttemptChannelDto
  retryableOnly?: boolean
}

export async function getGlobalInternalNotificationAttempts(
  params: GetGlobalInternalNotificationAttemptsParams = {},
): Promise<GlobalInternalNotificationAttemptsResultDto> {
  const query = new URLSearchParams()
  if (params.limit) query.set('limit', String(params.limit))
  if (params.offset !== undefined) query.set('offset', String(params.offset))
  if (params.outcome) query.set('outcome', params.outcome)
  if (params.channel) query.set('channel', params.channel)
  if (params.retryableOnly) query.set('retryableOnly', 'true')

  const suffix = query.toString()
  const response = await apiClient.get<{
    success: true
    data: GlobalInternalNotificationAttemptsResultDto
  }>(suffix ? `/internal-notification-attempts?${suffix}` : '/internal-notification-attempts')

  return response.data.data
}
