import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify'
import { CAPABILITY_ERROR_CODES, type SystemCapabilitiesDto } from '@np-manager/shared'
import { AppError } from '../../shared/errors/app-error'
import { resolveSystemCapabilities } from './system-capabilities.service'

/**
 * Capability paths obsługiwane przez gating hook.
 *
 * `pliCbd.active` — blokuje wszystkie endpointy PLI CBD łącznie (sam moduł).
 * `pliCbd.capabilities.export|sync|diagnostics|externalActions` — dla
 * przyszłego granularnego kontrolowania pod-funkcji. W 4B.1 wszystkie
 * zwracają ten sam wynik co `active`, ale rozdzielenie trzyma otwartą
 * możliwość rozszerzenia bez zmiany gating API.
 */
export type CapabilityPath =
  | 'pliCbd.active'
  | 'pliCbd.capabilities.export'
  | 'pliCbd.capabilities.sync'
  | 'pliCbd.capabilities.diagnostics'
  | 'pliCbd.capabilities.externalActions'

function readCapability(snapshot: SystemCapabilitiesDto, path: CapabilityPath): boolean {
  switch (path) {
    case 'pliCbd.active':
      return snapshot.pliCbd.active
    case 'pliCbd.capabilities.export':
      return snapshot.pliCbd.capabilities.export
    case 'pliCbd.capabilities.sync':
      return snapshot.pliCbd.capabilities.sync
    case 'pliCbd.capabilities.diagnostics':
      return snapshot.pliCbd.capabilities.diagnostics
    case 'pliCbd.capabilities.externalActions':
      return snapshot.pliCbd.capabilities.externalActions
  }
}

/**
 * Semantyka odpowiedzi:
 *   - STANDALONE lub pliCbd.enabled=false → 404 CAPABILITY_NOT_AVAILABLE
 *     (traktujemy moduł jako nieistniejący w tym trybie).
 *   - PLI_CBD_INTEGRATED + enabled, ale brak konfiguracji → 503
 *     CAPABILITY_NOT_CONFIGURED (moduł włączony, ale nie gotowy).
 *   - active=true → przepuszczamy request dalej.
 */
function buildErrorForDisabledCapability(snapshot: SystemCapabilitiesDto): AppError {
  const { mode, pliCbd } = snapshot
  if (mode === 'PLI_CBD_INTEGRATED' && pliCbd.enabled && !pliCbd.configured) {
    return new AppError(
      'Moduł PLI CBD jest włączony, ale wymaga dokończenia konfiguracji (endpoint, poświadczenia, kod operatora).',
      503,
      CAPABILITY_ERROR_CODES.CAPABILITY_NOT_CONFIGURED,
    )
  }
  return new AppError(
    'Funkcja nie jest dostępna w aktualnym trybie systemu.',
    404,
    CAPABILITY_ERROR_CODES.CAPABILITY_NOT_AVAILABLE,
  )
}

export function requireCapability(path: CapabilityPath): preHandlerHookHandler {
  return async function requireCapabilityHandler(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const snapshot = await resolveSystemCapabilities()
    if (readCapability(snapshot, path)) return

    request.log.info(
      {
        capabilityPath: path,
        mode: snapshot.mode,
        pliCbdEnabled: snapshot.pliCbd.enabled,
        pliCbdConfigured: snapshot.pliCbd.configured,
      },
      '[Capabilities] Zablokowano żądanie — moduł niedostępny w aktualnym trybie.',
    )

    throw buildErrorForDisabledCapability(snapshot)
  }
}
