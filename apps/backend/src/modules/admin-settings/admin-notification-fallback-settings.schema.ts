import { z } from 'zod'

const MAX_EMAIL_LENGTH = 320
const MAX_NAME_LENGTH = 200

export const updateNotificationFallbackSettingsBodySchema = z
  .object({
    fallbackEnabled: z.boolean({
      required_error: 'Flaga wlaczenia fallbacku jest wymagana.',
      invalid_type_error: 'Flaga wlaczenia fallbacku musi byc wartoscia logiczna.',
    }),
    fallbackRecipientEmail: z
      .string({ required_error: 'Adres email odbiorcy fallback jest wymagany.' })
      .max(MAX_EMAIL_LENGTH, `Adres email nie moze przekraczac ${MAX_EMAIL_LENGTH} znakow.`)
      .trim()
      .refine(
        (value) => {
          if (!value) return true
          return z.string().email().safeParse(value).success
        },
        'Podaj poprawny adres e-mail.',
      ),
    fallbackRecipientName: z
      .string({ required_error: 'Nazwa odbiorcy fallback jest wymagana.' })
      .max(MAX_NAME_LENGTH, `Nazwa odbiorcy fallback nie moze przekraczac ${MAX_NAME_LENGTH} znakow.`)
      .trim(),
    applyToFailed: z.boolean({
      required_error: 'Flaga applyToFailed jest wymagana.',
      invalid_type_error: 'Flaga applyToFailed musi byc wartoscia logiczna.',
    }),
    applyToMisconfigured: z.boolean({
      required_error: 'Flaga applyToMisconfigured jest wymagana.',
      invalid_type_error: 'Flaga applyToMisconfigured musi byc wartoscia logiczna.',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.fallbackEnabled && !data.fallbackRecipientEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Adres email odbiorcy fallback jest wymagany gdy fallback jest wlaczony.',
        path: ['fallbackRecipientEmail'],
      })
    }
  })

export type UpdateNotificationFallbackSettingsBody = z.infer<
  typeof updateNotificationFallbackSettingsBodySchema
>
