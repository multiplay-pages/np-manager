import { z } from 'zod'
import { landlinePhoneSchema } from '@np-manager/shared'

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/

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
  .refine(isValidDateOnly, 'Data musi miec format RRRR-MM-DD')

const optionalDateOnlySchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  dateOnlySchema.optional(),
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

const optionalEmailSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.string().email('Podaj poprawny adres e-mail').max(200).optional(),
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

function refineDateRange(
  data: { confirmedPortDateFrom?: string; confirmedPortDateTo?: string },
  ctx: z.RefinementCtx,
): void {
  if (data.confirmedPortDateFrom && data.confirmedPortDateTo &&
      data.confirmedPortDateFrom > data.confirmedPortDateTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmedPortDateTo'],
      message: 'Data koncowa nie moze byc wczesniejsza niz data poczatkowa.',
    })
  }
}

const ownershipFilterEnum = z.enum(['ALL', 'MINE', 'UNASSIGNED'])
const commercialOwnerFilterEnum = z.enum(['ALL', 'WITH_OWNER', 'WITHOUT_OWNER', 'MINE'])
const notificationHealthFilterEnum = z.enum(['ALL', 'HAS_FAILURES', 'NO_FAILURES'])
const quickWorkFilterEnum = z.enum(['URGENT', 'NO_DATE', 'NEEDS_ACTION_TODAY'])
const listSortEnum = z.enum([
  'CREATED_AT_DESC',
  'WORK_PRIORITY',
  'NUMBER_ASC',
  'NUMBER_DESC',
  'CLIENT_ASC',
  'CLIENT_DESC',
  'STATUS_ASC',
  'STATUS_DESC',
  'CONFIRMED_PORT_DATE_ASC',
  'CONFIRMED_PORT_DATE_DESC',
  'DONOR_OPERATOR_ASC',
  'DONOR_OPERATOR_DESC',
  'PORTING_MODE_ASC',
  'PORTING_MODE_DESC',
  'ASSIGNED_USER_ASC',
  'ASSIGNED_USER_DESC',
  'COMMERCIAL_OWNER_ASC',
  'COMMERCIAL_OWNER_DESC',
])

function validateDeferredEarliestDate(
  value: string | undefined,
  ctx: z.RefinementCtx,
): void {
  if (!value) return

  if (value < todayString()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['earliestAcceptablePortDate'],
      message: 'Najwczesniejsza akceptowalna data nie moze byc z przeszlosci.',
    })
  }

  // TODO(B4): jesli polityka operacyjna bedzie tego wymagac, dodac
  // maksymalne wyprzedzenie, np. 14 dni do przodu dla END/EOP.
}

export const createPortingRequestSchema = z
  .object({
    clientId: z
      .string({ required_error: 'Klient jest wymagany' })
      .uuid('Nieprawidlowy identyfikator klienta'),
    donorOperatorId: z
      .string({ required_error: 'Operator oddajacy jest wymagany' })
      .uuid('Nieprawidlowy identyfikator operatora oddajacego'),
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
      .string({ required_error: 'Wartosc identyfikatora jest wymagana' })
      .min(1, 'Wartosc identyfikatora jest wymagana')
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
      required_error: 'Kanal kontaktu jest wymagany',
    }),
    internalNotes: optionalTrimmedString(5000),
  })
  .superRefine((data, ctx) => {
    const today = todayString()

    if (data.numberType !== 'FIXED_LINE') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['numberType'],
        message: 'Na tym etapie system obsluguje wylacznie sprawy FNP (numery stacjonarne).',
      })
    }

    if (data.numberRangeKind === 'SINGLE') {
      if (!data.primaryNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['primaryNumber'],
          message: 'Dla pojedynczego numeru podaj numer glowny.',
        })
      }

      if (data.rangeStart || data.rangeEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rangeStart'],
          message: 'Zakres DDI podawaj tylko dla typu "Zakres DDI".',
        })
      }
    }

    if (data.numberRangeKind === 'DDI_RANGE') {
      if (!data.rangeStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rangeStart'],
          message: 'Dla zakresu DDI podaj numer poczatkowy.',
        })
      }

      if (!data.rangeEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rangeEnd'],
          message: 'Dla zakresu DDI podaj numer koncowy.',
        })
      }

      if (data.rangeStart && data.rangeEnd) {
        if (data.rangeStart.length !== data.rangeEnd.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['rangeEnd'],
            message: 'Numery zakresu musza miec zgodny format.',
          })
        }

        if (data.rangeStart > data.rangeEnd) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['rangeEnd'],
            message: 'Numer koncowy zakresu nie moze byc mniejszy niz numer poczatkowy.',
          })
        }
      }
    }

    if (data.portingMode === 'DAY') {
      if (!data.requestedPortDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['requestedPortDate'],
          message: 'Dla trybu DAY wskaz wnioskowany dzien przeniesienia.',
        })
      }

      if (!data.hasPowerOfAttorney) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['hasPowerOfAttorney'],
          message: 'Tryb DAY wymaga pelnomocnictwa.',
        })
      }

      if (data.requestedPortDate) {
        if (data.requestedPortDate < today) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['requestedPortDate'],
            message: 'Wnioskowany dzien przeniesienia nie moze byc z przeszlosci.',
          })
        }

        if (isWeekend(data.requestedPortDate)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['requestedPortDate'],
            message: 'Dla FNP wnioskowany dzien przeniesienia w trybie DAY nie moze przypasc w weekend.',
          })
        }
      }
    }

    if (data.portingMode !== 'DAY') {
      if (data.requestedPortDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['requestedPortDate'],
          message: 'Wnioskowany dzien przeniesienia dotyczy tylko trybu DAY.',
        })
      }

      if (!data.earliestAcceptablePortDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['earliestAcceptablePortDate'],
          message: 'Dla trybu END/EOP wskaz najwczesniejsza akceptowalna date przeniesienia.',
        })
      }

      validateDeferredEarliestDate(data.earliestAcceptablePortDate, ctx)
    }

    if (data.linkedWholesaleServiceOnRecipientSide) {
      if (!data.hasPowerOfAttorney) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['hasPowerOfAttorney'],
          message: 'Powiazanie z Usluga Hurtowa po stronie Biorcy wymaga pelnomocnictwa.',
        })
      }

      if (!data.infrastructureOperatorId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['infrastructureOperatorId'],
          message: 'Wskaz operatora infrastrukturalnego dla Uslugi Hurtowej po stronie Biorcy.',
        })
      }
    }

    if (data.subscriberKind === 'INDIVIDUAL') {
      if (!data.subscriberFirstName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['subscriberFirstName'],
          message: 'Imie abonenta jest wymagane.',
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
        message: 'PESEL musi zawierac dokladnie 11 cyfr.',
      })
    }

    if (data.identityType === 'NIP' && !/^\d{10}$/.test(data.identityValue.replace(/[-\s]/g, ''))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['identityValue'],
        message: 'NIP musi zawierac 10 cyfr.',
      })
    }

    if (data.identityType === 'REGON' && !/^(\d{9}|\d{14})$/.test(data.identityValue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['identityValue'],
        message: 'REGON musi zawierac 9 albo 14 cyfr.',
      })
    }
  })

export type CreatePortingRequestBody = z.infer<typeof createPortingRequestSchema>

export const updatePortingRequestStatusSchema = z.object({
  targetStatus: statusEnum,
  actionId: z.enum([
    'SUBMIT', 'MARK_PENDING_DONOR', 'CONFIRM', 'REJECT', 'CANCEL',
    'MARK_ERROR', 'MARK_PORTED', 'CANCEL_FROM_ERROR', 'RESUME_FROM_ERROR',
  ]).optional(),
  reason: optionalTrimmedString(300),
  comment: optionalTrimmedString(5000),
})

export type UpdatePortingRequestStatusBody = z.infer<typeof updatePortingRequestStatusSchema>

// ============================================================
// OPERATIONAL DETAILS EDIT v1
// ============================================================

const nullableTrimmedString = (max: number) =>
  z.preprocess(
    (value) => (value === '' ? null : value),
    z.union([z.string().max(max).trim(), z.null()]),
  )

// ============================================================
// MANUAL PORT DATE EDIT
// ============================================================

export const updatePortingRequestPortDateSchema = z.object({
  confirmedPortDate: z.preprocess(
    (value) => (value === '' ? null : value),
    z.union([
      z.string().refine(isValidDateOnly, 'Data musi miec format RRRR-MM-DD'),
      z.null(),
    ]),
  ),
})

export type UpdatePortingRequestPortDateBody = z.infer<typeof updatePortingRequestPortDateSchema>

export const confirmPortingRequestPortDateSchema = z.object({
  confirmedPortDate: dateOnlySchema,
  comment: optionalTrimmedString(5000),
})

export type ConfirmPortingRequestPortDateBody = z.infer<
  typeof confirmPortingRequestPortDateSchema
>

// ============================================================
// OPERATIONAL DETAILS EDIT v1
// ============================================================

export const updatePortingRequestDetailsSchema = z
  .object({
    correspondenceAddress: z
      .string()
      .min(1, 'Adres korespondencyjny nie moze byc pusty.')
      .max(1000)
      .trim()
      .optional(),
    contactChannel: z.enum(['EMAIL', 'SMS', 'LETTER']).optional(),
    internalNotes: nullableTrimmedString(5000).optional(),
    requestDocumentNumber: nullableTrimmedString(100).optional(),
  })
  .refine(
    (data) =>
      data.correspondenceAddress !== undefined ||
      data.contactChannel !== undefined ||
      data.internalNotes !== undefined ||
      data.requestDocumentNumber !== undefined,
    { message: 'Podaj przynajmniej jedno pole do zmiany.' },
  )

export type UpdatePortingRequestDetailsBody = z.infer<typeof updatePortingRequestDetailsSchema>

export const portingRequestListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: statusEnum.optional(),
  portingMode: z.enum(['DAY', 'END', 'EOP']).optional(),
  donorOperatorId: z.string().uuid().optional(),
  ownership: ownershipFilterEnum.optional().default('ALL'),
  quickWorkFilter: quickWorkFilterEnum.optional(),
  commercialOwnerFilter: commercialOwnerFilterEnum.optional().default('ALL'),
  notificationHealthFilter: notificationHealthFilterEnum.optional().default('ALL'),
  confirmedPortDateFrom: optionalDateOnlySchema,
  confirmedPortDateTo: optionalDateOnlySchema,
  sort: listSortEnum.optional().default('CREATED_AT_DESC'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).superRefine(refineDateRange)

export type PortingRequestListQuery = z.input<typeof portingRequestListQuerySchema>

export const portingRequestSummaryQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: statusEnum.optional(),
  portingMode: z.enum(['DAY', 'END', 'EOP']).optional(),
  donorOperatorId: z.string().uuid().optional(),
  ownership: ownershipFilterEnum.optional().default('ALL'),
  commercialOwnerFilter: commercialOwnerFilterEnum.optional().default('ALL'),
  notificationHealthFilter: notificationHealthFilterEnum.optional().default('ALL'),
  confirmedPortDateFrom: optionalDateOnlySchema,
  confirmedPortDateTo: optionalDateOnlySchema,
}).superRefine(refineDateRange)

export type PortingRequestSummaryQuery = z.input<typeof portingRequestSummaryQuerySchema>

export const internalNotificationAttemptsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type InternalNotificationAttemptsQuery = z.input<
  typeof internalNotificationAttemptsQuerySchema
>

export const retryInternalNotificationAttemptSchema = z.object({
  reason: optionalTrimmedString(300),
})

export type RetryInternalNotificationAttemptBody = z.infer<
  typeof retryInternalNotificationAttemptSchema
>

export const updatePortingRequestAssignmentSchema = z.object({
  assignedUserId: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().uuid().nullable(),
  ),
})

export type UpdatePortingRequestAssignmentBody =
  z.infer<typeof updatePortingRequestAssignmentSchema>

export const updatePortingRequestCommercialOwnerSchema = z.object({
  commercialOwnerUserId: z.preprocess(
    (value) => (value === '' ? null : value),
    z.string().uuid().nullable(),
  ),
})

export type UpdatePortingRequestCommercialOwnerBody =
  z.infer<typeof updatePortingRequestCommercialOwnerSchema>

export const preparePortingCommunicationDraftSchema = z.object({
  actionType: z
    .enum([
      'MISSING_DOCUMENTS',
      'CLIENT_CONFIRMATION',
      'REJECTION_NOTICE',
      'COMPLETION_NOTICE',
      'INTERNAL_NOTE_EMAIL',
    ])
    .optional(),
  type: z.enum(['EMAIL', 'SMS']).optional(),
  triggerType: z
    .enum([
      'CASE_RECEIVED',
      'SENT_TO_EXTERNAL_SYSTEM',
      'PORT_DATE_SCHEDULED',
      'CASE_REJECTED',
      'PORT_COMPLETED',
      'MANUAL',
    ])
    .optional(),
  templateKey: z
    .enum([
      'case_received',
      'sent_to_external_system',
      'port_date_scheduled',
      'case_rejected',
      'port_completed',
      'missing_documents',
      'client_confirmation',
      'rejection_notice',
      'completion_notice',
      'internal_note_email',
    ])
    .optional(),
  recipient: optionalEmailSchema,
  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
})

export type PreparePortingCommunicationDraftBody =
  z.infer<typeof preparePortingCommunicationDraftSchema>

export const markPortingCommunicationSentSchema = z.object({
  sentAt: z.string().datetime().optional(),
})

export type MarkPortingCommunicationSentBody =
  z.infer<typeof markPortingCommunicationSentSchema>

export const executePortingRequestExternalActionSchema = z.object({
  actionId: z.enum([
    'MARK_SENT_TO_EXTERNAL_SYSTEM',
    'SET_PORT_DATE',
    'MARK_DONOR_REJECTION',
    'MARK_PORT_COMPLETED',
  ]),
  scheduledPortDate: optionalDateOnlySchema,
  rejectionReason: optionalTrimmedString(1000),
  comment: optionalTrimmedString(5000),
  createCommunicationDraft: z.boolean().default(false),
  recipient: optionalEmailSchema,
})

export type ExecutePortingRequestExternalActionBody =
  z.infer<typeof executePortingRequestExternalActionSchema>
