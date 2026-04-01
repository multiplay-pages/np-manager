// ============================================================
// ROLE UZYTKOWNIKOW
// ============================================================

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  BOK_CONSULTANT: 'BOK_CONSULTANT',
  BACK_OFFICE: 'BACK_OFFICE',
  MANAGER: 'MANAGER',
  TECHNICAL: 'TECHNICAL',
  LEGAL: 'LEGAL',
  AUDITOR: 'AUDITOR',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  BOK_CONSULTANT: 'Konsultant BOK',
  BACK_OFFICE: 'Back Office',
  MANAGER: 'Kierownik',
  TECHNICAL: 'Dzial Techniczny',
  LEGAL: 'Dzial Prawny',
  AUDITOR: 'Audytor',
}

// ============================================================
// STATUSY SPRAW
// ============================================================

export const CASE_STATUS_CODES = {
  NEW: 'NEW',
  IN_VERIFICATION: 'IN_VERIFICATION',
  WAITING_COMPLETION: 'WAITING_COMPLETION',
  DOCUMENTS_COMPLETE: 'DOCUMENTS_COMPLETE',
  SENT_TO_DONOR: 'SENT_TO_DONOR',
  REJECTED_BY_DONOR: 'REJECTED_BY_DONOR',
  ACCEPTED_BY_DONOR: 'ACCEPTED_BY_DONOR',
  PORTING_DATE_SET: 'PORTING_DATE_SET',
  TECHNICAL_IN_PROGRESS: 'TECHNICAL_IN_PROGRESS',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
  REJECTED_FINAL: 'REJECTED_FINAL',
  OVERDUE: 'OVERDUE',
} as const

export type CaseStatusCode = (typeof CASE_STATUS_CODES)[keyof typeof CASE_STATUS_CODES]

export const FINAL_STATUS_CODES: CaseStatusCode[] = [
  CASE_STATUS_CODES.CLOSED,
  CASE_STATUS_CODES.CANCELLED,
  CASE_STATUS_CODES.REJECTED_FINAL,
]

export const ACTIVE_STATUS_CODES: CaseStatusCode[] = [
  CASE_STATUS_CODES.NEW,
  CASE_STATUS_CODES.IN_VERIFICATION,
  CASE_STATUS_CODES.WAITING_COMPLETION,
  CASE_STATUS_CODES.DOCUMENTS_COMPLETE,
  CASE_STATUS_CODES.SENT_TO_DONOR,
  CASE_STATUS_CODES.REJECTED_BY_DONOR,
  CASE_STATUS_CODES.ACCEPTED_BY_DONOR,
  CASE_STATUS_CODES.PORTING_DATE_SET,
  CASE_STATUS_CODES.TECHNICAL_IN_PROGRESS,
  CASE_STATUS_CODES.ON_HOLD,
  CASE_STATUS_CODES.OVERDUE,
]

// ============================================================
// PRIORYTETY
// ============================================================

export const PRIORITIES = {
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const

export type Priority = (typeof PRIORITIES)[keyof typeof PRIORITIES]

export const PRIORITY_LABELS: Record<Priority, string> = {
  NORMAL: 'Normalny',
  HIGH: 'Wysoki',
  CRITICAL: 'Krytyczny',
}

// ============================================================
// TYPY KLIENTOW
// ============================================================

export const CLIENT_TYPES = {
  INDIVIDUAL: 'INDIVIDUAL',
  BUSINESS: 'BUSINESS',
} as const

export type ClientType = (typeof CLIENT_TYPES)[keyof typeof CLIENT_TYPES]

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  INDIVIDUAL: 'Osoba fizyczna',
  BUSINESS: 'Firma / podmiot prawny',
}

// ============================================================
// STATUSY DOKUMENTOW
// ============================================================

export const DOCUMENT_STATUS = {
  UPLOADED: 'UPLOADED',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const

export type DocumentStatus = (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS]

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  UPLOADED: 'Wgrane',
  VERIFIED: 'Zweryfikowane',
  REJECTED: 'Odrzucone',
}

// ============================================================
// TYPY KODOW DOKUMENTOW
// ============================================================

export const DOCUMENT_TYPE_CODES = {
  IDENTITY_DOCUMENT: 'IDENTITY_DOCUMENT',
  CONSENT_FOR_PORTING: 'CONSENT_FOR_PORTING',
  POWER_OF_ATTORNEY: 'POWER_OF_ATTORNEY',
  COMPANY_REGISTRATION: 'COMPANY_REGISTRATION',
  CONTRACT_COPY: 'CONTRACT_COPY',
  OTHER: 'OTHER',
} as const

export type DocumentTypeCode = (typeof DOCUMENT_TYPE_CODES)[keyof typeof DOCUMENT_TYPE_CODES]

// ============================================================
// TYPY NUMEROW TELEFONOW
// ============================================================

export const PHONE_NUMBER_TYPES = {
  GEOGRAPHIC: 'GEOGRAPHIC',
  NON_GEOGRAPHIC: 'NON_GEOGRAPHIC',
} as const

export type PhoneNumberType = (typeof PHONE_NUMBER_TYPES)[keyof typeof PHONE_NUMBER_TYPES]

// ============================================================
// TRYBY PORTOWANIA
// ============================================================

export const PORTING_MODES = {
  END: 'END',
  EOP: 'EOP',
  DAY: 'DAY',
} as const

export type PortingMode = (typeof PORTING_MODES)[keyof typeof PORTING_MODES]

export const PORTING_MODE_LABELS: Record<PortingMode, string> = {
  DAY: 'DAY - konkretny dzien przeniesienia',
  END: 'END - z zachowaniem okresu wypowiedzenia',
  EOP: 'EOP - na koniec okresu promocyjnego',
}

export const PORTING_MODE_DESCRIPTIONS: Record<PortingMode, string> = {
  DAY: 'Klient wskazuje konkretny dzien przeniesienia numeru. Tryb bez zachowania okresu wypowiedzenia u dotychczasowego dostawcy. Pelnomocnictwo jest wymagane.',
  END: 'Przeniesienie z zachowaniem okresu wypowiedzenia u dotychczasowego dostawcy. Finalna date przeniesienia wyznacza Dawca. Po stronie Biorcy mozna wskazac najwczesniejsza akceptowalna date.',
  EOP: 'Przeniesienie na koniec okresu promocyjnego u dotychczasowego dostawcy. Finalna date przeniesienia wyznacza Dawca. Po stronie Biorcy mozna wskazac najwczesniejsza akceptowalna date.',
}

// ============================================================
// STATUSY EKSPORTU DO PLI CBD
// ============================================================

export const PLI_CBD_EXPORT_STATUSES = {
  NOT_EXPORTED: 'NOT_EXPORTED',
  EXPORT_PENDING: 'EXPORT_PENDING',
  EXPORTED: 'EXPORTED',
  SYNC_ERROR: 'SYNC_ERROR',
} as const

export type PliCbdExportStatus =
  (typeof PLI_CBD_EXPORT_STATUSES)[keyof typeof PLI_CBD_EXPORT_STATUSES]

export const PLI_CBD_EXPORT_STATUS_LABELS: Record<PliCbdExportStatus, string> = {
  NOT_EXPORTED: 'Nie wyeksportowano do PLI CBD',
  EXPORT_PENDING: 'Oczekuje na eksport do PLI CBD',
  EXPORTED: 'Wyeksportowano do PLI CBD',
  SYNC_ERROR: 'Blad synchronizacji z PLI CBD',
}

export const PLI_CBD_INTEGRATION_DIRECTIONS = {
  EXPORT: 'EXPORT',
  SYNC: 'SYNC',
} as const

export type PliCbdIntegrationDirection =
  (typeof PLI_CBD_INTEGRATION_DIRECTIONS)[keyof typeof PLI_CBD_INTEGRATION_DIRECTIONS]

export const PLI_CBD_INTEGRATION_DIRECTION_LABELS: Record<
  PliCbdIntegrationDirection,
  string
> = {
  EXPORT: 'Eksport',
  SYNC: 'Synchronizacja',
}

export const PLI_CBD_INTEGRATION_STATUSES = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
} as const

export type PliCbdIntegrationStatus =
  (typeof PLI_CBD_INTEGRATION_STATUSES)[keyof typeof PLI_CBD_INTEGRATION_STATUSES]

export const PLI_CBD_INTEGRATION_STATUS_LABELS: Record<
  PliCbdIntegrationStatus,
  string
> = {
  PENDING: 'W toku',
  SUCCESS: 'Sukces',
  ERROR: 'Blad',
}

// ============================================================
// STATUSY WEWNETRZNE SPRAWY PORTOWANIA
// ============================================================

export const PORTING_CASE_STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  PENDING_DONOR: 'PENDING_DONOR',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  PORTED: 'PORTED',
  ERROR: 'ERROR',
} as const

export type PortingCaseStatus =
  (typeof PORTING_CASE_STATUSES)[keyof typeof PORTING_CASE_STATUSES]

export const PORTING_CASE_STATUS_LABELS: Record<PortingCaseStatus, string> = {
  DRAFT: 'Szkic',
  SUBMITTED: 'Zlozona',
  PENDING_DONOR: 'Oczekuje na dawce',
  CONFIRMED: 'Potwierdzona',
  REJECTED: 'Odrzucona',
  CANCELLED: 'Anulowana',
  PORTED: 'Przeniesiona',
  ERROR: 'Blad',
}

export const PORTING_CASE_STATUS_TRANSITIONS: Record<
  PortingCaseStatus,
  PortingCaseStatus[]
> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['PENDING_DONOR', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'ERROR'],
  PENDING_DONOR: ['CONFIRMED', 'REJECTED', 'CANCELLED', 'ERROR'],
  CONFIRMED: ['PORTED', 'CANCELLED', 'ERROR'],
  REJECTED: [],
  CANCELLED: [],
  PORTED: [],
  ERROR: [],
}

export const PORTING_CASE_STATUS_ACTION_LABELS: Partial<
  Record<PortingCaseStatus, string>
> = {
  SUBMITTED: 'Zloz sprawe',
  PENDING_DONOR: 'Oczekiwanie na dawce',
  CONFIRMED: 'Potwierdz',
  REJECTED: 'Odrzuc',
  CANCELLED: 'Anuluj',
  ERROR: 'Oznacz blad',
  PORTED: 'Oznacz jako przeniesiona',
}

export const PORTING_CASE_STATUS_CONFIRMATION_TARGETS: PortingCaseStatus[] = [
  'REJECTED',
  'CANCELLED',
  'PORTED',
  'ERROR',
]

export function getAllowedPortingCaseStatusTransitions(
  status: PortingCaseStatus,
): PortingCaseStatus[] {
  return PORTING_CASE_STATUS_TRANSITIONS[status] ?? []
}

// ============================================================
// KODY EXX Z PLI CBD
// ============================================================

export const PLI_CBD_EXX_TYPES = {
  E03: 'E03',
  E06: 'E06',
  E12: 'E12',
  E13: 'E13',
  E16: 'E16',
  E17: 'E17',
  E18: 'E18',
  E23: 'E23',
  E31: 'E31',
} as const

export type PliCbdExxType =
  (typeof PLI_CBD_EXX_TYPES)[keyof typeof PLI_CBD_EXX_TYPES]

// ============================================================
// ZAKRES NUMERACJI W SPRAWIE PORTOWANIA
// ============================================================

export const PORTED_NUMBER_KINDS = {
  SINGLE: 'SINGLE',
  DDI_RANGE: 'DDI_RANGE',
} as const

export type PortedNumberKind =
  (typeof PORTED_NUMBER_KINDS)[keyof typeof PORTED_NUMBER_KINDS]

export const PORTED_NUMBER_KIND_LABELS: Record<PortedNumberKind, string> = {
  SINGLE: 'Pojedynczy numer',
  DDI_RANGE: 'Zakres DDI',
}

// ============================================================
// TYPY IDENTYFIKATORA ABONENTA
// ============================================================

export const SUBSCRIBER_IDENTITY_TYPES = {
  PESEL: 'PESEL',
  NIP: 'NIP',
  REGON: 'REGON',
  ID_CARD: 'ID_CARD',
  PASSPORT: 'PASSPORT',
  OTHER: 'OTHER',
} as const

export type SubscriberIdentityType =
  (typeof SUBSCRIBER_IDENTITY_TYPES)[keyof typeof SUBSCRIBER_IDENTITY_TYPES]

export const SUBSCRIBER_IDENTITY_TYPE_LABELS: Record<SubscriberIdentityType, string> = {
  PESEL: 'PESEL',
  NIP: 'NIP',
  REGON: 'REGON',
  ID_CARD: 'Dowod osobisty',
  PASSPORT: 'Paszport',
  OTHER: 'Inny identyfikator',
}

// ============================================================
// KANALY KONTAKTU
// ============================================================

export const CONTACT_CHANNELS = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  LETTER: 'LETTER',
} as const

export type ContactChannel = (typeof CONTACT_CHANNELS)[keyof typeof CONTACT_CHANNELS]

export const CONTACT_CHANNEL_LABELS: Record<ContactChannel, string> = {
  EMAIL: 'E-mail',
  SMS: 'SMS',
  LETTER: 'List',
}

// ============================================================
// TYPY NUMEROW
// ============================================================

export const NUMBER_TYPES = {
  FIXED_LINE: 'FIXED_LINE',
  MOBILE: 'MOBILE',
} as const

export type NumberType = (typeof NUMBER_TYPES)[keyof typeof NUMBER_TYPES]

export const NUMBER_TYPE_LABELS: Record<NumberType, string> = {
  FIXED_LINE: 'Numer stacjonarny',
  MOBILE: 'Numer komorkowy',
}

// ============================================================
// DOZWOLONE TYPY PLIKOW
// ============================================================

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

// ============================================================
// KLUCZE USTAWIEN SYSTEMOWYCH
// ============================================================

export const SYSTEM_SETTING_KEYS = {
  SLA_DAYS_TOTAL: 'sla_days_total',
  SLA_ALERT_HOURS_FIRST: 'sla_alert_hours_first',
  SLA_ALERT_HOURS_CRITICAL: 'sla_alert_hours_critical',
  DONOR_RESPONSE_DAYS: 'donor_response_days',
  MAX_FILE_SIZE_MB: 'max_file_size_mb',
  MAX_RETRY_COUNT: 'max_retry_count',
} as const

export type SystemSettingKey = (typeof SYSTEM_SETTING_KEYS)[keyof typeof SYSTEM_SETTING_KEYS]
