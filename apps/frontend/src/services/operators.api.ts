import { apiClient } from './api.client'
import type { OperatorDto, CreateOperatorDto } from '@np-manager/shared'

export type { OperatorDto, CreateOperatorDto }

// ============================================================
// GET /api/operators
// ============================================================

export async function getOperators(includeInactive = false): Promise<OperatorDto[]> {
  const url = includeInactive ? '/operators?includeInactive=true' : '/operators'
  const res = await apiClient.get<{ success: true; data: { operators: OperatorDto[] } }>(url)
  return res.data.data.operators
}

// ============================================================
// POST /api/operators  (tylko ADMIN)
// ============================================================

export async function createOperator(data: CreateOperatorDto): Promise<OperatorDto> {
  const res = await apiClient.post<{ success: true; data: { operator: OperatorDto } }>(
    '/operators',
    data,
  )
  return res.data.data.operator
}
