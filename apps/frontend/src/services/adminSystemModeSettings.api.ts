import type {
  AdminSystemModeSettingsDto,
  UpdateAdminSystemModeSettingsDto,
} from '@np-manager/shared'
import { apiClient } from './api.client'

const ADMIN_SYSTEM_MODE_SETTINGS_API_PATH = '/admin/system-mode-settings'

export async function getAdminSystemModeSettings(): Promise<AdminSystemModeSettingsDto> {
  const response = await apiClient.get<{
    success: true
    data: AdminSystemModeSettingsDto
  }>(ADMIN_SYSTEM_MODE_SETTINGS_API_PATH)

  return response.data.data
}

export async function updateAdminSystemModeSettings(
  payload: UpdateAdminSystemModeSettingsDto,
): Promise<AdminSystemModeSettingsDto> {
  const response = await apiClient.put<{
    success: true
    data: AdminSystemModeSettingsDto
  }>(ADMIN_SYSTEM_MODE_SETTINGS_API_PATH, payload)

  return response.data.data
}
