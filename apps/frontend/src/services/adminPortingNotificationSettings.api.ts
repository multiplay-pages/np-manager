import { apiClient } from './api.client'
import type {
  PortingNotificationSettingsDto,
  UpdatePortingNotificationSettingsDto,
} from '@np-manager/shared'

const ADMIN_PORTING_NOTIFICATION_SETTINGS_API_PATH = '/admin/porting-notification-settings'

export async function getAdminPortingNotificationSettings(): Promise<PortingNotificationSettingsDto> {
  const response = await apiClient.get<{
    success: true
    data: PortingNotificationSettingsDto
  }>(ADMIN_PORTING_NOTIFICATION_SETTINGS_API_PATH)

  return response.data.data
}

export async function updateAdminPortingNotificationSettings(
  payload: UpdatePortingNotificationSettingsDto,
): Promise<PortingNotificationSettingsDto> {
  const response = await apiClient.put<{
    success: true
    data: PortingNotificationSettingsDto
  }>(ADMIN_PORTING_NOTIFICATION_SETTINGS_API_PATH, payload)

  return response.data.data
}
