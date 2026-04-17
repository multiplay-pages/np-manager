import type { SystemCapabilitiesDto } from '@np-manager/shared'

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
