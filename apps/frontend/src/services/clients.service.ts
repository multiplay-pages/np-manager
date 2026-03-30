/**
 * Adapter eksportujący clientsService — obiektowy wrapper nad clients.api.ts.
 * Strony korzystają ze wzorca: clientsService.list(), .get(), .create(), itd.
 */
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  searchClients,
  type GetClientsParams,
  type GetClientsResult,
  type CreateClientPayload,
  type UpdateClientPayload,
} from './clients.api'

export type ClientsListParams = GetClientsParams
export type ClientsListResult = GetClientsResult

export const clientsService = {
  list: (params?: ClientsListParams) => getClients(params),
  get: (id: string) => getClientById(id),
  create: (data: CreateClientPayload) => createClient(data),
  update: (id: string, data: UpdateClientPayload) => updateClient(id, data),
  search: (q: string) => searchClients(q),
}
