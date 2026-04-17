import type { SystemCapabilitiesDto } from '@np-manager/shared'
import { apiClient } from './api.client'

interface CapabilitiesResponse {
  success: boolean
  data: SystemCapabilitiesDto
}

/**
 * Pobiera snapshot capabilities systemu.
 * Endpoint wymaga autoryzacji — nie wołaj przed zalogowaniem.
 */
export async function fetchSystemCapabilities(): Promise<SystemCapabilitiesDto> {
  const response = await apiClient.get<CapabilitiesResponse>('/system/capabilities')
  return response.data.data
}
