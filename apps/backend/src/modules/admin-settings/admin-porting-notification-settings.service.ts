import {
  SYSTEM_SETTING_KEYS,
  type PortingNotificationSettingsDto,
  type UpdatePortingNotificationSettingsDto,
} from '@np-manager/shared'
import { prisma } from '../../config/database'
import { logAuditEvent } from '../../shared/audit/audit.service'
import {
  resolveEmailAdapterMode,
  resolveSmtpConfig,
} from '../porting-requests/internal-notification.adapter'

const PORTING_SETTINGS_KEYS = {
  sharedEmails: {
    preferred: SYSTEM_SETTING_KEYS.PORTING_STATUS_NOTIFY_SHARED_EMAILS,
    legacy: SYSTEM_SETTING_KEYS.PORTING_NOTIFY_SHARED_EMAILS,
    label:
      'Domyslni odbiorcy powiadomien statusowych portowania (e-mail, rozdzielone przecinkami)',
    type: 'string',
  },
  teamsEnabled: {
    preferred: SYSTEM_SETTING_KEYS.PORTING_STATUS_TEAMS_ENABLED,
    legacy: SYSTEM_SETTING_KEYS.PORTING_NOTIFY_TEAMS_ENABLED,
    label: 'Wlacz powiadomienia Teams dla statusowych zdarzen portowania',
    type: 'boolean',
  },
  teamsWebhookUrl: {
    preferred: SYSTEM_SETTING_KEYS.PORTING_STATUS_NOTIFY_SHARED_TEAMS_WEBHOOK,
    legacy: SYSTEM_SETTING_KEYS.PORTING_NOTIFY_TEAMS_WEBHOOK,
    label: 'URL webhooka Teams dla statusowych powiadomien portowania',
    type: 'string',
  },
} as const

export async function getPortingNotificationSettings(): Promise<PortingNotificationSettingsDto> {
  const [sharedEmails, teamsEnabledRaw, teamsWebhookUrl] = await Promise.all([
    readSettingWithLegacy(
      PORTING_SETTINGS_KEYS.sharedEmails.preferred,
      PORTING_SETTINGS_KEYS.sharedEmails.legacy,
      '',
    ),
    readSettingWithLegacy(
      PORTING_SETTINGS_KEYS.teamsEnabled.preferred,
      PORTING_SETTINGS_KEYS.teamsEnabled.legacy,
      'false',
    ),
    readSettingWithLegacy(
      PORTING_SETTINGS_KEYS.teamsWebhookUrl.preferred,
      PORTING_SETTINGS_KEYS.teamsWebhookUrl.legacy,
      '',
    ),
  ])

  return {
    sharedEmails,
    teamsEnabled: parseBooleanSetting(teamsEnabledRaw),
    teamsWebhookUrl,
    diagnostics: {
      emailAdapterMode: resolveEmailAdapterMode(),
      smtpConfigured: resolveSmtpConfig() !== null,
    },
  }
}

export async function updatePortingNotificationSettings(
  payload: UpdatePortingNotificationSettingsDto,
  actorUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<PortingNotificationSettingsDto> {
  const updates = [
    {
      key: PORTING_SETTINGS_KEYS.sharedEmails.preferred,
      value: payload.sharedEmails.trim(),
      type: PORTING_SETTINGS_KEYS.sharedEmails.type,
      label: PORTING_SETTINGS_KEYS.sharedEmails.label,
    },
    {
      key: PORTING_SETTINGS_KEYS.teamsEnabled.preferred,
      value: payload.teamsEnabled ? 'true' : 'false',
      type: PORTING_SETTINGS_KEYS.teamsEnabled.type,
      label: PORTING_SETTINGS_KEYS.teamsEnabled.label,
    },
    {
      key: PORTING_SETTINGS_KEYS.teamsWebhookUrl.preferred,
      value: payload.teamsWebhookUrl.trim(),
      type: PORTING_SETTINGS_KEYS.teamsWebhookUrl.type,
      label: PORTING_SETTINGS_KEYS.teamsWebhookUrl.label,
    },
  ]

  const currentValues = await prisma.systemSetting.findMany({
    where: { key: { in: updates.map((update) => update.key) } },
    select: { key: true, value: true },
  })

  const previousByKey = new Map(currentValues.map((setting) => [setting.key, setting.value]))

  for (const update of updates) {
    await prisma.systemSetting.upsert({
      where: { key: update.key },
      update: {
        value: update.value,
        type: update.type,
        label: update.label,
      },
      create: {
        key: update.key,
        value: update.value,
        type: update.type,
        label: update.label,
      },
    })

    const previousValue = previousByKey.get(update.key)
    if (previousValue !== update.value) {
      await logAuditEvent({
        action: 'UPDATE',
        userId: actorUserId,
        entityType: 'system_setting',
        entityId: update.key,
        fieldName: 'value',
        oldValue: previousValue ?? 'BRAK',
        newValue: update.value || 'BRAK',
        ipAddress,
        userAgent,
      })
    }
  }

  return getPortingNotificationSettings()
}

async function readSettingWithLegacy(
  preferredKey: string,
  legacyKey: string,
  fallbackValue: string,
): Promise<string> {
  const preferred = await prisma.systemSetting.findUnique({
    where: { key: preferredKey },
    select: { value: true },
  })

  if (preferred) {
    return preferred.value
  }

  const legacy = await prisma.systemSetting.findUnique({
    where: { key: legacyKey },
    select: { value: true },
  })

  if (legacy) {
    return legacy.value
  }

  return fallbackValue
}

function parseBooleanSetting(rawValue: string): boolean {
  const normalized = rawValue.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
}
