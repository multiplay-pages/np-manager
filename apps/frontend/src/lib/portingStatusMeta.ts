import type { PortingCaseStatus } from '@np-manager/shared'

export interface PortingStatusMeta {
  label: string
  tone: 'gray' | 'blue' | 'amber' | 'green' | 'red' | 'emerald'
  className: string
}

const STATUS_META: Record<PortingCaseStatus, PortingStatusMeta> = {
  DRAFT: {
    label: 'Robocza',
    tone: 'gray',
    className: 'bg-gray-100 text-gray-600',
  },
  SUBMITTED: {
    label: 'Złożona',
    tone: 'blue',
    className: 'bg-blue-100 text-blue-700',
  },
  PENDING_DONOR: {
    label: 'Oczekuje na dawcę',
    tone: 'amber',
    className: 'bg-amber-100 text-amber-700',
  },
  CONFIRMED: {
    label: 'Potwierdzona',
    tone: 'green',
    className: 'bg-green-100 text-green-700',
  },
  REJECTED: {
    label: 'Odrzucona',
    tone: 'red',
    className: 'bg-red-100 text-red-700',
  },
  CANCELLED: {
    label: 'Anulowana',
    tone: 'gray',
    className: 'bg-gray-100 text-gray-500',
  },
  PORTED: {
    label: 'Przeniesiona',
    tone: 'emerald',
    className: 'bg-emerald-100 text-emerald-700',
  },
  ERROR: {
    label: 'Błąd',
    tone: 'red',
    className: 'bg-red-100 text-red-700',
  },
}

export function getPortingStatusMeta(status: PortingCaseStatus): PortingStatusMeta {
  return STATUS_META[status] ?? { label: status, tone: 'gray', className: 'bg-gray-100 text-gray-600' }
}
