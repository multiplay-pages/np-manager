import { z } from 'zod'

const MAX_SHARED_EMAILS_LENGTH = 2000
const MAX_WEBHOOK_LENGTH = 2000

function isValidEmailList(value: string): boolean {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (items.length === 0) {
    return true
  }

  return items.every((email) => z.string().email().safeParse(email).success)
}

function isValidWebhookUrl(value: string): boolean {
  if (!value) {
    return true
  }

  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export const updatePortingNotificationSettingsBodySchema = z.object({
  sharedEmails: z
    .string({ required_error: 'Lista e-maili fallback jest wymagana.' })
    .max(
      MAX_SHARED_EMAILS_LENGTH,
      `Lista e-maili fallback nie moze przekraczac ${MAX_SHARED_EMAILS_LENGTH} znakow.`,
    )
    .trim()
    .refine(
      (value) => isValidEmailList(value),
      'Podaj poprawna liste adresow e-mail (rozdzielonych przecinkami).',
    ),
  teamsEnabled: z.boolean({
    required_error: 'Flaga Teams jest wymagana.',
    invalid_type_error: 'Flaga Teams musi byc wartoscia logiczna.',
  }),
  teamsWebhookUrl: z
    .string({ required_error: 'URL webhooka Teams jest wymagany.' })
    .max(
      MAX_WEBHOOK_LENGTH,
      `URL webhooka Teams nie moze przekraczac ${MAX_WEBHOOK_LENGTH} znakow.`,
    )
    .trim()
    .refine((value) => isValidWebhookUrl(value), 'Podaj poprawny URL webhooka Teams.'),
})

export type UpdatePortingNotificationSettingsBody = z.infer<
  typeof updatePortingNotificationSettingsBodySchema
>
