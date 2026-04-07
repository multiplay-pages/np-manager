import { apiClient } from './api.client'
import type {
  CommunicationTemplateDto,
  CommunicationTemplateListResultDto,
  CreateCommunicationTemplateDto,
  UpdateCommunicationTemplateDto,
} from '@np-manager/shared'
import { ADMIN_COMMUNICATION_TEMPLATES_API_PATH } from '@/lib/communicationTemplateAdmin'

export async function getCommunicationTemplates(): Promise<CommunicationTemplateListResultDto> {
  const response = await apiClient.get<{
    success: true
    data: CommunicationTemplateListResultDto
  }>(ADMIN_COMMUNICATION_TEMPLATES_API_PATH)

  return response.data.data
}

export async function getCommunicationTemplateById(id: string): Promise<CommunicationTemplateDto> {
  const response = await apiClient.get<{
    success: true
    data: { template: CommunicationTemplateDto }
  }>(`${ADMIN_COMMUNICATION_TEMPLATES_API_PATH}/${id}`)

  return response.data.data.template
}

export async function createCommunicationTemplate(
  payload: CreateCommunicationTemplateDto,
): Promise<CommunicationTemplateDto> {
  const response = await apiClient.post<{
    success: true
    data: { template: CommunicationTemplateDto }
  }>(ADMIN_COMMUNICATION_TEMPLATES_API_PATH, payload)

  return response.data.data.template
}

export async function updateCommunicationTemplate(
  id: string,
  payload: UpdateCommunicationTemplateDto,
): Promise<CommunicationTemplateDto> {
  const response = await apiClient.patch<{
    success: true
    data: { template: CommunicationTemplateDto }
  }>(`${ADMIN_COMMUNICATION_TEMPLATES_API_PATH}/${id}`, payload)

  return response.data.data.template
}

export async function activateCommunicationTemplate(id: string): Promise<CommunicationTemplateDto> {
  const response = await apiClient.post<{
    success: true
    data: { template: CommunicationTemplateDto }
  }>(`${ADMIN_COMMUNICATION_TEMPLATES_API_PATH}/${id}/activate`)

  return response.data.data.template
}

export async function deactivateCommunicationTemplate(id: string): Promise<CommunicationTemplateDto> {
  const response = await apiClient.post<{
    success: true
    data: { template: CommunicationTemplateDto }
  }>(`${ADMIN_COMMUNICATION_TEMPLATES_API_PATH}/${id}/deactivate`)

  return response.data.data.template
}
