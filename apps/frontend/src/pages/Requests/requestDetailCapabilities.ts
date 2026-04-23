import type { PortingCaseStatus, SystemCapabilitiesDto, UserRole } from '@np-manager/shared'

const MANUAL_PORT_DATE_CONFIRMATION_ROLES: UserRole[] = ['ADMIN', 'BACK_OFFICE', 'MANAGER']
const MANUAL_PORT_DATE_CONFIRMATION_STATUSES: PortingCaseStatus[] = [
  'SUBMITTED',
  'PENDING_DONOR',
  'CONFIRMED',
]

export function shouldShowPliCbdOperationalMeta(
  capabilities: SystemCapabilitiesDto,
): boolean {
  return capabilities.pliCbd.active
}

export function getWorkflowErrorEmptyStateMessage(
  canUsePliCbdExternalActions: boolean,
): string {
  if (canUsePliCbdExternalActions) {
    return 'Sprawa w stanie bledu - skontaktuj sie z przelozonym lub skorzystaj z akcji zewnetrznych ponizej.'
  }

  return 'Sprawa w stanie bledu - skontaktuj sie z przelozonym, aby ustalic dalszy krok.'
}

export function canUseManualPortDateConfirmation(
  capabilities: SystemCapabilitiesDto,
  role: UserRole | null | undefined,
): boolean {
  if (capabilities.mode !== 'STANDALONE') {
    return false
  }

  if (!role) {
    return false
  }

  return MANUAL_PORT_DATE_CONFIRMATION_ROLES.includes(role)
}

export function canConfirmPortDateForStatus(status: PortingCaseStatus): boolean {
  return MANUAL_PORT_DATE_CONFIRMATION_STATUSES.includes(status)
}
