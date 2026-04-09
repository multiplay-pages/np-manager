export interface PortingNotificationSettingsDiagnosticsDto {
  emailAdapterMode: 'REAL' | 'STUB' | 'DISABLED'
  smtpConfigured: boolean
}

export interface PortingNotificationSettingsDto {
  sharedEmails: string
  teamsEnabled: boolean
  teamsWebhookUrl: string
  diagnostics: PortingNotificationSettingsDiagnosticsDto
}

export interface UpdatePortingNotificationSettingsDto {
  sharedEmails: string
  teamsEnabled: boolean
  teamsWebhookUrl: string
}
