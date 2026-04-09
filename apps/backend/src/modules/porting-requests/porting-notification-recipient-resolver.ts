/**
 * Recipient resolver for internal porting notifications.
 *
 * Routing rules:
 * 1) active commercial owner -> USER recipient,
 * 2) otherwise fallback to configured shared team recipients
 *    (emails and optional Teams webhook).
 */

import { SYSTEM_SETTING_KEYS } from '@np-manager/shared'
import { prisma } from '../../config/database'

export type NotificationRecipient =
  | { kind: 'USER'; userId: string; email: string; displayName: string }
  | { kind: 'TEAM_EMAIL'; emails: string[] }
  | { kind: 'TEAM_WEBHOOK'; webhookUrl: string }

export async function resolvePortingNotificationRecipients(
  commercialOwnerUserId: string | null | undefined,
): Promise<NotificationRecipient[]> {
  if (commercialOwnerUserId) {
    const owner = await prisma.user.findUnique({
      where: { id: commercialOwnerUserId },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    })

    if (owner?.isActive) {
      const displayName =
        [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email

      return [{ kind: 'USER', userId: owner.id, email: owner.email, displayName }]
    }
  }

  return resolveTeamFallbackRecipients()
}

async function resolveTeamFallbackRecipients(): Promise<NotificationRecipient[]> {
  const sharedEmailsValue = await readSettingValue([
    SYSTEM_SETTING_KEYS.PORTING_STATUS_NOTIFY_SHARED_EMAILS,
    SYSTEM_SETTING_KEYS.PORTING_NOTIFY_SHARED_EMAILS,
  ])

  const teamsEnabledValue = await readSettingValue([
    SYSTEM_SETTING_KEYS.PORTING_STATUS_TEAMS_ENABLED,
    SYSTEM_SETTING_KEYS.PORTING_NOTIFY_TEAMS_ENABLED,
  ])

  const teamsWebhookValue = await readSettingValue([
    SYSTEM_SETTING_KEYS.PORTING_STATUS_NOTIFY_SHARED_TEAMS_WEBHOOK,
    SYSTEM_SETTING_KEYS.PORTING_NOTIFY_TEAMS_WEBHOOK,
  ])

  const emails = toEmailList(sharedEmailsValue)
  const teamsEnabled = parseBooleanSetting(teamsEnabledValue)
  const teamsWebhookUrl = teamsWebhookValue?.trim() || null

  const recipients: NotificationRecipient[] = []

  if (emails.length > 0) {
    recipients.push({ kind: 'TEAM_EMAIL', emails })
  }

  if (teamsEnabled && teamsWebhookUrl) {
    recipients.push({ kind: 'TEAM_WEBHOOK', webhookUrl: teamsWebhookUrl })
  }

  return recipients
}

async function readSettingValue(keys: string[]): Promise<string | null> {
  for (const key of keys) {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
      select: { value: true },
    })

    if (setting?.value) {
      return setting.value
    }
  }

  return null
}

function toEmailList(rawValue: string | null): string[] {
  if (!rawValue) {
    return []
  }

  return rawValue
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
}

function parseBooleanSetting(rawValue: string | null): boolean {
  if (!rawValue) {
    return false
  }

  const normalized = rawValue.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
}
