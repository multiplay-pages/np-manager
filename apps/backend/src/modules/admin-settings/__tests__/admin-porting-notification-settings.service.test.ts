import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_SETTING_KEYS } from '@np-manager/shared'

const {
  mockSystemSettingFindUnique,
  mockSystemSettingFindMany,
  mockSystemSettingUpsert,
  mockLogAuditEvent,
  mockResolveEmailAdapterMode,
  mockResolveSmtpConfig,
} = vi.hoisted(() => ({
  mockSystemSettingFindUnique: vi.fn(),
  mockSystemSettingFindMany: vi.fn(),
  mockSystemSettingUpsert: vi.fn(),
  mockLogAuditEvent: vi.fn(),
  mockResolveEmailAdapterMode: vi.fn(),
  mockResolveSmtpConfig: vi.fn(),
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

vi.mock('../../porting-requests/internal-notification.adapter', () => ({
  resolveEmailAdapterMode: (...args: unknown[]) => mockResolveEmailAdapterMode(...args),
  resolveSmtpConfig: (...args: unknown[]) => mockResolveSmtpConfig(...args),
}))

import {
  getPortingNotificationSettings,
  updatePortingNotificationSettings,
} from '../admin-porting-notification-settings.service'

describe('admin-porting-notification-settings.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveEmailAdapterMode.mockReturnValue('STUB')
    mockResolveSmtpConfig.mockReturnValue(null)
    mockLogAuditEvent.mockResolvedValue(undefined)
  })

  it('reads preferred settings keys when available', async () => {
    const settingsMap = new Map<string, string>([
      [SYSTEM_SETTING_KEYS.PORTING_STATUS_NOTIFY_SHARED_EMAILS, 'bok@multiplay.pl,sud@multiplay.pl'],
      [SYSTEM_SETTING_KEYS.PORTING_STATUS_TEAMS_ENABLED, 'true'],
      [SYSTEM_SETTING_KEYS.PORTING_STATUS_NOTIFY_SHARED_TEAMS_WEBHOOK, 'https://teams.example/hook'],
    ])

    mockSystemSettingFindUnique.mockImplementation(
      async (args: { where: { key: string } }) =>
        settingsMap.has(args.where.key) ? { value: settingsMap.get(args.where.key) } : null,
    )

    const result = await getPortingNotificationSettings()

    expect(result).toEqual({
      sharedEmails: 'bok@multiplay.pl,sud@multiplay.pl',
      teamsEnabled: true,
      teamsWebhookUrl: 'https://teams.example/hook',
      diagnostics: {
        emailAdapterMode: 'STUB',
        smtpConfigured: false,
      },
    })
  })

  it('falls back to legacy keys when preferred keys are missing', async () => {
    const settingsMap = new Map<string, string>([
      [SYSTEM_SETTING_KEYS.PORTING_NOTIFY_SHARED_EMAILS, 'legacy@multiplay.pl'],
      [SYSTEM_SETTING_KEYS.PORTING_NOTIFY_TEAMS_ENABLED, '1'],
      [SYSTEM_SETTING_KEYS.PORTING_NOTIFY_TEAMS_WEBHOOK, 'https://legacy.example/hook'],
    ])

    mockSystemSettingFindUnique.mockImplementation(
      async (args: { where: { key: string } }) =>
        settingsMap.has(args.where.key) ? { value: settingsMap.get(args.where.key) } : null,
    )

    const result = await getPortingNotificationSettings()

    expect(result.sharedEmails).toBe('legacy@multiplay.pl')
    expect(result.teamsEnabled).toBe(true)
    expect(result.teamsWebhookUrl).toBe('https://legacy.example/hook')
  })

  it('updates preferred keys and writes audit entries for changed values', async () => {
    const settingsMap = new Map<string, string>([
      [SYSTEM_SETTING_KEYS.PORTING_STATUS_NOTIFY_SHARED_EMAILS, 'old@multiplay.pl'],
      [SYSTEM_SETTING_KEYS.PORTING_STATUS_TEAMS_ENABLED, 'false'],
      [SYSTEM_SETTING_KEYS.PORTING_STATUS_NOTIFY_SHARED_TEAMS_WEBHOOK, ''],
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

    mockResolveEmailAdapterMode.mockReturnValue('REAL')
    mockResolveSmtpConfig.mockReturnValue({
      host: 'smtp.example.com',
      port: 587,
      user: 'user@example.com',
      pass: 'secret',
      from: 'noreply@example.com',
    })

    const result = await updatePortingNotificationSettings(
      {
        sharedEmails: 'bok@multiplay.pl,sud@multiplay.pl',
        teamsEnabled: true,
        teamsWebhookUrl: 'https://teams.example/hook',
      },
      'admin-1',
      '127.0.0.1',
      'vitest',
    )

    expect(mockSystemSettingUpsert).toHaveBeenCalledTimes(3)
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(3)
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'system_setting',
        entityId: SYSTEM_SETTING_KEYS.PORTING_STATUS_NOTIFY_SHARED_EMAILS,
        oldValue: 'old@multiplay.pl',
        newValue: 'bok@multiplay.pl,sud@multiplay.pl',
      }),
    )
    expect(result).toEqual({
      sharedEmails: 'bok@multiplay.pl,sud@multiplay.pl',
      teamsEnabled: true,
      teamsWebhookUrl: 'https://teams.example/hook',
      diagnostics: {
        emailAdapterMode: 'REAL',
        smtpConfigured: true,
      },
    })
  })
})
