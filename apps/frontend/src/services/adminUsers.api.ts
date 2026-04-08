import { apiClient } from './api.client'
import type {
  AdminUserDetailDto,
  AdminUsersListResponseDto,
  CreateAdminUserDto,
  ResetAdminUserPasswordDto,
  ResetPasswordResponseDto,
  UpdateAdminUserRoleDto,
  UserAdminAuditLogItemDto,
  UserRole,
} from '@np-manager/shared'

const ADMIN_USERS_API_PATH = '/admin/users'

export interface GetAdminUsersParams {
  role?: UserRole
  isActive?: boolean
  query?: string
}

export async function getAdminUsers(
  params: GetAdminUsersParams = {},
): Promise<AdminUsersListResponseDto> {
  const searchParams = new URLSearchParams()

  if (params.role) {
    searchParams.set('role', params.role)
  }

  if (typeof params.isActive === 'boolean') {
    searchParams.set('isActive', String(params.isActive))
  }

  if (params.query?.trim()) {
    searchParams.set('query', params.query.trim())
  }

  const suffix = searchParams.toString()
  const response = await apiClient.get<{
    success: true
    data: AdminUsersListResponseDto
  }>(suffix ? `${ADMIN_USERS_API_PATH}?${suffix}` : ADMIN_USERS_API_PATH)

  return response.data.data
}

export async function getAdminUserDetail(id: string): Promise<AdminUserDetailDto> {
  const response = await apiClient.get<{
    success: true
    data: { user: AdminUserDetailDto }
  }>(`${ADMIN_USERS_API_PATH}/${id}`)

  return response.data.data.user
}

export async function createAdminUser(payload: CreateAdminUserDto): Promise<AdminUserDetailDto> {
  const response = await apiClient.post<{
    success: true
    data: { user: AdminUserDetailDto }
  }>(ADMIN_USERS_API_PATH, payload)

  return response.data.data.user
}

export async function updateAdminUserRole(
  id: string,
  payload: UpdateAdminUserRoleDto,
): Promise<AdminUserDetailDto> {
  const response = await apiClient.patch<{
    success: true
    data: { user: AdminUserDetailDto }
  }>(`${ADMIN_USERS_API_PATH}/${id}/role`, payload)

  return response.data.data.user
}

export async function deactivateAdminUser(id: string): Promise<AdminUserDetailDto> {
  const response = await apiClient.patch<{
    success: true
    data: { user: AdminUserDetailDto }
  }>(`${ADMIN_USERS_API_PATH}/${id}/deactivate`)

  return response.data.data.user
}

export async function reactivateAdminUser(id: string): Promise<AdminUserDetailDto> {
  const response = await apiClient.patch<{
    success: true
    data: { user: AdminUserDetailDto }
  }>(`${ADMIN_USERS_API_PATH}/${id}/reactivate`)

  return response.data.data.user
}

export async function resetAdminUserPassword(
  id: string,
  payload: ResetAdminUserPasswordDto,
): Promise<ResetPasswordResponseDto> {
  const response = await apiClient.post<{
    success: true
    data: ResetPasswordResponseDto
  }>(`${ADMIN_USERS_API_PATH}/${id}/reset-password`, payload)

  return response.data.data
}

export async function getAdminUserAuditLog(id: string): Promise<UserAdminAuditLogItemDto[]> {
  const response = await apiClient.get<{
    success: true
    data: { logs: UserAdminAuditLogItemDto[] }
  }>(`${ADMIN_USERS_API_PATH}/${id}/audit-log`)

  return response.data.data.logs
}
