import type { BadgeTone } from '@/components/ui'
import type { PortingCaseStatus } from '@np-manager/shared'

export interface PortingOperationalHintSnapshot {
  statusInternal: PortingCaseStatus
  confirmedPortDate: string | null | undefined
}

export interface PortingOperationalHint {
  label: string
  tone: BadgeTone
}

const TERMINAL_HINT: PortingOperationalHint = {
  label: 'Brak dalszych akcji',
  tone: 'neutral',
}

const STATUS_HINTS: Partial<Record<PortingCaseStatus, PortingOperationalHint>> = {
  DRAFT: {
    label: 'Czeka na dokumenty',
    tone: 'amber',
  },
  SUBMITTED: {
    label: 'Wymaga potwierdzenia',
    tone: 'brand',
  },
  PENDING_DONOR: {
    label: 'Wymaga potwierdzenia',
    tone: 'brand',
  },
  CONFIRMED: {
    label: 'Do kontaktu z klientem',
    tone: 'brand',
  },
  ERROR: {
    label: 'Wymaga interwencji',
    tone: 'red',
  },
  REJECTED: TERMINAL_HINT,
  CANCELLED: TERMINAL_HINT,
  PORTED: TERMINAL_HINT,
}

export function getPortingOperationalHint(
  snapshot: PortingOperationalHintSnapshot,
): PortingOperationalHint {
  const { statusInternal, confirmedPortDate } = snapshot

  if (
    (statusInternal === 'PENDING_DONOR' || statusInternal === 'CONFIRMED') &&
    !confirmedPortDate
  ) {
    return {
      label: 'Brak daty od dawcy',
      tone: 'amber',
    }
  }

  return STATUS_HINTS[statusInternal] ?? TERMINAL_HINT
}
