import { apiClient } from './api.client'
import type {
  NotificationFallbackSettingsDto,
  UpdateNotificationFallbackSettingsDto,
} from '@np-manager/shared'

const ADMIN_NOTIFICATION_FALLBACK_SETTINGS_API_PATH = '/admin/notification-fallback-settings'

export async function getAdminNotificationFallbackSettings(): Promise<NotificationFallbackSettingsDto> {
  const response = await apiClient.get<{
    success: true
    data: NotificationFallbackSettingsDto
  }>(ADMIN_NOTIFICATION_FALLBACK_SETTINGS_API_PATH)

  return response.data.data
}

export async function updateAdminNotificationFallbackSettings(
  payload: UpdateNotificationFallbackSettingsDto,
): Promise<NotificationFallbackSettingsDto> {
  const response = await apiClient.put<{
    success: true
    data: NotificationFallbackSettingsDto
  }>(ADMIN_NOTIFICATION_FALLBACK_SETTINGS_API_PATH, payload)

  return response.data.data
}
