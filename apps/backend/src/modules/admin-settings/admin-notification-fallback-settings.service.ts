import {
  SYSTEM_SETTING_KEYS,
  type NotificationFallbackSettingsDto,
  type NotificationFallbackReadiness,
  type UpdateNotificationFallbackSettingsDto,
} from '@np-manager/shared'
import { prisma } from '../../config/database'
import { logAuditEvent } from '../../shared/audit/audit.service'

const FALLBACK_SETTINGS_KEYS = {
  fallbackEnabled: {
    key: SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_ENABLED,
    label: 'Wlacz fallback notyfikacji wewnetrznych',
    type: 'boolean',
  },
  fallbackRecipientEmail: {
    key: SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_EMAIL,
    label: 'Adres email odbiorcy fallback notyfikacji wewnetrznych',
    type: 'string',
  },
  fallbackRecipientName: {
    key: SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_RECIPIENT_NAME,
    label: 'Nazwa odbiorcy fallback notyfikacji wewnetrznych',
    type: 'string',
  },
  applyToFailed: {
    key: SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_FAILED,
    label: 'Stosuj fallback dla bledow wysylki notyfikacji wewnetrznych',
    type: 'boolean',
  },
  applyToMisconfigured: {
    key: SYSTEM_SETTING_KEYS.NOTIFICATION_FALLBACK_APPLY_TO_MISCONFIGURED,
    label: 'Stosuj fallback dla bledow konfiguracji notyfikacji wewnetrznych',
    type: 'boolean',
  },
} as const

function parseBooleanSetting(rawValue: string): boolean {
  const normalized = rawValue.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
}

function computeReadiness(
  fallbackEnabled: boolean,
  fallbackRecipientEmail: string,
): NotificationFallbackReadiness {
  if (!fallbackEnabled) return 'DISABLED'
  if (!fallbackRecipientEmail.trim()) return 'INCOMPLETE'
  return 'READY'
}

async function readSetting(key: string, fallbackValue: string): Promise<string> {
  const result = await prisma.systemSetting.findUnique({
    where: { key },
    select: { value: true },
  })

  return result ? result.value : fallbackValue
}

export async function getNotificationFallbackSettings(): Promise<NotificationFallbackSettingsDto> {
  const [enabledRaw, email, name, applyToFailedRaw, applyToMisconfiguredRaw] = await Promise.all([
    readSetting(FALLBACK_SETTINGS_KEYS.fallbackEnabled.key, 'false'),
    readSetting(FALLBACK_SETTINGS_KEYS.fallbackRecipientEmail.key, ''),
    readSetting(FALLBACK_SETTINGS_KEYS.fallbackRecipientName.key, ''),
    readSetting(FALLBACK_SETTINGS_KEYS.applyToFailed.key, 'true'),
    readSetting(FALLBACK_SETTINGS_KEYS.applyToMisconfigured.key, 'true'),
  ])

  const fallbackEnabled = parseBooleanSetting(enabledRaw)
  const applyToFailed = parseBooleanSetting(applyToFailedRaw)
  const applyToMisconfigured = parseBooleanSetting(applyToMisconfiguredRaw)

  return {
    fallbackEnabled,
    fallbackRecipientEmail: email,
    fallbackRecipientName: name,
    applyToFailed,
    applyToMisconfigured,
    readiness: computeReadiness(fallbackEnabled, email),
  }
}

export async function updateNotificationFallbackSettings(
  payload: UpdateNotificationFallbackSettingsDto,
  actorUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<NotificationFallbackSettingsDto> {
  const updates = [
    {
      key: FALLBACK_SETTINGS_KEYS.fallbackEnabled.key,
      value: payload.fallbackEnabled ? 'true' : 'false',
      type: FALLBACK_SETTINGS_KEYS.fallbackEnabled.type,
      label: FALLBACK_SETTINGS_KEYS.fallbackEnabled.label,
    },
    {
      key: FALLBACK_SETTINGS_KEYS.fallbackRecipientEmail.key,
      value: payload.fallbackRecipientEmail.trim(),
      type: FALLBACK_SETTINGS_KEYS.fallbackRecipientEmail.type,
      label: FALLBACK_SETTINGS_KEYS.fallbackRecipientEmail.label,
    },
    {
      key: FALLBACK_SETTINGS_KEYS.fallbackRecipientName.key,
      value: payload.fallbackRecipientName.trim(),
      type: FALLBACK_SETTINGS_KEYS.fallbackRecipientName.type,
      label: FALLBACK_SETTINGS_KEYS.fallbackRecipientName.label,
    },
    {
      key: FALLBACK_SETTINGS_KEYS.applyToFailed.key,
      value: payload.applyToFailed ? 'true' : 'false',
      type: FALLBACK_SETTINGS_KEYS.applyToFailed.type,
      label: FALLBACK_SETTINGS_KEYS.applyToFailed.label,
    },
    {
      key: FALLBACK_SETTINGS_KEYS.applyToMisconfigured.key,
      value: payload.applyToMisconfigured ? 'true' : 'false',
      type: FALLBACK_SETTINGS_KEYS.applyToMisconfigured.type,
      label: FALLBACK_SETTINGS_KEYS.applyToMisconfigured.label,
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

  return getNotificationFallbackSettings()
}
