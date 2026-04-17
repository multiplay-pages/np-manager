import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_CAPABILITIES_SETTING_KEYS } from '@np-manager/shared'

const {
  mockSystemSettingFindUnique,
  mockSystemSettingCreateMany,
  mockPortingRequestCount,
  mockInvalidate,
} = vi.hoisted(() => ({
  mockSystemSettingFindUnique: vi.fn(),
  mockSystemSettingCreateMany: vi.fn(),
  mockPortingRequestCount: vi.fn(),
  mockInvalidate: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    systemSetting: {
      findUnique: (...args: unknown[]) => mockSystemSettingFindUnique(...args),
      createMany: (...args: unknown[]) => mockSystemSettingCreateMany(...args),
    },
    portingRequest: {
      count: (...args: unknown[]) => mockPortingRequestCount(...args),
    },
  },
}))

vi.mock('../system-capabilities.service', () => ({
  invalidateSystemCapabilitiesCache: () => mockInvalidate(),
}))

import { bootstrapSystemCapabilities } from '../system-capabilities.bootstrap'

describe('system-capabilities.bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSystemSettingCreateMany.mockResolvedValue({ count: 2 })
  })

  it('skips bootstrap when system.mode already exists', async () => {
    mockSystemSettingFindUnique.mockResolvedValueOnce({
      key: SYSTEM_CAPABILITIES_SETTING_KEYS.SYSTEM_MODE,
    })

    await bootstrapSystemCapabilities()

    expect(mockPortingRequestCount).not.toHaveBeenCalled()
    expect(mockSystemSettingCreateMany).not.toHaveBeenCalled()
    expect(mockInvalidate).not.toHaveBeenCalled()
  })

  it('sets PLI_CBD_INTEGRATED when porting history with pliCbdCaseId exists', async () => {
    mockSystemSettingFindUnique.mockResolvedValueOnce(null)
    mockPortingRequestCount.mockResolvedValueOnce(3)

    await bootstrapSystemCapabilities()

    expect(mockSystemSettingCreateMany).toHaveBeenCalledTimes(1)
    const call = mockSystemSettingCreateMany.mock.calls[0]![0] as {
      data: Array<{ key: string; value: string }>
      skipDuplicates: boolean
    }
    expect(call.skipDuplicates).toBe(true)
    expect(call.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: SYSTEM_CAPABILITIES_SETTING_KEYS.SYSTEM_MODE,
          value: 'PLI_CBD_INTEGRATED',
        }),
        expect.objectContaining({
          key: SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENABLED,
          value: 'true',
        }),
      ]),
    )
    expect(mockInvalidate).toHaveBeenCalled()
  })

  it('sets STANDALONE when no PLI CBD history', async () => {
    mockSystemSettingFindUnique.mockResolvedValueOnce(null)
    mockPortingRequestCount.mockResolvedValueOnce(0)

    await bootstrapSystemCapabilities()

    const call = mockSystemSettingCreateMany.mock.calls[0]![0] as {
      data: Array<{ key: string; value: string }>
    }
    expect(call.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: SYSTEM_CAPABILITIES_SETTING_KEYS.SYSTEM_MODE,
          value: 'STANDALONE',
        }),
        expect.objectContaining({
          key: SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENABLED,
          value: 'false',
        }),
      ]),
    )
  })
})
