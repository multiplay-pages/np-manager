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

export const PLI_CBD_INTEGRATION_DIRECTION_LABELS: Record<PliCbdIntegrationDirection, string> = {
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

export const PLI_CBD_INTEGRATION_STATUS_LABELS: Record<PliCbdIntegrationStatus, string> = {
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

export type PortingCaseStatus = (typeof PORTING_CASE_STATUSES)[keyof typeof PORTING_CASE_STATUSES]

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

export const PORTING_CASE_STATUS_TRANSITIONS: Record<PortingCaseStatus, PortingCaseStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['PENDING_DONOR', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'ERROR'],
  PENDING_DONOR: ['CONFIRMED', 'REJECTED', 'CANCELLED', 'ERROR'],
  CONFIRMED: ['PORTED', 'CANCELLED', 'ERROR'],
  REJECTED: [],
  CANCELLED: [],
  PORTED: [],
  ERROR: [],
}

export const PORTING_CASE_STATUS_ACTION_LABELS: Partial<Record<PortingCaseStatus, string>> = {
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

export const PORTING_REQUEST_STATUS_ACTION_IDS = {
  SUBMIT: 'SUBMIT',
  MARK_PENDING_DONOR: 'MARK_PENDING_DONOR',
  CONFIRM: 'CONFIRM',
  REJECT: 'REJECT',
  CANCEL: 'CANCEL',
  MARK_ERROR: 'MARK_ERROR',
  MARK_PORTED: 'MARK_PORTED',
} as const

export type PortingRequestStatusActionId =
  (typeof PORTING_REQUEST_STATUS_ACTION_IDS)[keyof typeof PORTING_REQUEST_STATUS_ACTION_IDS]

export const PORTING_REQUEST_CASE_HISTORY_EVENT_TYPES = {
  REQUEST_CREATED: 'REQUEST_CREATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
} as const

export type PortingRequestCaseHistoryEventType =
  (typeof PORTING_REQUEST_CASE_HISTORY_EVENT_TYPES)[keyof typeof PORTING_REQUEST_CASE_HISTORY_EVENT_TYPES]

export const PORTING_REQUEST_EXTERNAL_ACTION_IDS = {
  MARK_SENT_TO_EXTERNAL_SYSTEM: 'MARK_SENT_TO_EXTERNAL_SYSTEM',
  SET_PORT_DATE: 'SET_PORT_DATE',
  MARK_DONOR_REJECTION: 'MARK_DONOR_REJECTION',
  MARK_PORT_COMPLETED: 'MARK_PORT_COMPLETED',
} as const

export type PortingRequestExternalActionId =
  (typeof PORTING_REQUEST_EXTERNAL_ACTION_IDS)[keyof typeof PORTING_REQUEST_EXTERNAL_ACTION_IDS]

export const PORTING_REQUEST_COMMUNICATION_ACTION_TYPES = {
  MISSING_DOCUMENTS: 'MISSING_DOCUMENTS',
  CLIENT_CONFIRMATION: 'CLIENT_CONFIRMATION',
  REJECTION_NOTICE: 'REJECTION_NOTICE',
  COMPLETION_NOTICE: 'COMPLETION_NOTICE',
  INTERNAL_NOTE_EMAIL: 'INTERNAL_NOTE_EMAIL',
} as const

export type PortingRequestCommunicationActionType =
  (typeof PORTING_REQUEST_COMMUNICATION_ACTION_TYPES)[keyof typeof PORTING_REQUEST_COMMUNICATION_ACTION_TYPES]

export const PORTING_REQUEST_COMMUNICATION_ACTION_TYPE_LABELS: Record<
  PortingRequestCommunicationActionType,
  string
> = {
  MISSING_DOCUMENTS: 'Brakujace dokumenty',
  CLIENT_CONFIRMATION: 'Potwierdzenie dla klienta',
  REJECTION_NOTICE: 'Informacja o odrzuceniu',
  COMPLETION_NOTICE: 'Informacja o zakonczeniu',
  INTERNAL_NOTE_EMAIL: 'Wiadomosc wewnetrzna',
}

export const PORTING_COMMUNICATION_TYPES = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
} as const

export type PortingCommunicationType =
  (typeof PORTING_COMMUNICATION_TYPES)[keyof typeof PORTING_COMMUNICATION_TYPES]

export const PORTING_COMMUNICATION_TYPE_LABELS: Record<PortingCommunicationType, string> = {
  EMAIL: 'E-mail',
  SMS: 'SMS',
}

export const PORTING_COMMUNICATION_STATUSES = {
  DRAFT: 'DRAFT',
  READY: 'READY',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const

export type PortingCommunicationStatus =
  (typeof PORTING_COMMUNICATION_STATUSES)[keyof typeof PORTING_COMMUNICATION_STATUSES]

export const PORTING_COMMUNICATION_STATUS_LABELS: Record<PortingCommunicationStatus, string> = {
  DRAFT: 'Draft',
  READY: 'Gotowe do wysylki',
  SENT: 'Wyslane',
  FAILED: 'Blad wysylki',
}

export const PORTING_COMMUNICATION_TRIGGER_TYPES = {
  CASE_RECEIVED: 'CASE_RECEIVED',
  SENT_TO_EXTERNAL_SYSTEM: 'SENT_TO_EXTERNAL_SYSTEM',
  PORT_DATE_SCHEDULED: 'PORT_DATE_SCHEDULED',
  CASE_REJECTED: 'CASE_REJECTED',
  PORT_COMPLETED: 'PORT_COMPLETED',
  MANUAL: 'MANUAL',
} as const

export type PortingCommunicationTriggerType =
  (typeof PORTING_COMMUNICATION_TRIGGER_TYPES)[keyof typeof PORTING_COMMUNICATION_TRIGGER_TYPES]

export const PORTING_COMMUNICATION_TRIGGER_TYPE_LABELS: Record<
  PortingCommunicationTriggerType,
  string
> = {
  CASE_RECEIVED: 'Sprawa przyjeta',
  SENT_TO_EXTERNAL_SYSTEM: 'Przekazano do systemu zewnetrznego',
  PORT_DATE_SCHEDULED: 'Ustalono date przeniesienia',
  CASE_REJECTED: 'Sprawa odrzucona',
  PORT_COMPLETED: 'Przeniesienie zakonczone',
  MANUAL: 'Draft manualny',
}

export const PORTING_COMMUNICATION_TEMPLATE_KEYS = {
  CASE_RECEIVED: 'case_received',
  SENT_TO_EXTERNAL_SYSTEM: 'sent_to_external_system',
  PORT_DATE_SCHEDULED: 'port_date_scheduled',
  CASE_REJECTED: 'case_rejected',
  PORT_COMPLETED: 'port_completed',
  MISSING_DOCUMENTS: 'missing_documents',
  CLIENT_CONFIRMATION: 'client_confirmation',
  REJECTION_NOTICE: 'rejection_notice',
  COMPLETION_NOTICE: 'completion_notice',
  INTERNAL_NOTE_EMAIL: 'internal_note_email',
} as const

export type PortingCommunicationTemplateKey =
  (typeof PORTING_COMMUNICATION_TEMPLATE_KEYS)[keyof typeof PORTING_COMMUNICATION_TEMPLATE_KEYS]

export const PORTING_COMMUNICATION_TEMPLATE_LABELS: Record<
  PortingCommunicationTemplateKey,
  string
> = {
  case_received: 'Sprawa przyjeta',
  sent_to_external_system: 'Przekazano do systemu zewnetrznego',
  port_date_scheduled: 'Ustalono date przeniesienia',
  case_rejected: 'Sprawa odrzucona',
  port_completed: 'Przeniesienie zakonczone',
  missing_documents: 'Brakujace dokumenty',
  client_confirmation: 'Potwierdzenie dla klienta',
  rejection_notice: 'Informacja o odrzuceniu',
  completion_notice: 'Informacja o zakonczeniu',
  internal_note_email: 'Wiadomosc wewnetrzna',
}

export const COMMUNICATION_TEMPLATE_CODES = {
  REQUEST_RECEIVED: 'REQUEST_RECEIVED',
  PORT_DATE_RECEIVED: 'PORT_DATE_RECEIVED',
  PORTING_DAY: 'PORTING_DAY',
  ISSUE_NOTICE: 'ISSUE_NOTICE',
} as const

export type CommunicationTemplateCode =
  (typeof COMMUNICATION_TEMPLATE_CODES)[keyof typeof COMMUNICATION_TEMPLATE_CODES]

export const COMMUNICATION_TEMPLATE_CODE_LABELS: Record<CommunicationTemplateCode, string> = {
  REQUEST_RECEIVED: 'Wniosek przyjety / przekazany',
  PORT_DATE_RECEIVED: 'Otrzymano date przeniesienia',
  PORTING_DAY: 'Dzien przeniesienia',
  ISSUE_NOTICE: 'Informacja o problemie',
}

export const COMMUNICATION_TEMPLATE_PLACEHOLDERS = {
  CLIENT_NAME: 'clientName',
  CASE_NUMBER: 'caseNumber',
  PORTED_NUMBER: 'portedNumber',
  DONOR_OPERATOR_NAME: 'donorOperatorName',
  RECIPIENT_OPERATOR_NAME: 'recipientOperatorName',
  PLANNED_PORT_DATE: 'plannedPortDate',
  ISSUE_DESCRIPTION: 'issueDescription',
  CONTACT_EMAIL: 'contactEmail',
  CONTACT_PHONE: 'contactPhone',
} as const

export type CommunicationTemplatePlaceholder =
  (typeof COMMUNICATION_TEMPLATE_PLACEHOLDERS)[keyof typeof COMMUNICATION_TEMPLATE_PLACEHOLDERS]

export const COMMUNICATION_TEMPLATE_PLACEHOLDER_LABELS: Record<
  CommunicationTemplatePlaceholder,
  string
> = {
  clientName: 'Imie i nazwisko / nazwa klienta',
  caseNumber: 'Numer sprawy',
  portedNumber: 'Numer lub zakres przenoszony',
  donorOperatorName: 'Operator Dawca',
  recipientOperatorName: 'Operator Biorca',
  plannedPortDate: 'Planowana data przeniesienia',
  issueDescription: 'Opis problemu',
  contactEmail: 'Adres e-mail kontaktowy',
  contactPhone: 'Telefon kontaktowy',
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

export type PliCbdExxType = (typeof PLI_CBD_EXX_TYPES)[keyof typeof PLI_CBD_EXX_TYPES]

// ============================================================
// ZAKRES NUMERACJI W SPRAWIE PORTOWANIA
// ============================================================

export const PORTED_NUMBER_KINDS = {
  SINGLE: 'SINGLE',
  DDI_RANGE: 'DDI_RANGE',
} as const

export type PortedNumberKind = (typeof PORTED_NUMBER_KINDS)[keyof typeof PORTED_NUMBER_KINDS]

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

// ============================================================
// ETAPY PROCESU FNP W PLI CBD
// ============================================================

export const FNP_PROCESS_STAGES = {
  NOT_IN_PROCESS: 'NOT_IN_PROCESS',
  EXPORT_PENDING: 'EXPORT_PENDING',
  AWAITING_DONOR_E06: 'AWAITING_DONOR_E06',
  AWAITING_E12: 'AWAITING_E12',
  AWAITING_E13: 'AWAITING_E13',
  READY_TO_PORT: 'READY_TO_PORT',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  PROCESS_ERROR: 'PROCESS_ERROR',
} as const

export type FnpProcessStage = (typeof FNP_PROCESS_STAGES)[keyof typeof FNP_PROCESS_STAGES]

export const FNP_PROCESS_STAGE_LABELS: Record<FnpProcessStage, string> = {
  NOT_IN_PROCESS: 'Poza procesem PLI CBD',
  EXPORT_PENDING: 'Oczekuje na rejestracje w PLI CBD',
  AWAITING_DONOR_E06: 'Oczekuje na odpowiedz Dawcy (E06)',
  AWAITING_E12: 'Wymagane potwierdzenie terminu (E12)',
  AWAITING_E13: 'Oczekuje na potwierdzenie terminu przez Dawce (E13)',
  READY_TO_PORT: 'Termin uzgodniony — gotowe do przeniesienia',
  COMPLETED: 'Przeniesienie zakonczone',
  REJECTED: 'Wniosek odrzucony',
  CANCELLED: 'Wniosek anulowany',
  PROCESS_ERROR: 'Blad procesu',
}

// ============================================================
// KOMUNIKATY EXX — OPISY DOMENOWE
// ============================================================

export const FNP_EXX_MESSAGES = {
  E03: 'E03',
  E06: 'E06',
  E12: 'E12',
  E13: 'E13',
  E16: 'E16',
  E18: 'E18',
  E23: 'E23',
} as const

export type FnpExxMessage = (typeof FNP_EXX_MESSAGES)[keyof typeof FNP_EXX_MESSAGES]

export const FNP_EXX_MESSAGE_LABELS: Record<FnpExxMessage, string> = {
  E03: 'E03 — Wniosek przeniesienia numeru',
  E06: 'E06 — Odpowiedz Dawcy na wniosek',
  E12: 'E12 — Potwierdzenie terminu przez Biorca',
  E13: 'E13 — Potwierdzenie terminu przez Dawce',
  E16: 'E16 — Komunikat bladu / odrzucenia walidacyjnego',
  E18: 'E18 — Potwierdzenie wykonania przeniesienia',
  E23: 'E23 — Anulowanie wniosku',
}

export const FNP_EXX_MESSAGE_DESCRIPTIONS: Record<FnpExxMessage, string> = {
  E03: 'Biorca inicjuje proces przeniesienia numeru. Komunikat trafia do PLI CBD, skad jest przekazywany do Dawcy.',
  E06: 'Dawca odpowiada na wniosek E03. Moze zawierac akceptacje z proponowana data przeniesienia lub odrzucenie z kodem bledu.',
  E12: 'Biorca potwierdza date przeniesienia zaproponowana przez Dawce w E06. Po E12 inicjowana jest finalizacja procesu.',
  E13: 'Dawca potwierdza ostateczny termin przeniesienia. Po E13 data jest wiazaca dla obu stron.',
  E16: 'Komunikat walidacyjny lub blad procesu. Moze byc wysylany przez dowolna strone w odpowiedzi na niepoprawne dane.',
  E18: 'Biorca potwierdza zakonczone przeniesienie numeru do systemu PLI CBD po realizacji technicznej.',
  E23: 'Anulowanie aktywnego wniosku przeniesienia. Moze byc wysylane przez Biorca lub Dawce.',
}

// Parametry terminu dla trybow portowania (wartosci orientacyjne dla sieci stacjonarnych)
export const FNP_DAY_MODE_MIN_LEAD_DAYS = 3
export const FNP_DAY_MODE_WHOLESALE_MIN_LEAD_DAYS = 5

// ============================================================
// TECHNICZNA WARSTWA PAYLOADOW PLI CBD
// ============================================================

export const PLI_CBD_TECHNICAL_PAYLOAD_VERSION = '1.0'

export type PliCbdTechnicalPayloadVersion = typeof PLI_CBD_TECHNICAL_PAYLOAD_VERSION
