import { describe, expect, it } from 'vitest'
import type { SystemCapabilitiesDto } from '@np-manager/shared'
import type { PortingRequestCaseHistoryItemDto } from '@np-manager/shared'
import {
  canConfirmPortDateForStatus,
  canUseManualPortDateConfirmation,
  getErrorDiagnosticsEntry,
  getWorkflowErrorEmptyStateMessage,
  shouldShowPliCbdOperationalMeta,
} from './requestDetailCapabilities'

function buildCapabilities(
  overrides: Partial<SystemCapabilitiesDto['pliCbd']> & {
    mode?: SystemCapabilitiesDto['mode']
  } = {},
): SystemCapabilitiesDto {
  const { mode = 'STANDALONE', ...pliCbdOverrides } = overrides
  const active =
    pliCbdOverrides.active ??
    (mode === 'PLI_CBD_INTEGRATED' &&
      (pliCbdOverrides.enabled ?? false) &&
      (pliCbdOverrides.configured ?? false))

  return {
    mode,
    pliCbd: {
      enabled: false,
      configured: false,
      capabilities: {
        export: active,
        sync: active,
        diagnostics: active,
        externalActions: active,
      },
      ...pliCbdOverrides,
      active,
    },
    resolvedAt: '2026-04-17T10:00:00.000Z',
  }
}

describe('requestDetailCapabilities', () => {
  it('hides PLI CBD operational metadata in standalone and inactive integrated modes', () => {
    expect(
      shouldShowPliCbdOperationalMeta(buildCapabilities({ mode: 'STANDALONE' })),
    ).toBe(false)

    expect(
      shouldShowPliCbdOperationalMeta(
        buildCapabilities({
          mode: 'PLI_CBD_INTEGRATED',
          enabled: true,
          configured: false,
        }),
      ),
    ).toBe(false)
  })

  it('shows PLI CBD operational metadata only when the module is active', () => {
    expect(
      shouldShowPliCbdOperationalMeta(
        buildCapabilities({
          mode: 'PLI_CBD_INTEGRATED',
          enabled: true,
          configured: true,
        }),
      ),
    ).toBe(true)
  })

  it('does not suggest external actions when capability is disabled', () => {
    const manualMessage = getWorkflowErrorEmptyStateMessage(false)

    expect(manualMessage).toContain('ustalic dalszy krok')
    expect(manualMessage).not.toContain('zewnetrznych')
  })

  it('keeps external-action guidance when capability is enabled', () => {
    expect(getWorkflowErrorEmptyStateMessage(true)).toContain('akcji zewnetrznych')
  })

  it('enables manual port-date confirmation only in standalone for allowed roles', () => {
    const standalone = buildCapabilities({ mode: 'STANDALONE' })
    const integrated = buildCapabilities({
      mode: 'PLI_CBD_INTEGRATED',
      enabled: true,
      configured: true,
    })

    expect(canUseManualPortDateConfirmation(standalone, 'ADMIN')).toBe(true)
    expect(canUseManualPortDateConfirmation(standalone, 'BOK_CONSULTANT')).toBe(false)
    expect(canUseManualPortDateConfirmation(standalone, undefined)).toBe(false)
    expect(canUseManualPortDateConfirmation(integrated, 'ADMIN')).toBe(false)
  })

  it('allows manual port-date confirmation only for supported statuses', () => {
    expect(canConfirmPortDateForStatus('SUBMITTED')).toBe(true)
    expect(canConfirmPortDateForStatus('PENDING_DONOR')).toBe(true)
    expect(canConfirmPortDateForStatus('CONFIRMED')).toBe(true)
    expect(canConfirmPortDateForStatus('PORTED')).toBe(false)
    expect(canConfirmPortDateForStatus('CANCELLED')).toBe(false)
  })

  describe('getErrorDiagnosticsEntry', () => {
    function makeItem(
      overrides: Partial<PortingRequestCaseHistoryItemDto>,
    ): PortingRequestCaseHistoryItemDto {
      return {
        id: 'id-1',
        eventType: 'STATUS_CHANGED',
        timestamp: '2026-05-01T10:00:00.000Z',
        statusBefore: null,
        statusAfter: null,
        actorDisplayName: null,
        actorRole: null,
        reason: null,
        comment: null,
        metadata: null,
        ...overrides,
      }
    }

    it('returns last MARK_ERROR entry when present', () => {
      const items = [
        makeItem({ id: 'a', statusBefore: 'SUBMITTED', statusAfter: 'ERROR', timestamp: '2026-05-01T09:00:00.000Z', reason: 'Powod 1', metadata: { actionId: 'MARK_ERROR' } }),
        makeItem({ id: 'b', statusBefore: 'CONFIRMED', statusAfter: 'ERROR', timestamp: '2026-05-01T10:00:00.000Z', reason: 'Powod 2', metadata: { actionId: 'MARK_ERROR' } }),
      ]
      const result = getErrorDiagnosticsEntry(items)
      expect(result?.id).toBe('b')
      expect(result?.reason).toBe('Powod 2')
      expect(result?.statusBefore).toBe('CONFIRMED')
    })

    it('returns null when no ERROR entry exists', () => {
      const items = [
        makeItem({ statusAfter: 'SUBMITTED' }),
        makeItem({ statusAfter: 'CANCELLED' }),
      ]
      expect(getErrorDiagnosticsEntry(items)).toBeNull()
    })

    it('returns null for empty history', () => {
      expect(getErrorDiagnosticsEntry([])).toBeNull()
    })

    it('falls back to any statusAfter=ERROR entry even without metadata', () => {
      const items = [
        makeItem({ id: 'x', statusAfter: 'ERROR', reason: 'bez metadanych', metadata: null }),
      ]
      expect(getErrorDiagnosticsEntry(items)?.id).toBe('x')
    })
  })
})
