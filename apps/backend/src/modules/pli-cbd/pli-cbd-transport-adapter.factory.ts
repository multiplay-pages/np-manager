import type { PliCbdTransportMode } from '@np-manager/shared'
import { env } from '../../config/env'
import {
  getPliCbdRealSoapConfig,
  type PliCbdRealSoapConfig,
} from '../../config/pli-cbd-real-soap.config'
import type { PliCbdTransportAdapter } from './pli-cbd-transport.adapter'
import {
  PliCbdRealSoapPlaceholderAdapter,
  PliCbdTransportDisabledAdapter,
  PliCbdTransportStubAdapter,
} from './pli-cbd-transport.adapter'

export function resolveTransportAdapter(
  mode: PliCbdTransportMode,
  realSoapConfig?: PliCbdRealSoapConfig,
): PliCbdTransportAdapter {
  switch (mode) {
    case 'DISABLED':
      return new PliCbdTransportDisabledAdapter()
    case 'STUB':
      return new PliCbdTransportStubAdapter()
    case 'REAL_SOAP':
      if (!realSoapConfig) {
        throw new Error(
          'Transport REAL_SOAP wymaga przygotowanego bundle pliCbdRealSoapConfig.',
        )
      }

      return new PliCbdRealSoapPlaceholderAdapter(realSoapConfig)
  }
}

export function getActiveTransportMode(): PliCbdTransportMode {
  return env.PLI_CBD_TRANSPORT_MODE
}

export function getActiveTransportAdapter(): PliCbdTransportAdapter {
  const mode = getActiveTransportMode()

  if (mode === 'REAL_SOAP') {
    const pliCbdRealSoapConfig = getPliCbdRealSoapConfig()
    return resolveTransportAdapter(mode, pliCbdRealSoapConfig)
  }

  return resolveTransportAdapter(mode)
}
