import type { SystemCapabilitiesDto, SystemMode } from './system-capabilities.dto'

export type AdminSystemModeMissingField = 'endpointUrl' | 'credentialsRef' | 'operatorCode'

export interface AdminSystemModeSettingsRawDto {
  mode: SystemMode
  pliCbd: {
    enabled: boolean
    endpointUrl: string
    credentialsRef: string
    operatorCode: string
  }
}

export interface AdminSystemModeSettingsDiagnosticsDto {
  configured: boolean
  active: boolean
  missingFields: AdminSystemModeMissingField[]
}

export interface AdminSystemModeSettingsDto {
  settings: AdminSystemModeSettingsRawDto
  diagnostics: AdminSystemModeSettingsDiagnosticsDto
  capabilities: SystemCapabilitiesDto
}

export interface UpdateAdminSystemModeSettingsDto {
  mode: SystemMode
  pliCbd: {
    enabled: boolean
    endpointUrl: string
    credentialsRef: string
    operatorCode: string
  }
}
