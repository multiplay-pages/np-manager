import { z } from 'zod'

/**
 * Walidacja sumy kontrolnej PESEL.
 *
 * Algorytm: każda cyfra mnożona przez wagę [1,3,7,9,1,3,7,9,1,3].
 * Suma ostatniej cyfry każdego iloczynu modulo 10.
 * Wynik: (10 - suma % 10) % 10 musi równać się 11. cyfrze.
 */
function validatePeselChecksum(pesel: string): boolean {
  if (pesel.length !== 11) return false

  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]
  const digits = pesel.split('').map(Number)

  if (digits.some(isNaN)) return false

  const sum = weights.reduce((acc, weight, i) => {
    const digit = digits[i]
    return acc + weight * (digit ?? 0)
  }, 0)

  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === digits[10]
}

/**
 * Zod schema do walidacji PESEL.
 * Weryfikuje format (11 cyfr) i sumę kontrolną.
 */
export const peselSchema = z
  .string()
  .min(1, 'PESEL jest wymagany')
  .regex(/^\d{11}$/, 'PESEL musi składać się z dokładnie 11 cyfr')
  .refine(validatePeselChecksum, 'Nieprawidłowy numer PESEL — błędna cyfra kontrolna')

/**
 * Programmatyczna walidacja PESEL (poza schematem Zod).
 * Zwraca obiekt z wynikiem i komunikatem błędu.
 */
export function validatePesel(pesel: string): { valid: boolean; error?: string } {
  const result = peselSchema.safeParse(pesel)
  if (result.success) return { valid: true }

  const firstError = result.error.issues[0]
  return {
    valid: false,
    error: firstError?.message ?? 'Nieprawidłowy PESEL',
  }
}
