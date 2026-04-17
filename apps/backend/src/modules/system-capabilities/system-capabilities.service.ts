import {
  SYSTEM_CAPABILITIES_SETTING_KEYS,
  SYSTEM_MODES,
  type SystemCapabilitiesDto,
  type SystemMode,
} from '@np-manager/shared'
import { prisma } from '../../config/database'

/**
 * Resolver capabilities systemu.
 *
 * Etap 4B.1 — warstwa capabilities odczytuje tryb systemu i status modułu
 * PLI CBD z tabeli SystemSetting i zwraca znormalizowany snapshot.
 * Snapshot jest cache'owany na krótki czas (domyślnie 30s), żeby odciążyć
 * bazę przy wielu żądaniach do gated endpointów.
 */

const CACHE_TTL_MS = 30_000

type CacheEntry = {
  expiresAt: number
  value: SystemCapabilitiesDto
}

let cache: CacheEntry | null = null

function parseBoolean(value: string | null | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
}

function parseMode(raw: string | null | undefined): SystemMode {
  if (!raw) return 'STANDALONE'
  const normalized = raw.trim().toUpperCase()
  return (SYSTEM_MODES as readonly string[]).includes(normalized)
    ? (normalized as SystemMode)
    : 'STANDALONE'
}

async function readSystemSettingsMap(keys: readonly string[]): Promise<Map<string, string>> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [...keys] } },
    select: { key: true, value: true },
  })
  return new Map(rows.map((row) => [row.key, row.value]))
}

export function buildSystemCapabilitiesFromSettings(
  settings: Array<{ key: string; value: string }>,
  resolvedAt = new Date(),
): SystemCapabilitiesDto {
  const values = new Map(settings.map((setting) => [setting.key, setting.value]))

  const mode = parseMode(values.get(SYSTEM_CAPABILITIES_SETTING_KEYS.SYSTEM_MODE))
  const enabled = parseBoolean(values.get(SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENABLED))
  const endpoint = values.get(SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENDPOINT_URL)?.trim() ?? ''
  const credentialsRef =
    values.get(SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_CREDENTIALS_REF)?.trim() ?? ''
  const operatorCode =
    values.get(SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_OPERATOR_CODE)?.trim() ?? ''

  const configured = endpoint.length > 0 && credentialsRef.length > 0 && operatorCode.length > 0
  const active = mode === 'PLI_CBD_INTEGRATED' && enabled && configured

  return {
    mode,
    pliCbd: {
      enabled,
      configured,
      active,
      capabilities: {
        export: active,
        sync: active,
        diagnostics: active,
        externalActions: active,
      },
    },
    resolvedAt: resolvedAt.toISOString(),
  }
}

export async function resolveSystemCapabilities(options?: {
  bypassCache?: boolean
}): Promise<SystemCapabilitiesDto> {
  if (!options?.bypassCache && cache && cache.expiresAt > Date.now()) {
    return cache.value
  }

  const values = await readSystemSettingsMap([
    SYSTEM_CAPABILITIES_SETTING_KEYS.SYSTEM_MODE,
    SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENABLED,
    SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENDPOINT_URL,
    SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_CREDENTIALS_REF,
    SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_OPERATOR_CODE,
  ])

  const value = buildSystemCapabilitiesFromSettings(
    Array.from(values, ([key, value]) => ({ key, value })),
  )

  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS }
  return value
}

/** Resetuje cache — używane w testach i po jawnej zmianie trybu. */
export function invalidateSystemCapabilitiesCache(): void {
  cache = null
}
