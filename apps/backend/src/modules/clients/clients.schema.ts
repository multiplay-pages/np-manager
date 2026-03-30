import { z } from 'zod'
import { peselSchema, nipSchema, normalizePhoneNumber } from '@np-manager/shared'

// ============================================================
// POMOCNICZE SCHEMATY WIELOKROTNEGO UŻYTKU
// ============================================================

/**
 * Telefon kontaktowy klienta — akceptuje numery komórkowe i stacjonarne.
 * (Inaczej niż landlinePhoneSchema — tu chodzi o kontakt, nie o portowany numer.)
 */
const contactPhoneSchema = z
  .string({ required_error: 'Numer telefonu kontaktowego jest wymagany' })
  .min(1, 'Numer telefonu kontaktowego jest wymagany')
  .transform(normalizePhoneNumber)
  .pipe(
    z.string().regex(
      /^\+48\d{9}$/,
      'Numer telefonu musi być 9-cyfrowym polskim numerem (np. 123456789 lub +48123456789)',
    ),
  )

const zipCodeSchema = z
  .string({ required_error: 'Kod pocztowy jest wymagany' })
  .regex(/^\d{2}-\d{3}$/, 'Kod pocztowy musi być w formacie XX-XXX (np. 00-001)')

const emailSchema = z
  .string({ required_error: 'Adres e-mail jest wymagany' })
  .email('Nieprawidłowy format adresu e-mail')
  .max(200, 'E-mail nie może przekraczać 200 znaków')
  .toLowerCase()
  .trim()

/** Wspólne pola kontaktowe i adresowe — wymagane dla obu typów klientów */
const baseContactSchema = z.object({
  email: emailSchema,
  phoneContact: contactPhoneSchema,
  addressStreet: z
    .string({ required_error: 'Ulica i numer są wymagane' })
    .min(1, 'Ulica i numer są wymagane')
    .max(200)
    .trim(),
  addressCity: z
    .string({ required_error: 'Miejscowość jest wymagana' })
    .min(1, 'Miejscowość jest wymagana')
    .max(100)
    .trim(),
  addressZip: zipCodeSchema,
})

/**
 * Pola pełnomocnika — opcjonalne, współdzielone przez oba typy.
 * Puste stringi traktowane jak brak wartości (→ undefined).
 * proxyPesel walidowany pełnym algorytmem MOD11 (peselSchema).
 */
const proxyFields = {
  proxyName: z.preprocess(
    (v) => (!v || v === '' ? undefined : v),
    z.string().max(200).trim().optional(),
  ),
  proxyPesel: z.preprocess(
    (v) => (!v || v === '' ? undefined : v),
    z.optional(peselSchema),
  ),
}

// ============================================================
// SCHEMATY TWORZENIA
// ============================================================

export const createIndividualClientSchema = baseContactSchema.extend({
  clientType: z.literal('INDIVIDUAL'),
  firstName: z
    .string({ required_error: 'Imię jest wymagane' })
    .min(1, 'Imię jest wymagane')
    .max(100)
    .trim(),
  lastName: z
    .string({ required_error: 'Nazwisko jest wymagane' })
    .min(1, 'Nazwisko jest wymagane')
    .max(100)
    .trim(),
  pesel: peselSchema,
  ...proxyFields,
})

export const createBusinessClientSchema = baseContactSchema.extend({
  clientType: z.literal('BUSINESS'),
  companyName: z
    .string({ required_error: 'Nazwa firmy jest wymagana' })
    .min(1, 'Nazwa firmy jest wymagana')
    .max(200)
    .trim(),
  nip: nipSchema,
  // Puste string → undefined (pole opcjonalne)
  krs: z.preprocess(
    (v) => (!v || v === '' ? undefined : v),
    z.string().regex(/^\d{10}$/, 'KRS musi składać się z 10 cyfr').optional(),
  ),
  ...proxyFields,
})

/**
 * Discriminated union — Zod rozróżnia schemat po polu clientType.
 * nipSchema zawiera transform (normalizacja myślników) → przechowujemy znormalizowany NIP.
 */
export const createClientSchema = z.discriminatedUnion('clientType', [
  createIndividualClientSchema,
  createBusinessClientSchema,
])

export type CreateClientBody = z.infer<typeof createClientSchema>

// ============================================================
// SCHEMAT AKTUALIZACJI
// ============================================================

/**
 * Edytowalne pola klienta.
 *
 * Celowo wykluczone (immutable po utworzeniu):
 *  - clientType (nie może się zmienić)
 *  - pesel / nip (identyfikatory prawne — zmiana wymaga osobnej procedury)
 *
 * proxyName / proxyPesel / krs można wyczyścić wysyłając null.
 */
export const updateClientSchema = z.object({
  // Kontakt
  email: emailSchema.optional(),
  phoneContact: contactPhoneSchema.optional(),
  // Adres
  addressStreet: z.string().min(1).max(200).trim().optional(),
  addressCity: z.string().min(1).max(100).trim().optional(),
  addressZip: zipCodeSchema.optional(),
  // Dane INDIVIDUAL (ignorowane przez serwis jeśli klient jest BUSINESS)
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  // Dane BUSINESS (ignorowane przez serwis jeśli klient jest INDIVIDUAL)
  companyName: z.string().min(1).max(200).trim().optional(),
  // krs: null = wyczyść, string = nowa wartość, undefined = bez zmiany
  krs: z.preprocess(
    (v) => (v === '' ? null : v),
    z.string().regex(/^\d{10}$/, 'KRS musi składać się z 10 cyfr').nullable().optional(),
  ),
  // Pełnomocnik: null = wyczyść
  proxyName: z.preprocess(
    (v) => (v === '' ? null : v),
    z.string().max(200).trim().nullable().optional(),
  ),
  proxyPesel: z.preprocess(
    (v) => (v === '' ? null : v),
    z.union([peselSchema, z.null()]).optional(),
  ),
})

export type UpdateClientBody = z.infer<typeof updateClientSchema>

// ============================================================
// SCHEMATY QUERY PARAMS
// ============================================================

export const clientListQuerySchema = z.object({
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  clientType: z.enum(['INDIVIDUAL', 'BUSINESS']).optional(),
})

export type ClientListQuery = z.infer<typeof clientListQuerySchema>

export const clientSearchQuerySchema = z.object({
  q: z
    .string({ required_error: 'Parametr q jest wymagany' })
    .min(1, 'Zapytanie nie może być puste')
    .max(100),
})

export type ClientSearchQuery = z.infer<typeof clientSearchQuerySchema>
