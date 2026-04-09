/**
 * Resolver odbiorców powiadomień wewnętrznych dla spraw portowania.
 *
 * Logika:
 *  1. Jeśli sprawa ma ustawionego opiekuna handlowego (commercialOwnerUserId)
 *     i jest on aktywnym użytkownikiem systemu → powiadomienie tylko do niego.
 *  2. Fallback — brak opiekuna lub użytkownik nieaktywny → powiadomienie
 *     do wspólnych odbiorców zespołowych (e-mail z system_settings).
 *
 * Zwracany typ jest rozszerzalny: w przyszłości można dodać
 *   { kind: 'TEAMS_WEBHOOK'; webhookUrl: string }
 * lub inne kanały bez zmiany interfejsu wywołującego.
 */

import { prisma } from '../../config/database'
import { SYSTEM_SETTING_KEYS } from '@np-manager/shared'

// ============================================================
// Typy odbiorców
// ============================================================

export type NotificationRecipient =
  | { kind: 'USER'; userId: string; email: string; displayName: string }
  | { kind: 'TEAM_EMAIL'; emails: string[] }

// ============================================================
// Resolver
// ============================================================

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
    // Opiekun istnieje ale jest nieaktywny — przechodzimy do fallbacku
  }

  return resolveTeamFallbackRecipients()
}

async function resolveTeamFallbackRecipients(): Promise<NotificationRecipient[]> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: SYSTEM_SETTING_KEYS.PORTING_NOTIFY_SHARED_EMAILS },
    select: { value: true },
  })

  const emails = (setting?.value ?? '')
    .split(',')
    .map((e: string) => e.trim())
    .filter(Boolean)

  if (emails.length === 0) {
    return []
  }

  return [{ kind: 'TEAM_EMAIL', emails }]
}
