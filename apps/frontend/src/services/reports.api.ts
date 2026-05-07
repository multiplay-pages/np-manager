import { apiClient } from './api.client'
import type { PortingOperationalReportDto } from '@np-manager/shared'

export interface GetOperationalReportParams {
  dateFrom?: string
  dateTo?: string
}

export async function getOperationalReport(
  params: GetOperationalReportParams,
): Promise<PortingOperationalReportDto> {
  const search = new URLSearchParams()
  if (params.dateFrom) search.set('dateFrom', params.dateFrom)
  if (params.dateTo) search.set('dateTo', params.dateTo)
  const qs = search.toString()
  const response = await apiClient.get<{ data: PortingOperationalReportDto }>(
    `/porting-requests/operational-report${qs ? `?${qs}` : ''}`,
  )
  return response.data.data
}
