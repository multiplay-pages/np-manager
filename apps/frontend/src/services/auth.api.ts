import type { AuthUser } from '@np-manager/shared'
import { apiClient } from './api.client'

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface ChangePasswordResponse {
  message: string
}

export async function getAuthMe(): Promise<AuthUser> {
  const response = await apiClient.get<{
    success: true
    data: { user: AuthUser }
  }>('/auth/me')

  return response.data.data.user
}

export async function changeOwnPassword(
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResponse> {
  const response = await apiClient.patch<{
    success: true
    data: ChangePasswordResponse
  }>('/auth/change-password', payload)

  return response.data.data
}
