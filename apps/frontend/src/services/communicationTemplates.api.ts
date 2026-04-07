import { apiClient } from './api.client'
import type {
  CommunicationTemplateDto,
  CommunicationTemplateListResultDto,
  CommunicationTemplatePreviewRealCaseDto,
  CommunicationTemplatePreviewRealCaseRequestDto,
  CommunicationTemplateVersionDto,
  CommunicationTemplateVersionListResultDto,
  CreateCommunicationTemplateDto,
  CreateCommunicationTemplateVersionDto,
  UpdateCommunicationTemplateVersionDto,
} from '@np-manager/shared'
import { ADMIN_COMMUNICATION_TEMPLATES_API_PATH } from '@/lib/communicationTemplateAdmin'

const ADMIN_COMMUNICATION_TEMPLATE_VERSIONS_API_PATH = '/admin/communication-template-versions'

export async function getCommunicationTemplates(): Promise<CommunicationTemplateListResultDto> {
  const response = await apiClient.get<{
    success: true
    data: CommunicationTemplateListResultDto
  }>(ADMIN_COMMUNICATION_TEMPLATES_API_PATH)

  return response.data.data
}

export async function getCommunicationTemplateByCode(code: string): Promise<CommunicationTemplateDto> {
  const response = await apiClient.get<{
    success: true
    data: { template: CommunicationTemplateDto }
  }>(`${ADMIN_COMMUNICATION_TEMPLATES_API_PATH}/${code}`)

  return response.data.data.template
}

export async function getCommunicationTemplateVersions(
  code: string,
): Promise<CommunicationTemplateVersionListResultDto> {
  const response = await apiClient.get<{
    success: true
    data: CommunicationTemplateVersionListResultDto
  }>(`${ADMIN_COMMUNICATION_TEMPLATES_API_PATH}/${code}/versions`)

  return response.data.data
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

export async function createCommunicationTemplateVersion(
  code: string,
  payload: CreateCommunicationTemplateVersionDto,
): Promise<CommunicationTemplateVersionDto> {
  const response = await apiClient.post<{
    success: true
    data: { version: CommunicationTemplateVersionDto }
  }>(`${ADMIN_COMMUNICATION_TEMPLATES_API_PATH}/${code}/versions`, payload)

  return response.data.data.version
}

export async function updateCommunicationTemplateVersion(
  versionId: string,
  payload: UpdateCommunicationTemplateVersionDto,
): Promise<CommunicationTemplateVersionDto> {
  const response = await apiClient.patch<{
    success: true
    data: { version: CommunicationTemplateVersionDto }
  }>(`${ADMIN_COMMUNICATION_TEMPLATE_VERSIONS_API_PATH}/${versionId}`, payload)

  return response.data.data.version
}

export async function publishCommunicationTemplateVersion(
  versionId: string,
): Promise<CommunicationTemplateVersionDto> {
  const response = await apiClient.post<{
    success: true
    data: { version: CommunicationTemplateVersionDto }
  }>(`${ADMIN_COMMUNICATION_TEMPLATE_VERSIONS_API_PATH}/${versionId}/publish`)

  return response.data.data.version
}

export async function archiveCommunicationTemplateVersion(
  versionId: string,
): Promise<CommunicationTemplateVersionDto> {
  const response = await apiClient.post<{
    success: true
    data: { version: CommunicationTemplateVersionDto }
  }>(`${ADMIN_COMMUNICATION_TEMPLATE_VERSIONS_API_PATH}/${versionId}/archive`)

  return response.data.data.version
}

export async function cloneCommunicationTemplateVersion(
  versionId: string,
): Promise<CommunicationTemplateVersionDto> {
  const response = await apiClient.post<{
    success: true
    data: { version: CommunicationTemplateVersionDto }
  }>(`${ADMIN_COMMUNICATION_TEMPLATE_VERSIONS_API_PATH}/${versionId}/clone`)

  return response.data.data.version
}

export async function previewCommunicationTemplateVersionRealCase(
  versionId: string,
  payload: CommunicationTemplatePreviewRealCaseRequestDto,
): Promise<CommunicationTemplatePreviewRealCaseDto> {
  const response = await apiClient.post<{
    success: true
    data: { preview: CommunicationTemplatePreviewRealCaseDto }
  }>(`${ADMIN_COMMUNICATION_TEMPLATE_VERSIONS_API_PATH}/${versionId}/preview-real-case`, payload)

  return response.data.data.preview
}
