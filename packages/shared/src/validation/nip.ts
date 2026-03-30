import { z } from 'zod'

/**
 * Walidacja sumy kontrolnej NIP.
 *
 * Algorytm: cyfry 1–9 mnożone przez wagi [6,5,7,2,3,4,5,6,7].
 * Suma iloczynów modulo 11.
 * Wynik == 10 → NIP nieprawidłowy.
 * Wynik musi równać się 10. cyfrze (cyfra kontrolna).
 */
function validateNipChecksum(nip: string): boolean {
  if (nip.length !== 10) return false

  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  const digits = nip.split('').map(Number)

  if (digits.some(isNaN)) return false

  const sum = weights.reduce((acc, weight, i) => {
    const digit = digits[i]
    return acc + weight * (digit ?? 0)
  }, 0)

  const checkDigit = sum % 11
  if (checkDigit === 10) return false

  return checkDigit === digits[9]
}

/**
 * Normalizuje NIP — usuwa myślniki i spacje.
 * Przykład: "123-456-78-90" → "1234567890"
 */
export function normalizeNip(nip: string): string {
  return nip.replace(/[-\s]/g, '')
}

/**
 * Zod schema do walidacji NIP.
 * Akceptuje format z myślnikami lub bez, weryfikuje sumę kontrolną.
 */
export const nipSchema = z
  .string()
  .min(1, 'NIP jest wymagany')
  .transform(normalizeNip)
  .pipe(
    z
      .string()
      .regex(/^\d{10}$/, 'NIP musi składać się z 10 cyfr')
      .refine(validateNipChecksum, 'Nieprawidłowy NIP — błędna cyfra kontrolna'),
  )

/**
 * Programmatyczna walidacja NIP (poza schematem Zod).
 */
export function validateNip(nip: string): { valid: boolean; error?: string } {
  const result = nipSchema.safeParse(nip)
  if (result.success) return { valid: true }

  const firstError = result.error.issues[0]
  return {
    valid: false,
    error: firstError?.message ?? 'Nieprawidłowy NIP',
  }
}
