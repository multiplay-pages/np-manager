import {
  SYSTEM_CAPABILITIES_SETTING_KEYS,
  type AdminSystemModeMissingField,
  type AdminSystemModeSettingsDto,
  type UpdateAdminSystemModeSettingsDto,
  type SystemCapabilitiesSettingKey,
  type SystemMode,
} from '@np-manager/shared'
import { prisma } from '../../config/database'
import { logAuditEvent } from '../../shared/audit/audit.service'
import {
  buildSystemCapabilitiesFromSettings,
  invalidateSystemCapabilitiesCache,
} from '../system-capabilities/system-capabilities.service'

const SYSTEM_MODE_SETTINGS_KEYS = {
  mode: {
    key: SYSTEM_CAPABILITIES_SETTING_KEYS.SYSTEM_MODE,
    label: 'Tryb pracy systemu',
    type: 'string',
  },
  pliCbdEnabled: {
    key: SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENABLED,
    label: 'Wlacz modul PLI CBD',
    type: 'boolean',
  },
  pliCbdEndpointUrl: {
    key: SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENDPOINT_URL,
    label: 'Endpoint PLI CBD',
    type: 'string',
  },
  pliCbdCredentialsRef: {
    key: SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_CREDENTIALS_REF,
    label: 'Referencja credentials PLI CBD',
    type: 'string',
  },
  pliCbdOperatorCode: {
    key: SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_OPERATOR_CODE,
    label: 'Kod operatora PLI CBD',
    type: 'string',
  },
} as const

interface SystemModeSettingRecord {
  key: string
  value: string
}

export async function getSystemModeSettings(): Promise<AdminSystemModeSettingsDto> {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: Object.values(SYSTEM_CAPABILITIES_SETTING_KEYS) } },
    select: { key: true, value: true },
  })

  return buildSystemModeSettingsDto(settings)
}

export async function updateSystemModeSettings(
  payload: UpdateAdminSystemModeSettingsDto,
  actorUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<AdminSystemModeSettingsDto> {
  const normalizedPayload: UpdateAdminSystemModeSettingsDto = {
    mode: payload.mode,
    pliCbd: {
      enabled: payload.pliCbd.enabled,
      endpointUrl: payload.pliCbd.endpointUrl.trim(),
      credentialsRef: payload.pliCbd.credentialsRef.trim(),
      operatorCode: payload.pliCbd.operatorCode.trim().toUpperCase(),
    },
  }

  const updates = [
    {
      key: SYSTEM_MODE_SETTINGS_KEYS.mode.key,
      value: normalizedPayload.mode,
      type: SYSTEM_MODE_SETTINGS_KEYS.mode.type,
      label: SYSTEM_MODE_SETTINGS_KEYS.mode.label,
    },
    {
      key: SYSTEM_MODE_SETTINGS_KEYS.pliCbdEnabled.key,
      value: normalizedPayload.pliCbd.enabled ? 'true' : 'false',
      type: SYSTEM_MODE_SETTINGS_KEYS.pliCbdEnabled.type,
      label: SYSTEM_MODE_SETTINGS_KEYS.pliCbdEnabled.label,
    },
    {
      key: SYSTEM_MODE_SETTINGS_KEYS.pliCbdEndpointUrl.key,
      value: normalizedPayload.pliCbd.endpointUrl,
      type: SYSTEM_MODE_SETTINGS_KEYS.pliCbdEndpointUrl.type,
      label: SYSTEM_MODE_SETTINGS_KEYS.pliCbdEndpointUrl.label,
    },
    {
      key: SYSTEM_MODE_SETTINGS_KEYS.pliCbdCredentialsRef.key,
      value: normalizedPayload.pliCbd.credentialsRef,
      type: SYSTEM_MODE_SETTINGS_KEYS.pliCbdCredentialsRef.type,
      label: SYSTEM_MODE_SETTINGS_KEYS.pliCbdCredentialsRef.label,
    },
    {
      key: SYSTEM_MODE_SETTINGS_KEYS.pliCbdOperatorCode.key,
      value: normalizedPayload.pliCbd.operatorCode,
      type: SYSTEM_MODE_SETTINGS_KEYS.pliCbdOperatorCode.type,
      label: SYSTEM_MODE_SETTINGS_KEYS.pliCbdOperatorCode.label,
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

  invalidateSystemCapabilitiesCache()

  return getSystemModeSettings()
}

function buildSystemModeSettingsDto(
  records: SystemModeSettingRecord[],
): AdminSystemModeSettingsDto {
  const valueByKey = new Map<SystemCapabilitiesSettingKey, string>()
  for (const record of records) {
    if (isSystemCapabilitiesSettingKey(record.key)) {
      valueByKey.set(record.key, record.value)
    }
  }

  const mode = parseSystemMode(valueByKey.get(SYSTEM_CAPABILITIES_SETTING_KEYS.SYSTEM_MODE))
  const endpointUrl = valueByKey.get(SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENDPOINT_URL) ?? ''
  const credentialsRef =
    valueByKey.get(SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_CREDENTIALS_REF) ?? ''
  const operatorCode =
    valueByKey.get(SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_OPERATOR_CODE) ?? ''

  const missingFields = getMissingPliCbdFields(endpointUrl, credentialsRef, operatorCode)
  const capabilities = buildSystemCapabilitiesFromSettings(records)

  return {
    settings: {
      mode,
      pliCbd: {
        enabled: parseBooleanSetting(
          valueByKey.get(SYSTEM_CAPABILITIES_SETTING_KEYS.PLI_CBD_ENABLED) ?? 'false',
        ),
        endpointUrl,
        credentialsRef,
        operatorCode,
      },
    },
    diagnostics: {
      configured: missingFields.length === 0,
      active: capabilities.pliCbd.active,
      missingFields,
    },
    capabilities,
  }
}

function getMissingPliCbdFields(
  endpointUrl: string,
  credentialsRef: string,
  operatorCode: string,
): AdminSystemModeMissingField[] {
  const missingFields: AdminSystemModeMissingField[] = []

  if (!endpointUrl.trim()) missingFields.push('endpointUrl')
  if (!credentialsRef.trim()) missingFields.push('credentialsRef')
  if (!operatorCode.trim()) missingFields.push('operatorCode')

  return missingFields
}

function isSystemCapabilitiesSettingKey(key: string): key is SystemCapabilitiesSettingKey {
  return Object.values<string>(SYSTEM_CAPABILITIES_SETTING_KEYS).includes(key)
}

function parseSystemMode(rawValue: string | undefined): SystemMode {
  return rawValue === 'PLI_CBD_INTEGRATED' || rawValue === 'STANDALONE' ? rawValue : 'STANDALONE'
}

function parseBooleanSetting(rawValue: string): boolean {
  const normalized = rawValue.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
}
