export type NotificationFallbackReadiness = 'READY' | 'DISABLED' | 'INCOMPLETE'

export interface NotificationFallbackSettingsDto {
  fallbackEnabled: boolean
  fallbackRecipientEmail: string
  fallbackRecipientName: string
  applyToFailed: boolean
  applyToMisconfigured: boolean
  readiness: NotificationFallbackReadiness
}

export interface UpdateNotificationFallbackSettingsDto {
  fallbackEnabled: boolean
  fallbackRecipientEmail: string
  fallbackRecipientName: string
  applyToFailed: boolean
  applyToMisconfigured: boolean
}
