import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_CAPABILITIES_SETTING_KEYS } from '@np-manager/shared'

const { mockSystemSettingFindMany } = vi.hoisted(() => ({
  mockSystemSettingFindMany: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    systemSetting: {
      findMany: (...args: unknown[]) => mockSystemSettingFindMany(...args),
    },
  },
}))

import {
  invalidateSystemCapabilitiesCache,
  resolveSystemCapabilities,
} from '../system-capabilities.service'

function toRows(entries: Array<[string, string]>) {
  return entries.map(([key, value]) => ({ key, value }))
}

describe('system-capabilities.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateSystemCapabilitiesCache()
  })

  it('defaults to STANDALONE when no settings present', async () => {
    mockSystemSettingFindMany.mockResolvedValueOnce([])

    const result = await resolveSystemCapabilities()

    expect(result.mode).toBe('STANDALONE')
    expect(result.pliCbd.enabled).toBe(false)
    expect(result.pliCbd.configured).toBe(false)
    expect(result.pliCbd.active).toBe(false)
    expect(result.pliCbd.capabilities).toEqual({
      export: false,
      sync: false,
      diagnostics: false,
      externalActions: false,
    })
  })

  it('returns active=true when mode INTEGRATED, enabled and fully configured', async () => {
    mockSystemSettingFindMany.mockResolvedValueOnce(
      toRows([
        [SYSTEM_CAPABILITIES_SETTING_KEYS.SYSTEM_MODE, 'PLI_CBD_INTEGRATED'],
        [SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENABLED, 'true'],
        [SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENDPOINT_URL, 'https://pli.example/soap'],
        [SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_CREDENTIALS_REF, 'vault://pli-cbd/prod'],
        [SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_OPERATOR_CODE, 'OP123'],
      ]),
    )

    const result = await resolveSystemCapabilities()

    expect(result.mode).toBe('PLI_CBD_INTEGRATED')
    expect(result.pliCbd.enabled).toBe(true)
    expect(result.pliCbd.configured).toBe(true)
    expect(result.pliCbd.active).toBe(true)
    expect(result.pliCbd.capabilities.export).toBe(true)
    expect(result.pliCbd.capabilities.externalActions).toBe(true)
  })

  it('returns configured=false when any required setting is missing', async () => {
    mockSystemSettingFindMany.mockResolvedValueOnce(
      toRows([
        [SYSTEM_CAPABILITIES_SETTING_KEYS.SYSTEM_MODE, 'PLI_CBD_INTEGRATED'],
        [SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENABLED, 'true'],
        [SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENDPOINT_URL, 'https://pli.example/soap'],
        // brak credentials_ref / operator_code
      ]),
    )

    const result = await resolveSystemCapabilities()

    expect(result.pliCbd.configured).toBe(false)
    expect(result.pliCbd.active).toBe(false)
  })

  it('STANDALONE mode keeps pliCbd inactive even if enabled and configured', async () => {
    mockSystemSettingFindMany.mockResolvedValueOnce(
      toRows([
        [SYSTEM_CAPABILITIES_SETTING_KEYS.SYSTEM_MODE, 'STANDALONE'],
        [SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENABLED, 'true'],
        [SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENDPOINT_URL, 'https://pli.example/soap'],
        [SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_CREDENTIALS_REF, 'vault://x'],
        [SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_OPERATOR_CODE, 'OP'],
      ]),
    )

    const result = await resolveSystemCapabilities()

    expect(result.mode).toBe('STANDALONE')
    expect(result.pliCbd.configured).toBe(true)
    expect(result.pliCbd.active).toBe(false)
  })

  it('falls back to STANDALONE for unknown mode values', async () => {
    mockSystemSettingFindMany.mockResolvedValueOnce(
      toRows([[SYSTEM_CAPABILITIES_SETTING_KEYS.SYSTEM_MODE, 'SOMETHING_ELSE']]),
    )

    const result = await resolveSystemCapabilities()

    expect(result.mode).toBe('STANDALONE')
  })

  it('caches subsequent calls within TTL', async () => {
    mockSystemSettingFindMany.mockResolvedValue([])

    await resolveSystemCapabilities()
    await resolveSystemCapabilities()
    await resolveSystemCapabilities()

    expect(mockSystemSettingFindMany).toHaveBeenCalledTimes(1)
  })

  it('invalidate clears cache', async () => {
    mockSystemSettingFindMany.mockResolvedValue([])

    await resolveSystemCapabilities()
    invalidateSystemCapabilitiesCache()
    await resolveSystemCapabilities()

    expect(mockSystemSettingFindMany).toHaveBeenCalledTimes(2)
  })
})
