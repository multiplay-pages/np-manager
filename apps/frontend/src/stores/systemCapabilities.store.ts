import { create } from 'zustand'
import type { SystemCapabilitiesDto } from '@np-manager/shared'
import { fetchSystemCapabilities } from '@/services/systemCapabilities.api'

/**
 * Store capabilities systemu (Etap 4B.1).
 *
 * Pełni rolę single source of truth dla frontendu co do trybu systemu
 * i dostępnych modułów. Do czasu udanego fetchu lub przy błędzie
 * traktujemy sekcje gated jako WYŁĄCZONE (fail-closed) — patrz
 * useSystemCapabilities().
 */

interface SystemCapabilitiesState {
  capabilities: SystemCapabilitiesDto | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  load: () => Promise<void>
  reset: () => void
}

export const useSystemCapabilitiesStore = create<SystemCapabilitiesState>((set, get) => ({
  capabilities: null,
  status: 'idle',
  error: null,

  load: async () => {
    const current = get().status
    if (current === 'loading') return

    set({ status: 'loading', error: null })
    try {
      const data = await fetchSystemCapabilities()
      set({ capabilities: data, status: 'ready', error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udalo sie pobrac capabilities.'
      set({ capabilities: null, status: 'error', error: message })
    }
  },

  reset: () => set({ capabilities: null, status: 'idle', error: null }),
}))
