import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_SETTING_KEYS } from '@np-manager/shared'

const {
  mockSystemSettingFindUnique,
  mockSystemSettingFindMany,
  mockSystemSettingUpsert,
  mockLogAuditEvent,
} = vi.hoisted(() => ({
  mockSystemSettingFindUnique: vi.fn(),
  mockSystemSettingFindMany: vi.fn(),
  mockSystemSettingUpsert: vi.fn(),
  mockLogAuditEvent: vi.fn(),
}))

vi.mock('../../../config/database', () => ({
  prisma: {
    systemSetting: {
      findUnique: (...args: unknown[]) => mockSystemSettingFindUnique(...args),
      findMany: (...args: unknown[]) => mockSystemSettingFindMany(...args),
      upsert: (...args: unknown[]) => mockSystemSettingUpsert(...args),
    },
  },
}))

vi.mock('../../../shared/audit/audit.service', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}))

import {
  getNotificationFallbackSettings,
  updateNotificationFallbackSettings,
} from '../admin-notification-fallback-settings.service'

describe('admin-notification-fallback-settings.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogAuditEvent.mockResolvedValue(undefined)
  })

  describe('getNotificationFallbackSettings', () => {
    it('returns READY when enabled with valid email', async () => {
      const settingsMap = new Map<string, string>([
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_ENABLED, 'true'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_EMAIL, 'fallback@multiplay.pl'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_NAME, 'Fallback BOK'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_FAILED, 'true'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_MISCONFIGURED, 'false'],
      ])

      mockSystemSettingFindUnique.mockImplementation(
        async (args: { where: { key: string } }) =>
          settingsMap.has(args.where.key) ? { value: settingsMap.get(args.where.key) } : null,
      )

      const result = await getNotificationFallbackSettings()

      expect(result).toEqual({
        fallbackEnabled: true,
        fallbackRecipientEmail: 'fallback@multiplay.pl',
        fallbackRecipientName: 'Fallback BOK',
        applyToFailed: true,
        applyToMisconfigured: false,
        readiness: 'READY',
      })
    })

    it('returns DISABLED when fallback is not enabled', async () => {
      const settingsMap = new Map<string, string>([
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_ENABLED, 'false'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_EMAIL, 'fallback@multiplay.pl'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_NAME, ''],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_FAILED, 'true'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_MISCONFIGURED, 'true'],
      ])

      mockSystemSettingFindUnique.mockImplementation(
        async (args: { where: { key: string } }) =>
          settingsMap.has(args.where.key) ? { value: settingsMap.get(args.where.key) } : null,
      )

      const result = await getNotificationFallbackSettings()

      expect(result.readiness).toBe('DISABLED')
      expect(result.fallbackEnabled).toBe(false)
    })

    it('returns INCOMPLETE when enabled but email is empty', async () => {
      const settingsMap = new Map<string, string>([
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_ENABLED, 'true'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_EMAIL, ''],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_NAME, ''],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_FAILED, 'true'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_MISCONFIGURED, 'true'],
      ])

      mockSystemSettingFindUnique.mockImplementation(
        async (args: { where: { key: string } }) =>
          settingsMap.has(args.where.key) ? { value: settingsMap.get(args.where.key) } : null,
      )

      const result = await getNotificationFallbackSettings()

      expect(result.readiness).toBe('INCOMPLETE')
      expect(result.fallbackEnabled).toBe(true)
      expect(result.fallbackRecipientEmail).toBe('')
    })

    it('correctly maps applyToFailed and applyToMisconfigured flags', async () => {
      const settingsMap = new Map<string, string>([
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_ENABLED, 'false'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_EMAIL, ''],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_NAME, ''],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_FAILED, 'false'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_MISCONFIGURED, 'true'],
      ])

      mockSystemSettingFindUnique.mockImplementation(
        async (args: { where: { key: string } }) =>
          settingsMap.has(args.where.key) ? { value: settingsMap.get(args.where.key) } : null,
      )

      const result = await getNotificationFallbackSettings()

      expect(result.applyToFailed).toBe(false)
      expect(result.applyToMisconfigured).toBe(true)
    })

    it('returns defaults when no settings exist in database', async () => {
      mockSystemSettingFindUnique.mockResolvedValue(null)

      const result = await getNotificationFallbackSettings()

      expect(result.fallbackEnabled).toBe(false)
      expect(result.fallbackRecipientEmail).toBe('')
      expect(result.fallbackRecipientName).toBe('')
      expect(result.applyToFailed).toBe(true)
      expect(result.applyToMisconfigured).toBe(true)
      expect(result.readiness).toBe('DISABLED')
    })
  })

  describe('updateNotificationFallbackSettings', () => {
    it('upserts all 5 keys and logs audit for changed values', async () => {
      const settingsMap = new Map<string, string>([
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_ENABLED, 'false'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_EMAIL, ''],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_NAME, ''],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_FAILED, 'true'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_MISCONFIGURED, 'true'],
      ])

      mockSystemSettingFindMany.mockImplementation(
        async (_args: { where: { key: { in: string[] } } }) =>
          Array.from(settingsMap.entries()).map(([key, value]) => ({ key, value })),
      )

      mockSystemSettingUpsert.mockImplementation(
        async (args: { create: { key: string; value: string }; update: { value: string } }) => {
          settingsMap.set(args.create.key, args.update.value)
          return { key: args.create.key, value: args.update.value }
        },
      )

      mockSystemSettingFindUnique.mockImplementation(
        async (args: { where: { key: string } }) =>
          settingsMap.has(args.where.key) ? { value: settingsMap.get(args.where.key) } : null,
      )

      const result = await updateNotificationFallbackSettings(
        {
          fallbackEnabled: true,
          fallbackRecipientEmail: 'fallback@multiplay.pl',
          fallbackRecipientName: 'Fallback BOK',
          applyToFailed: true,
          applyToMisconfigured: false,
        },
        'admin-1',
        '127.0.0.1',
        'vitest',
      )

      expect(mockSystemSettingUpsert).toHaveBeenCalledTimes(5)
      // Changed: enabled false→true, email ''→'fallback@...', name ''→'Fallback BOK', misconfigured true→false
      // Unchanged: applyToFailed true→true
      expect(mockLogAuditEvent).toHaveBeenCalledTimes(4)
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'system_setting',
          entityId: SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_ENABLED,
          oldValue: 'false',
          newValue: 'true',
        }),
      )
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'system_setting',
          entityId: SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_EMAIL,
          oldValue: '',
          newValue: 'fallback@multiplay.pl',
        }),
      )
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'system_setting',
          entityId: SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_NAME,
          oldValue: '',
          newValue: 'Fallback BOK',
        }),
      )
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'system_setting',
          entityId: SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_MISCONFIGURED,
          oldValue: 'true',
          newValue: 'false',
        }),
      )
      expect(result.readiness).toBe('READY')
      expect(result.fallbackEnabled).toBe(true)
      expect(result.fallbackRecipientEmail).toBe('fallback@multiplay.pl')
    })

    it('does not log audit for unchanged values', async () => {
      const settingsMap = new Map<string, string>([
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_ENABLED, 'true'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_EMAIL, 'fallback@multiplay.pl'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_NAME, 'Fallback BOK'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_FAILED, 'true'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_MISCONFIGURED, 'true'],
      ])

      mockSystemSettingFindMany.mockImplementation(
        async (_args: { where: { key: { in: string[] } } }) =>
          Array.from(settingsMap.entries()).map(([key, value]) => ({ key, value })),
      )

      mockSystemSettingUpsert.mockImplementation(
        async (args: { create: { key: string; value: string }; update: { value: string } }) => {
          settingsMap.set(args.create.key, args.update.value)
          return { key: args.create.key, value: args.update.value }
        },
      )

      mockSystemSettingFindUnique.mockImplementation(
        async (args: { where: { key: string } }) =>
          settingsMap.has(args.where.key) ? { value: settingsMap.get(args.where.key) } : null,
      )

      await updateNotificationFallbackSettings(
        {
          fallbackEnabled: true,
          fallbackRecipientEmail: 'fallback@multiplay.pl',
          fallbackRecipientName: 'Fallback BOK',
          applyToFailed: true,
          applyToMisconfigured: true,
        },
        'admin-1',
        '127.0.0.1',
        'vitest',
      )

      expect(mockSystemSettingUpsert).toHaveBeenCalledTimes(5)
      expect(mockLogAuditEvent).not.toHaveBeenCalled()
    })

    it('returns final DTO with computed readiness', async () => {
      mockSystemSettingFindMany.mockResolvedValue([])

      mockSystemSettingUpsert.mockImplementation(
        async (args: { create: { key: string; value: string } }) => {
          return { key: args.create.key, value: args.create.value }
        },
      )

      const settingsAfterUpdate = new Map<string, string>([
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_ENABLED, 'false'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_EMAIL, ''],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_NAME, ''],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_FAILED, 'true'],
        [SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_MISCONFIGURED, 'false'],
      ])

      mockSystemSettingFindUnique.mockImplementation(
        async (args: { where: { key: string } }) =>
          settingsAfterUpdate.has(args.where.key)
            ? { value: settingsAfterUpdate.get(args.where.key) }
            : null,
      )

      const result = await updateNotificationFallbackSettings(
        {
          fallbackEnabled: false,
          fallbackRecipientEmail: '',
          fallbackRecipientName: '',
          applyToFailed: true,
          applyToMisconfigured: false,
        },
        'admin-1',
      )

      expect(result.readiness).toBe('DISABLED')
      expect(result.fallbackEnabled).toBe(false)
    })
  })
})
