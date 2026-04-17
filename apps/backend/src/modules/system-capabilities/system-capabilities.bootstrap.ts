import {
  SYSTEM_CAPABILITIES_SETTING_KEYS,
  type SystemMode,
} from '@np-manager/shared'
import type { FastifyBaseLogger } from 'fastify'
import { prisma } from '../../config/database'
import { invalidateSystemCapabilitiesCache } from './system-capabilities.service'

/**
 * Bootstrap trybu systemu.
 *
 * Wywoływany raz przy starcie procesu backendu. Jeśli klucz `system.mode`
 * nie jest jeszcze zapisany w SystemSetting, heurystyka wyznacza domyślny
 * tryb:
 *   - jeśli istnieje choć jedna PortingRequest z wypełnionym pliCbdCaseId
 *     → środowisko istniejące, ustawiamy PLI_CBD_INTEGRATED + enabled=true
 *     (zachowana kompatybilność wsteczna),
 *   - w przeciwnym razie → STANDALONE + enabled=false (nowy deploy).
 *
 * Idempotentny — przy istniejącym kluczu `system.mode` nie robi nic.
 * Nie nadpisuje ustawień operatora.
 */
export async function bootstrapSystemCapabilities(logger?: FastifyBaseLogger): Promise<void> {
  const existing = await prisma.systemSetting.findUnique({
    where: { key: SYSTEM_CAPABILITIES_SETTING_KEYS.SYSTEM_MODE },
    select: { key: true },
  })

  if (existing) {
    logger?.info?.(
      { key: SYSTEM_CAPABILITIES_SETTING_KEYS.SYSTEM_MODE },
      '[Capabilities] Tryb systemu juz ustawiony — pomijam bootstrap.',
    )
    return
  }

  const hasPliCbdHistory = await detectPliCbdHistory()

  const mode: SystemMode = hasPliCbdHistory ? 'PLI_CBD_INTEGRATED' : 'STANDALONE'
  const enabled = hasPliCbdHistory

  await prisma.systemSetting.createMany({
    data: [
      {
        key: SYSTEM_CAPABILITIES_SETTING_KEYS.SYSTEM_MODE,
        value: mode,
        type: 'string',
        label: 'Tryb pracy systemu (STANDALONE / PLI_CBD_INTEGRATED)',
      },
      {
        key: SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENABLED,
        value: enabled ? 'true' : 'false',
        type: 'boolean',
        label: 'Czy moduł PLI CBD jest aktywny (miękki przełącznik)',
      },
    ],
    skipDuplicates: true,
  })

  invalidateSystemCapabilitiesCache()

  if (hasPliCbdHistory) {
    logger?.info?.(
      { mode, enabled },
      '[Capabilities] Wykryto środowisko z historią PLI CBD — ustawiono tryb PLI_CBD_INTEGRATED.',
    )
  } else {
    logger?.info?.(
      { mode, enabled },
      '[Capabilities] Wykryto środowisko bez historii PLI CBD — ustawiono tryb STANDALONE.',
    )
  }
}

async function detectPliCbdHistory(): Promise<boolean> {
  const count = await prisma.portingRequest.count({
    where: { pliCbdCaseId: { not: null } },
  })
  return count > 0
}
