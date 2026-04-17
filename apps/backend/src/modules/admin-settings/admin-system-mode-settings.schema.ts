import { SYSTEM_MODES } from '@np-manager/shared'
import { z } from 'zod'

const MAX_ENDPOINT_URL_LENGTH = 2000
const MAX_CREDENTIALS_REF_LENGTH = 500
const MAX_OPERATOR_CODE_LENGTH = 100

function isValidOptionalUrl(value: string): boolean {
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

export const updateSystemModeSettingsBodySchema = z.object({
  mode: z.enum(SYSTEM_MODES, {
    required_error: 'Tryb systemu jest wymagany.',
    invalid_type_error: 'Tryb systemu ma nieprawidlowa wartosc.',
  }),
  pliCbd: z.object({
    enabled: z.boolean({
      required_error: 'Flaga wlaczenia PLI CBD jest wymagana.',
      invalid_type_error: 'Flaga wlaczenia PLI CBD musi byc wartoscia logiczna.',
    }),
    endpointUrl: z
      .string({ required_error: 'Endpoint PLI CBD jest wymagany.' })
      .max(
        MAX_ENDPOINT_URL_LENGTH,
        `Endpoint PLI CBD nie moze przekraczac ${MAX_ENDPOINT_URL_LENGTH} znakow.`,
      )
      .transform((value) => value.trim())
      .refine((value) => isValidOptionalUrl(value), 'Podaj poprawny URL endpointu PLI CBD.'),
    credentialsRef: z
      .string({ required_error: 'Referencja credentials PLI CBD jest wymagana.' })
      .max(
        MAX_CREDENTIALS_REF_LENGTH,
        `Referencja credentials PLI CBD nie moze przekraczac ${MAX_CREDENTIALS_REF_LENGTH} znakow.`,
      )
      .transform((value) => value.trim()),
    operatorCode: z
      .string({ required_error: 'Kod operatora PLI CBD jest wymagany.' })
      .max(
        MAX_OPERATOR_CODE_LENGTH,
        `Kod operatora PLI CBD nie moze przekraczac ${MAX_OPERATOR_CODE_LENGTH} znakow.`,
      )
      .transform((value) => value.trim().toUpperCase()),
  }),
})

export type UpdateSystemModeSettingsBody = z.infer<typeof updateSystemModeSettingsBodySchema>
