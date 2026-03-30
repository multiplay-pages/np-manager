import { apiClient } from './api.client'
import type { ClientDetailDto, ClientListItemDto, ClientSearchItemDto } from '@np-manager/shared'

export interface GetClientsParams {
  search?: string
  page?: number
  pageSize?: number
  clientType?: 'INDIVIDUAL' | 'BUSINESS'
}

export interface GetClientsResult {
  items: ClientListItemDto[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

interface BaseClientPayload {
  email: string
  phoneContact: string
  addressStreet: string
  addressCity: string
  addressZip: string
  proxyName?: string
  proxyPesel?: string
}

export type CreateClientPayload =
  | (BaseClientPayload & {
      clientType: 'INDIVIDUAL'
      firstName: string
      lastName: string
      pesel: string
    })
  | (BaseClientPayload & {
      clientType: 'BUSINESS'
      companyName: string
      nip: string
      krs?: string
    })

export interface UpdateClientPayload {
  email?: string
  phoneContact?: string
  addressStreet?: string
  addressCity?: string
  addressZip?: string
  proxyName?: string | null
  proxyPesel?: string | null
  firstName?: string
  lastName?: string
  companyName?: string
  krs?: string | null
}

export async function getClients(
  params: GetClientsParams = {},
): Promise<GetClientsResult> {
  const query = new URLSearchParams()

  if (params.search) query.set('search', params.search)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.clientType) query.set('clientType', params.clientType)

  const suffix = query.toString()
  const response = await apiClient.get<{ success: true; data: GetClientsResult }>(
    suffix ? `/clients?${suffix}` : '/clients',
  )

  return response.data.data
}

export async function getClientById(id: string): Promise<ClientDetailDto> {
  const response = await apiClient.get<{
    success: true
    data: { client: ClientDetailDto }
  }>(`/clients/${id}`)

  return response.data.data.client
}

export async function createClient(
  data: CreateClientPayload,
): Promise<ClientDetailDto> {
  const response = await apiClient.post<{
    success: true
    data: { client: ClientDetailDto }
  }>('/clients', data)

  return response.data.data.client
}

export async function updateClient(
  id: string,
  data: UpdateClientPayload,
): Promise<ClientDetailDto> {
  const response = await apiClient.patch<{
    success: true
    data: { client: ClientDetailDto }
  }>(`/clients/${id}`, data)

  return response.data.data.client
}

export async function searchClients(q: string): Promise<ClientSearchItemDto[]> {
  const response = await apiClient.get<{
    success: true
    data: { items: ClientSearchItemDto[] }
  }>(`/clients/search?q=${encodeURIComponent(q)}`)

  return response.data.data.items
}
