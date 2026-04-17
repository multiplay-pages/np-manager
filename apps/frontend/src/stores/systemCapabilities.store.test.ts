import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchSystemCapabilitiesMock } = vi.hoisted(() => ({
  fetchSystemCapabilitiesMock: vi.fn(),
}))

vi.mock('@/services/systemCapabilities.api', () => ({
  fetchSystemCapabilities: (...args: unknown[]) => fetchSystemCapabilitiesMock(...args),
}))

import { useSystemCapabilitiesStore } from './systemCapabilities.store'

describe('systemCapabilities.store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSystemCapabilitiesStore.getState().reset()
  })

  it('sets capabilities snapshot without a reload or extra fetch', () => {
    useSystemCapabilitiesStore.getState().setSnapshot({
      mode: 'PLI_CBD_INTEGRATED',
      pliCbd: {
        enabled: true,
        configured: true,
        active: true,
        capabilities: {
          export: true,
          sync: true,
          diagnostics: true,
          externalActions: true,
        },
      },
      resolvedAt: '2026-04-16T10:00:00.000Z',
    })

    const state = useSystemCapabilitiesStore.getState()

    expect(state.capabilities?.mode).toBe('PLI_CBD_INTEGRATED')
    expect(state.capabilities?.pliCbd.active).toBe(true)
    expect(state.status).toBe('ready')
    expect(state.error).toBeNull()
    expect(fetchSystemCapabilitiesMock).not.toHaveBeenCalled()
  })
})
