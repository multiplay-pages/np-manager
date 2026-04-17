import { describe, expect, it } from 'vitest'
import type { SystemCapabilitiesDto } from '@np-manager/shared'
import {
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
})
