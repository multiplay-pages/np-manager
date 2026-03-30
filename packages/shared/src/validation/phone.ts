import { z } from 'zod'

/**
 * Prefiksy numerów geograficznych (stacjonarnych) w Polsce.
 * Pierwsze dwie cyfry numeru 9-cyfrowego (po +48).
 *
 * Źródło: Plan numeracji UKE, zakres numerów geograficznych.
 */
const GEOGRAPHIC_PREFIXES = new Set([
  // Małopolskie, Podkarpackie
  '12', '13', '14', '15', '16', '17', '18',
  // Mazowieckie
  '22', '23', '24', '25', '29',
  // Śląskie
  '32', '33', '34',
  // Świętokrzyskie, Łódzkie
  '41', '42', '43', '44', '46', '48',
  // Kujawsko-Pomorskie, Pomorskie, Warmińsko-Mazurskie
  '52', '54', '55', '56', '58', '59',
  // Wielkopolskie, Lubuskie
  '61', '62', '63', '65', '67', '68',
  // Dolnośląskie
  '71', '74', '75', '76', '77',
  // Opolskie, Lubelskie, Podlaskie
  '81', '82', '83', '84', '85', '86', '87', '89',
  // Zachodniopomorskie
  '91', '94', '95',
])

/**
 * Prefiksy numerów niegeograficznych (ogólnopolskich).
 * 800 = bezpłatne, 801 = dzielona opłata, 804 = premium.
 */
const NON_GEOGRAPHIC_PREFIXES = new Set(['800', '801', '802', '803', '804'])

/**
 * Prefiksy numerów komórkowych — blokowane w tym systemie.
 * System obsługuje wyłącznie numery stacjonarne.
 */
const MOBILE_PREFIXES = new Set([
  '45', '50', '51', '53', '57',
  '60', '66', '69',
  '72', '73', '78', '79',
  '88',
])

/**
 * Normalizuje numer telefonu do formatu E.164 (+48XXXXXXXXX).
 * Przykłady:
 *   "022 123 45 67"  → "+4822123456 7"
 *   "12 345 67 89"   → "+48123456789"
 *   "+48123456789"   → "+48123456789"
 *   "0048123456789"  → "+48123456789"
 */
export function normalizePhoneNumber(phone: string): string {
  // Usuń wszystkie spacje, myślniki, nawiasy
  let cleaned = phone.replace(/[\s\-().]/g, '')

  // Zamień 0048 na +48
  if (cleaned.startsWith('0048')) {
    cleaned = '+48' + cleaned.slice(4)
  }

  // Dodaj +48 jeśli brakuje prefiksu
  if (!cleaned.startsWith('+')) {
    // Usuń wiodące 0 (stary format krajowy)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1)
    }
    cleaned = '+48' + cleaned
  }

  return cleaned
}

/**
 * Sprawdza typ numeru na podstawie prefiksu.
 */
export function getPhoneNumberType(
  normalizedPhone: string,
): 'geographic' | 'non_geographic' | 'mobile' | 'unknown' {
  if (!normalizedPhone.startsWith('+48')) return 'unknown'

  const localNumber = normalizedPhone.slice(3) // 9 cyfr po +48

  if (localNumber.length !== 9) return 'unknown'

  const prefix2 = localNumber.slice(0, 2)
  const prefix3 = localNumber.slice(0, 3)

  if (MOBILE_PREFIXES.has(prefix2)) return 'mobile'
  if (NON_GEOGRAPHIC_PREFIXES.has(prefix3)) return 'non_geographic'
  if (GEOGRAPHIC_PREFIXES.has(prefix2)) return 'geographic'

  return 'unknown'
}

/**
 * Zod schema do walidacji numeru stacjonarnego PL.
 * Akceptuje różne formaty wejściowe, normalizuje do E.164.
 * Blokuje numery komórkowe.
 */
export const landlinePhoneSchema = z
  .string()
  .min(1, 'Numer telefonu jest wymagany')
  .transform(normalizePhoneNumber)
  .pipe(
    z
      .string()
      .regex(/^\+48\d{9}$/, 'Numer musi mieć format +48XXXXXXXXX (9 cyfr po +48)')
      .refine((phone) => {
        const type = getPhoneNumberType(phone)
        return type !== 'mobile'
      }, 'Podany numer jest numerem komórkowym. System obsługuje wyłącznie numery stacjonarne.')
      .refine((phone) => {
        const type = getPhoneNumberType(phone)
        return type === 'geographic' || type === 'non_geographic'
      }, 'Numer nie należy do żadnego rozpoznanego zakresu numerów stacjonarnych PL.'),
  )

/**
 * Programmatyczna walidacja numeru stacjonarnego.
 */
export function validateLandlinePhone(phone: string): {
  valid: boolean
  normalizedNumber?: string
  type?: 'geographic' | 'non_geographic'
  error?: string
} {
  const result = landlinePhoneSchema.safeParse(phone)

  if (result.success) {
    const type = getPhoneNumberType(result.data)
    return {
      valid: true,
      normalizedNumber: result.data,
      type: type as 'geographic' | 'non_geographic',
    }
  }

  const firstError = result.error.issues[0]
  return {
    valid: false,
    error: firstError?.message ?? 'Nieprawidłowy numer telefonu',
  }
}
