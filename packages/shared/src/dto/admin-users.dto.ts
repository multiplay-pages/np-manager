import type { UserRole } from '../constants'

export const USER_ADMIN_ACTION_TYPES = {
  USER_CREATED: 'USER_CREATED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_REACTIVATED: 'USER_REACTIVATED',
  USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
} as const

export type UserAdminActionType =
  (typeof USER_ADMIN_ACTION_TYPES)[keyof typeof USER_ADMIN_ACTION_TYPES]

export interface AdminUserListItemDto {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  forcePasswordChange: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface AdminUserDetailDto extends AdminUserListItemDto {
  passwordChangedAt: string | null
  deactivatedAt: string | null
  deactivatedByUserId: string | null
  reactivatedAt: string | null
  reactivatedByUserId: string | null
  updatedAt: string
}

export interface AdminUsersListResponseDto {
  users: AdminUserListItemDto[]
  total: number
}

export interface CreateAdminUserDto {
  email: string
  firstName: string
  lastName: string
  role: UserRole
  temporaryPassword: string
}

export interface UpdateAdminUserRoleDto {
  role: UserRole
}

export interface ResetAdminUserPasswordDto {
  temporaryPassword: string
}

export interface ResetPasswordResponseDto {
  targetUserId: string
  forcePasswordChange: boolean
  message: string
}

export interface UserAdminAuditLogItemDto {
  id: string
  targetUserId: string
  actorUserId: string
  actionType: UserAdminActionType
  previousStateJson: Record<string, unknown> | null
  nextStateJson: Record<string, unknown> | null
  reason: string | null
  createdAt: string
}
