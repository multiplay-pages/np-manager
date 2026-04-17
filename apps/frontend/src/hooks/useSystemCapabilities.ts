import { useEffect } from 'react'
import type { SystemCapabilitiesDto } from '@np-manager/shared'
import { useAuthStore } from '@/stores/auth.store'
import { useSystemCapabilitiesStore } from '@/stores/systemCapabilities.store'

/**
 * Fail-closed snapshot używany, gdy brak danych z backendu.
 * Wszystkie capabilities są wyłączone — sekcje gated pozostają ukryte.
 */
const FAIL_CLOSED_CAPABILITIES: SystemCapabilitiesDto = {
  mode: 'STANDALONE',
  pliCbd: {
    enabled: false,
    configured: false,
    active: false,
    capabilities: {
      export: false,
      sync: false,
      diagnostics: false,
      externalActions: false,
    },
  },
  resolvedAt: new Date(0).toISOString(),
}

interface UseSystemCapabilitiesResult {
  capabilities: SystemCapabilitiesDto
  isReady: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Hook do odczytu capabilities systemu.
 *
 * - Inicjalizuje fetch przy pierwszym uzyciu w zalogowanej sesji.
 * - Zwraca fail-closed snapshot, zanim dane dotra (isReady=false) lub
 *   gdy fetch zwrocil blad — dzieki temu sekcje gated UI pozostaja
 *   ukryte.
 * - Po wylogowaniu store jest resetowany i hook ponownie wystartuje
 *   fetch przy nastepnej sesji.
 */
export function useSystemCapabilities(): UseSystemCapabilitiesResult {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isHydrated = useAuthStore((state) => state.isHydrated)
  const token = useAuthStore((state) => state.token)
  const { capabilities, status, error, load, reset } = useSystemCapabilitiesStore()

  useEffect(() => {
    if (!isHydrated) return
    if (!isAuthenticated || !token) {
      if (status !== 'idle') reset()
      return
    }
    if (status === 'idle') {
      void load()
    }
  }, [isHydrated, isAuthenticated, token, status, load, reset])

  return {
    capabilities: capabilities ?? FAIL_CLOSED_CAPABILITIES,
    isReady: status === 'ready' && capabilities !== null,
    isLoading: status === 'loading',
    error,
  }
}
