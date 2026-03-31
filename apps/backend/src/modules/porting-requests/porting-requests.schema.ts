import { z } from 'zod'
import { landlinePhoneSchema } from '@np-manager/shared'

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_REGEX.test(value)) return false
  const date = new Date(`${value}T12:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isWeekend(value: string): boolean {
  const day = new Date(`${value}T12:00:00.000Z`).getUTCDay()
  return day === 0 || day === 6
}

function todayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const dateOnlySchema = z
  .string({ required_error: 'Data jest wymagana' })
  .refine(isValidDateOnly, 'Data musi mieć format RRRR-MM-DD')

const optionalDateOnlySchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  dateOnlySchema.optional(),
)

const optionalTimeSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z
    .string()
    .regex(TIME_REGEX, 'Godzina musi mieć format HH:mm')
    .optional(),
)

const optionalUuidSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.string().uuid().optional(),
)

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().max(max).trim().optional(),
  )

const statusEnum = z.enum([
  'DRAFT',
  'SUBMITTED',
  'PENDING_DONOR',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'PORTED',
  'ERROR',
])

export const createPortingRequestSchema = z
  .object({
    clientId: z.string({ required_error: 'Klient jest wymagany' }).uuid('Nieprawidłowy identyfikator klienta'),
    donorOperatorId: z
      .string({ required_error: 'Operator oddający jest wymagany' })
      .uuid('Nieprawidłowy identyfikator operatora oddającego'),
    numberType: z.enum(['FIXED_LINE', 'MOBILE']).default('FIXED_LINE'),
    numberRangeKind: z.enum(['SINGLE', 'DDI_RANGE'], {
      required_error: 'Typ numeracji jest wymagany',
    }),
    primaryNumber: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      landlinePhoneSchema.optional(),
    ),
    rangeStart: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      landlinePhoneSchema.optional(),
    ),
    rangeEnd: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      landlinePhoneSchema.optional(),
    ),
    requestDocumentNumber: optionalTrimmedString(100),
    portingMode: z.enum(['DAY', 'END', 'EOP'], {
      required_error: 'Tryb przeniesienia jest wymagany',
    }),
    requestedPortDate: optionalDateOnlySchema,
    requestedPortTime: optionalTimeSchema,
    earliestAcceptablePortDate: optionalDateOnlySchema,
    subscriberKind: z.enum(['INDIVIDUAL', 'BUSINESS'], {
      required_error: 'Typ abonenta jest wymagany',
    }),
    subscriberFirstName: optionalTrimmedString(100),
    subscriberLastName: optionalTrimmedString(100),
    subscriberCompanyName: optionalTrimmedString(200),
    identityType: z.enum(['PESEL', 'NIP', 'REGON', 'ID_CARD', 'PASSPORT', 'OTHER'], {
      required_error: 'Typ identyfikatora jest wymagany',
    }),
    identityValue: z
      .string({ required_error: 'Wartość identyfikatora jest wymagana' })
      .min(1, 'Wartość identyfikatora jest wymagana')
      .max(100)
      .trim(),
    correspondenceAddress: z
      .string({ required_error: 'Adres korespondencyjny jest wymagany' })
      .min(1, 'Adres korespondencyjny jest wymagany')
      .max(1000)
      .trim(),
    hasPowerOfAttorney: z.boolean().default(false),
    linkedWholesaleServiceOnRecipientSide: z.boolean().default(false),
    infrastructureOperatorId: optionalUuidSchema,
    contactChannel: z.enum(['EMAIL', 'SMS', 'LETTER'], {
      required_error: 'Kanał kontaktu jest wymagany',
    }),
    internalNotes: optionalTrimmedString(5000),
  })
  .superRefine((data, ctx) => {
    const today = todayString()

    if (data.numberType !== 'FIXED_LINE') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['numberType'],
        message: 'Na tym etapie system obsługuje wyłącznie sprawy FNP (numery stacjonarne).',
      })
    }

    if (data.numberRangeKind === 'SINGLE') {
      if (!data.primaryNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['primaryNumber'],
          message: 'Dla pojedynczego numeru podaj numer główny.',
        })
      }
      if (data.rangeStart || data.rangeEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rangeStart'],
          message: 'Zakres DDI podawaj tylko dla typu „Zakres DDI”.',
        })
      }
    }

    if (data.numberRangeKind === 'DDI_RANGE') {
      if (!data.rangeStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rangeStart'],
          message: 'Dla zakresu DDI podaj numer początkowy.',
        })
      }
      if (!data.rangeEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rangeEnd'],
          message: 'Dla zakresu DDI podaj numer końcowy.',
        })
      }

      if (data.rangeStart && data.rangeEnd) {
        if (data.rangeStart.length !== data.rangeEnd.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['rangeEnd'],
            message: 'Numery zakresu muszą mieć zgodny format.',
          })
        }

        if (data.rangeStart > data.rangeEnd) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['rangeEnd'],
            message: 'Numer końcowy zakresu nie może być mniejszy niż numer początkowy.',
          })
        }
      }
    }

    if (data.portingMode === 'DAY') {
      if (!data.requestedPortDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['requestedPortDate'],
          message: 'Dla trybu DAY wskaż konkretną datę przeniesienia.',
        })
      }

      if (!data.hasPowerOfAttorney) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['hasPowerOfAttorney'],
          message: 'Tryb DAY wymaga pełnomocnictwa.',
        })
      }

      if (data.requestedPortDate) {
        if (data.requestedPortDate < today) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['requestedPortDate'],
            message: 'Data przeniesienia nie może być z przeszłości.',
          })
        }

        if (isWeekend(data.requestedPortDate)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['requestedPortDate'],
            message: 'Dla FNP data przeniesienia w trybie DAY nie może przypadać w weekend.',
          })
        }
      }
    }

    if (data.portingMode !== 'DAY') {
      if (data.requestedPortDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['requestedPortDate'],
          message: 'Konkretna data przeniesienia dotyczy tylko trybu DAY.',
        })
      }

      if (data.requestedPortTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['requestedPortTime'],
          message: 'Godzina przeniesienia dotyczy tylko trybu DAY.',
        })
      }

      if (data.earliestAcceptablePortDate && data.earliestAcceptablePortDate < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['earliestAcceptablePortDate'],
          message: 'Najwcześniejsza akceptowalna data nie może być z przeszłości.',
        })
      }
    }

    if (data.linkedWholesaleServiceOnRecipientSide) {
      if (!data.hasPowerOfAttorney) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['hasPowerOfAttorney'],
          message: 'Powiązanie z Usługą Hurtową po stronie Biorcy wymaga pełnomocnictwa.',
        })
      }

      if (!data.infrastructureOperatorId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['infrastructureOperatorId'],
          message: 'Wskaż operatora infrastrukturalnego dla Usługi Hurtowej po stronie Biorcy.',
        })
      }
    }

    if (data.subscriberKind === 'INDIVIDUAL') {
      if (!data.subscriberFirstName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['subscriberFirstName'],
          message: 'Imię abonenta jest wymagane.',
        })
      }
      if (!data.subscriberLastName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['subscriberLastName'],
          message: 'Nazwisko abonenta jest wymagane.',
        })
      }
      if (!['PESEL', 'ID_CARD', 'PASSPORT', 'OTHER'].includes(data.identityType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['identityType'],
          message: 'Dla osoby fizycznej wybierz praktyczny identyfikator abonenta.',
        })
      }
    }

    if (data.subscriberKind === 'BUSINESS') {
      if (!data.subscriberCompanyName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['subscriberCompanyName'],
          message: 'Nazwa firmy abonenta jest wymagana.',
        })
      }
      if (!['NIP', 'REGON', 'OTHER'].includes(data.identityType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['identityType'],
          message: 'Dla firmy wybierz NIP, REGON lub inny identyfikator.',
        })
      }
    }

    if (data.identityType === 'PESEL' && !/^\d{11}$/.test(data.identityValue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['identityValue'],
        message: 'PESEL musi zawierać dokładnie 11 cyfr.',
      })
    }

    if (data.identityType === 'NIP' && !/^\d{10}$/.test(data.identityValue.replace(/[-\s]/g, ''))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['identityValue'],
        message: 'NIP musi zawierać 10 cyfr.',
      })
    }

    if (data.identityType === 'REGON' && !/^(\d{9}|\d{14})$/.test(data.identityValue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['identityValue'],
        message: 'REGON musi zawierać 9 albo 14 cyfr.',
      })
    }
  })

export type CreatePortingRequestBody = z.infer<typeof createPortingRequestSchema>

export const portingRequestListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: statusEnum.optional(),
  donorOperatorId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type PortingRequestListQuery = z.infer<typeof portingRequestListQuerySchema>
