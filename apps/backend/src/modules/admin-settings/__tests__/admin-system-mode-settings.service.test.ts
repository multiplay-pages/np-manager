import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockSystemSettingFindMany,
  mockSystemSettingUpsert,
  mockLogAuditEvent,
} = vi.hoisted(() => ({
  mockSystemSettingFindMany: vi.fn(),
  mockSystemSettingUpsert: vi.fn(),
  mockLogAuditEvent: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    systemSetting: {
      findMany: (...args: unknown[]) => mockSystemSettingFindMany(...args),
      upsert: (...args: unknown[]) => mockSystemSettingUpsert(...args),
    },
  },
}))

vi.mock('../../../shared/audit/audit.service', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}))

import {
  invalidateSystemCapabilitiesCache,
  resolveSystemCapabilities,
} from '../../system-capabilities/system-capabilities.service'
import {
  getSystemModeSettings,
  updateSystemModeSettings,
} from '../admin-system-mode-settings.service'

describe('admin-system-mode-settings.service', () => {
  let settingsMap: Map<string, string>

  beforeEach(() => {
    vi.clearAllMocks()
    invalidateSystemCapabilitiesCache()
    settingsMap = new Map<string, string>()
    mockLogAuditEvent.mockResolvedValue(undefined)
    mockSystemSettingFindMany.mockImplementation(
      async (args: { where: { key: { in: string[] } } }) =>
        args.where.key.in
          .filter((key) => settingsMap.has(key))
          .map((key) => ({ key, value: settingsMap.get(key) })),
    )
    mockSystemSettingUpsert.mockImplementation(
      async (args: { create: { key: string; value: string }; update: { value: string } }) => {
        settingsMap.set(args.create.key, args.update.value)
        return { key: args.create.key, value: args.update.value }
      },
    )
  })

  it('returns standalone defaults when settings are missing', async () => {
    const result = await getSystemModeSettings()

    expect(result.settings).toEqual({
      mode: 'STANDALONE',
      pliCbd: {
        enabled: false,
        endpointUrl: '',
        credentialsRef: '',
        operatorCode: '',
      },
    })
    expect(result.diagnostics).toEqual({
      configured: false,
      active: false,
      missingFields: ['endpointUrl', 'credentialsRef', 'operatorCode'],
    })
    expect(result.capabilities.pliCbd.active).toBe(false)
  })

  it('returns active diagnostics when integrated mode is fully configured', async () => {
    settingsMap = new Map<string, string>([
      ['system.mode', 'PLI_CBD_INTEGRATED'],
      ['pli_cbd.enabled', 'true'],
      ['pli_cbd.endpoint_url', 'https://pli.example.test'],
      ['pli_cbd.credentials_ref', 'secret/pli'],
      ['pli_cbd.operator_code', 'OP01'],
    ])

    const result = await getSystemModeSettings()

    expect(result.diagnostics).toEqual({
      configured: true,
      active: true,
      missingFields: [],
    })
    expect(result.capabilities).toEqual(
      expect.objectContaining({
        mode: 'PLI_CBD_INTEGRATED',
        pliCbd: expect.objectContaining({
          enabled: true,
          configured: true,
          active: true,
        }),
      }),
    )
  })

  it('updates all managed keys, audits changed values and normalizes operator code', async () => {
    settingsMap = new Map<string, string>([
      ['system.mode', 'PLI_CBD_INTEGRATED'],
      ['pli_cbd.enabled', 'true'],
      ['pli_cbd.endpoint_url', 'https://old.example.test'],
      ['pli_cbd.credentials_ref', 'old-secret'],
      ['pli_cbd.operator_code', 'OLD'],
    ])

    const result = await updateSystemModeSettings(
      {
        mode: 'STANDALONE',
        pliCbd: {
          enabled: false,
          endpointUrl: ' https://pli.example.test ',
          credentialsRef: ' secret/pli ',
          operatorCode: ' op02 ',
        },
      },
      'admin-1',
      '127.0.0.1',
      'vitest',
    )

    expect(mockSystemSettingUpsert).toHaveBeenCalledTimes(5)
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'system_setting',
        entityId: 'system.mode',
        oldValue: 'PLI_CBD_INTEGRATED',
        newValue: 'STANDALONE',
      }),
    )
    expect(result.settings).toEqual({
      mode: 'STANDALONE',
      pliCbd: {
        enabled: false,
        endpointUrl: 'https://pli.example.test',
        credentialsRef: 'secret/pli',
        operatorCode: 'OP02',
      },
    })
    expect(result.diagnostics).toEqual({
      configured: true,
      active: false,
      missingFields: [],
    })
  })

  it('allows saving incomplete integrated configuration without activating capability', async () => {
    const result = await updateSystemModeSettings(
      {
        mode: 'PLI_CBD_INTEGRATED',
        pliCbd: {
          enabled: true,
          endpointUrl: '',
          credentialsRef: 'secret/pli',
          operatorCode: 'OP01',
        },
      },
      'admin-1',
    )

    expect(result.settings.mode).toBe('PLI_CBD_INTEGRATED')
    expect(result.settings.pliCbd.enabled).toBe(true)
    expect(result.diagnostics).toEqual({
      configured: false,
      active: false,
      missingFields: ['endpointUrl'],
    })
    expect(result.capabilities.pliCbd.active).toBe(false)
  })

  it('invalidates the capabilities cache after saving settings', async () => {
    settingsMap = new Map<string, string>([
      ['system.mode', 'STANDALONE'],
      ['pli_cbd.enabled', 'false'],
    ])

    const cachedBeforeUpdate = await resolveSystemCapabilities()
    expect(cachedBeforeUpdate.mode).toBe('STANDALONE')

    await updateSystemModeSettings(
      {
        mode: 'PLI_CBD_INTEGRATED',
        pliCbd: {
          enabled: true,
          endpointUrl: 'https://pli.example.test',
          credentialsRef: 'secret/pli',
          operatorCode: 'OP01',
        },
      },
      'admin-1',
    )

    const resolvedAfterUpdate = await resolveSystemCapabilities()

    expect(resolvedAfterUpdate.mode).toBe('PLI_CBD_INTEGRATED')
    expect(resolvedAfterUpdate.pliCbd.active).toBe(true)
  })
})
