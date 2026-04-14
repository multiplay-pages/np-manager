/**
 * Seed danych startowych NP-Manager.
 *
 * Zawiera:
 *  1. Statusy spraw (15 statusów)
 *  2. Przejścia statusów (workflow)
 *  3. Typy dokumentów
 *  4. Operatorzy telekomunikacyjni
 *  5. Konto administratora systemu
 *  6. Ustawienia systemowe
 *  7. Kalendarz świąt 2026
 *
 * Sprawy testowe:
 *  - FNP-SEED-ACTIVE-001: aktywna, pre-export (SUBMITTED)
 *  - FNP-SEED-PORTED-001: zakończona po E18 (blocked)
 *  - FNP-SEED-E18-001: etap READY_TO_PORT, happy path Draft E18
 *  - FNP-SEED-COMM-DRAFT-001: detail z dostepnym "Utworz draft" dla komunikacji
 *  - FNP-SEED-COMM-DUPLICATE-001: detail z aktywnym draftem blokujacym duplikat
 *  - FNP-SEED-COMM-FAILED-001: detail z komunikacja FAILED gotowa do retry
 *  - Global notification failure queue: 2 proby dostarczenia do manualnego QA /notifications/failures
 *
 * Seed jest idempotentny — używa upsert, można uruchomić wielokrotnie.
 *
 * Domyślne konto admina:
 *   E-mail:  admin@np-manager.local
 *   Hasło:   Admin@NP2026!
 *   ZMIEŃ HASŁO PO PIERWSZYM ZALOGOWANIU!
 */

import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

export const COMMUNICATION_TEMPLATE_SEED_DATA = [
  {
    templateId: '00000000-0000-4000-8000-000000000801',
    versionId: '00000000-0000-4000-9000-000000000801',
    code: 'REQUEST_RECEIVED',
    name: 'Potwierdzenie przyjecia sprawy',
    description: 'Szablon dla komunikacji po przyjeciu wniosku lub przekazaniu sprawy do procesu.',
    channel: 'EMAIL',
    subjectTemplate: 'Sprawa {{caseNumber}} - potwierdzenie przyjecia',
    bodyTemplate:
      'Dzien dobry {{clientName}},\n\npotwierdzamy przyjecie sprawy {{caseNumber}} dotyczacej numeru {{portedNumber}}.\nOperator biorca: {{recipientOperatorName}}.\n\nW razie pytan prosimy o kontakt: {{contactEmail}}, tel. {{contactPhone}}.\n\nPozdrawiamy,\nZespol NP-Manager',
    status: 'PUBLISHED',
    versionNumber: 1,
  },
  {
    templateId: '00000000-0000-4000-8000-000000000802',
    versionId: '00000000-0000-4000-9000-000000000802',
    code: 'PORT_DATE_RECEIVED',
    name: 'Potwierdzenie daty przeniesienia',
    description: 'Szablon dla komunikacji po otrzymaniu daty przeniesienia od Operatora Dawcy.',
    channel: 'EMAIL',
    subjectTemplate: 'Sprawa {{caseNumber}} - data przeniesienia {{plannedPortDate}}',
    bodyTemplate:
      'Dzien dobry {{clientName}},\n\nOperator Dawca ({{donorOperatorName}}) potwierdzil planowana date przeniesienia numeru {{portedNumber}} na {{plannedPortDate}}.\n\nW razie pytan prosimy o kontakt: {{contactEmail}}, tel. {{contactPhone}}.\n\nPozdrawiamy,\nZespol NP-Manager',
    status: 'PUBLISHED',
    versionNumber: 1,
  },
  {
    templateId: '00000000-0000-4000-8000-000000000803',
    versionId: '00000000-0000-4000-9000-000000000803',
    code: 'PORTING_DAY',
    name: 'Komunikat na dzien przeniesienia',
    description: 'Szablon dla komunikacji w dniu przeniesienia numeru.',
    channel: 'EMAIL',
    subjectTemplate: 'Sprawa {{caseNumber}} - dzien przeniesienia numeru',
    bodyTemplate:
      'Dzien dobry {{clientName}},\n\nnumer {{portedNumber}} jest obslugiwany w ramach sprawy {{caseNumber}} z planowana data przeniesienia {{plannedPortDate}}.\nOperator biorca: {{recipientOperatorName}}.\n\nW razie pytan prosimy o kontakt: {{contactEmail}}, tel. {{contactPhone}}.\n\nPozdrawiamy,\nZespol NP-Manager',
    status: 'PUBLISHED',
    versionNumber: 1,
  },
  {
    templateId: '00000000-0000-4000-8000-000000000804',
    versionId: '00000000-0000-4000-9000-000000000804',
    code: 'ISSUE_NOTICE',
    name: 'Informacja o problemie',
    description: 'Szablon dla komunikacji operacyjnych wymagajacych przekazania problemu lub brakow.',
    channel: 'EMAIL',
    subjectTemplate: 'Sprawa {{caseNumber}} - wymagana uwaga',
    bodyTemplate:
      'Dzien dobry {{clientName}},\n\nw sprawie {{caseNumber}} dotyczacej numeru {{portedNumber}} pojawila sie kwestia wymagajaca uwagi:\n{{issueDescription}}\n\nW razie pytan prosimy o kontakt: {{contactEmail}}, tel. {{contactPhone}}.\n\nPozdrawiamy,\nZespol NP-Manager',
    status: 'PUBLISHED',
    versionNumber: 1,
  },
] as const

export const QA_FAILED_COMMUNICATION_SEED_FIXTURE = {
  caseNumber: 'FNP-SEED-COMM-FAILED-001',
  requestDocumentNumber: 'DOC-SEED-COMM-FAIL-001',
  primaryNumber: '221234573',
  requestRegisteredAt: '2026-04-04T10:20:00.000Z',
  requestedPortDate: '2026-04-20T00:00:00.000Z',
  internalNotes:
    'Seed QA: sprawa z komunikacja FAILED i historia nieudanej proby doreczenia do testu retry.',
  communication: {
    id: '00000000-0000-4000-8000-000000000702',
    status: 'FAILED',
    type: 'EMAIL',
    triggerType: 'MANUAL',
    templateKey: 'missing_documents',
    templateCode: 'ISSUE_NOTICE',
    actionType: 'MISSING_DOCUMENTS',
    actionLabel: 'Brakujace dokumenty',
    subject: 'Sprawa FNP-SEED-COMM-FAILED-001 - brakujace dokumenty do uzupelnienia',
    body:
      'Dzien dobry Jan Testowy,\n\npodczas weryfikacji sprawy FNP-SEED-COMM-FAILED-001 dotyczacej numeru 221234573 stwierdzilismy brak podpisanego pelnomocnictwa i potwierdzenia danych adresowych.\n\nProsimy o uzupelnienie brakow, aby kontynuowac proces portowania.\n\nPozdrawiamy,\nZespol NP-Manager',
    errorMessage:
      'Wysylka nie powiodla sie: serwer odbiorcy odrzucil wiadomosc dla adresu jan.testowy@np-manager.local.',
    createdAt: '2026-04-04T10:45:00.000Z',
    updatedAt: '2026-04-04T10:47:00.000Z',
  },
  deliveryAttempt: {
    id: '00000000-0000-4000-8000-000000000703',
    attemptedAt: '2026-04-04T10:47:00.000Z',
    outcome: 'FAILED',
    adapterName: 'stub-email-adapter',
    errorCode: 'SMTP_550_RECIPIENT_REJECTED',
    errorMessage:
      'Odpowiedz serwera SMTP 550 5.1.1: odbiorca jan.testowy@np-manager.local nie zaakceptowal wiadomosci.',
    responsePayloadJson: {
      provider: 'stub-smtp',
      smtpStatus: '550 5.1.1 Recipient rejected',
    },
  },
} as const

export const QA_NOTIFICATION_FAILURE_QUEUE_SEED_FIXTURES = [
  {
    id: '00000000-0000-4000-8000-000000000751',
    requestCaseNumber: 'FNP-SEED-COMM-FAILED-001',
    eventCode: 'STATUS_CHANGED',
    eventLabel: 'Zmiana statusu sprawy',
    attemptOrigin: 'PRIMARY',
    channel: 'EMAIL',
    recipient: 'bok.qa@np-manager.local',
    mode: 'REAL',
    outcome: 'FAILED',
    failureKind: 'DELIVERY',
    retryCount: 0,
    isLatestForChain: true,
    errorCode: 'SMTP_DELIVERY_FAILED',
    errorMessage: 'Seed QA: symulowany blad SMTP dla rekordu retryowalnego.',
    createdAt: '2026-04-12T08:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000752',
    requestCaseNumber: 'FNP-SEED-COMM-DUPLICATE-001',
    eventCode: 'COMMERCIAL_OWNER_CHANGED',
    eventLabel: 'Zmiana opiekuna handlowego',
    attemptOrigin: 'PRIMARY',
    channel: 'TEAMS',
    recipient: 'https://teams.example.local/webhook/notification-failure-qa',
    mode: 'REAL',
    outcome: 'FAILED',
    failureKind: 'DELIVERY',
    retryCount: 3,
    isLatestForChain: true,
    errorCode: 'TEAMS_DELIVERY_FAILED',
    errorMessage: 'Seed QA: limit ponowien osiagniety dla Teams.',
    createdAt: '2026-04-12T08:05:00.000Z',
  },
] as const

// ============================================================
// DANE STATUSÓW
// ============================================================

const statusData = [
  {
    code: 'NEW',
    name: 'Nowe',
    description: 'Sprawa zarejestrowana, oczekuje na weryfikację.',
    isFinal: false,
    isError: false,
    color: '#94a3b8',
    orderIndex: 1,
  },
  {
    code: 'IN_VERIFICATION',
    name: 'W weryfikacji',
    description: 'Back Office weryfikuje dane klienta i dokumentację.',
    isFinal: false,
    isError: false,
    color: '#3b82f6',
    orderIndex: 2,
  },
  {
    code: 'WAITING_COMPLETION',
    name: 'Oczekuje na uzupełnienie',
    description: 'Klient musi dostarczyć brakujące dane lub dokumenty.',
    isFinal: false,
    isError: false,
    color: '#f59e0b',
    orderIndex: 3,
  },
  {
    code: 'DOCUMENTS_COMPLETE',
    name: 'Dokumenty kompletne',
    description: 'Wszystkie wymagane dokumenty zweryfikowane. Gotowe do wysłania.',
    isFinal: false,
    isError: false,
    color: '#06b6d4',
    orderIndex: 4,
  },
  {
    code: 'SENT_TO_DONOR',
    name: 'Wysłane do operatora oddającego',
    description: 'Wniosek portabilności przesłany do operatora źródłowego.',
    isFinal: false,
    isError: false,
    color: '#8b5cf6',
    orderIndex: 5,
  },
  {
    code: 'REJECTED_BY_DONOR',
    name: 'Odrzucone przez operatora',
    description: 'Operator oddający odrzucił wniosek. Wymagana korekta lub decyzja.',
    isFinal: false,
    isError: true,
    color: '#ef4444',
    orderIndex: 6,
  },
  {
    code: 'ACCEPTED_BY_DONOR',
    name: 'Zaakceptowane przez operatora',
    description: 'Operator oddający zaakceptował wniosek portabilności.',
    isFinal: false,
    isError: false,
    color: '#10b981',
    orderIndex: 7,
  },
  {
    code: 'PORTING_DATE_SET',
    name: 'Data przeniesienia ustalona',
    description: 'Uzgodniono termin technicznego przeniesienia numeru.',
    isFinal: false,
    isError: false,
    color: '#06b6d4',
    orderIndex: 8,
  },
  {
    code: 'TECHNICAL_IN_PROGRESS',
    name: 'Realizacja techniczna',
    description: 'Dział techniczny realizuje konfigurację i przełączenie numeru.',
    isFinal: false,
    isError: false,
    color: '#8b5cf6',
    orderIndex: 9,
  },
  {
    code: 'ON_HOLD',
    name: 'Wstrzymane',
    description: 'Sprawa wstrzymana — awaria, spór lub oczekiwanie na wyjaśnienie.',
    isFinal: false,
    isError: false,
    color: '#f97316',
    orderIndex: 10,
  },
  {
    code: 'COMPLETED',
    name: 'Zrealizowane',
    description: 'Przeniesienie numeru zakończone pomyślnie.',
    isFinal: false,
    isError: false,
    color: '#22c55e',
    orderIndex: 11,
  },
  {
    code: 'CLOSED',
    name: 'Zamknięte',
    description: 'Sprawa zamknięta i zarchiwizowana.',
    isFinal: true,
    isError: false,
    color: '#64748b',
    orderIndex: 12,
  },
  {
    code: 'CANCELLED',
    name: 'Anulowane',
    description: 'Wniosek anulowany na życzenie klienta lub z przyczyn formalnych.',
    isFinal: true,
    isError: false,
    color: '#64748b',
    orderIndex: 13,
  },
  {
    code: 'REJECTED_FINAL',
    name: 'Odrzucone definitywnie',
    description: 'Wniosek odrzucony po wyczerpaniu możliwości korekty.',
    isFinal: true,
    isError: true,
    color: '#dc2626',
    orderIndex: 14,
  },
  {
    code: 'OVERDUE',
    name: 'Przeterminowane',
    description: 'Przekroczono termin SLA. Wymagana natychmiastowa interwencja.',
    isFinal: false,
    isError: true,
    color: '#dc2626',
    orderIndex: 15,
  },
]

// ============================================================
// DANE PRZEJŚĆ STATUSÓW
// ============================================================

type TransitionDef = {
  from: string
  to: string
  roles: UserRole[]
  requiresComment: boolean
  isReversal: boolean
  description: string
}

const transitionData: TransitionDef[] = [
  // --- Z NEW ---
  {
    from: 'NEW',
    to: 'IN_VERIFICATION',
    roles: [UserRole.ADMIN, UserRole.BOK_CONSULTANT, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: false,
    isReversal: false,
    description: 'Rozpoczęcie weryfikacji wniosku',
  },
  {
    from: 'NEW',
    to: 'CANCELLED',
    roles: [UserRole.ADMIN, UserRole.BOK_CONSULTANT, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Anulowanie nowego wniosku',
  },

  // --- Z IN_VERIFICATION ---
  {
    from: 'IN_VERIFICATION',
    to: 'WAITING_COMPLETION',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Brakujące dokumenty lub dane — odesłanie do klienta',
  },
  {
    from: 'IN_VERIFICATION',
    to: 'DOCUMENTS_COMPLETE',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: false,
    isReversal: false,
    description: 'Dokumentacja kompletna i zweryfikowana',
  },
  {
    from: 'IN_VERIFICATION',
    to: 'CANCELLED',
    roles: [UserRole.ADMIN, UserRole.BOK_CONSULTANT, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Anulowanie w trakcie weryfikacji',
  },

  // --- Z WAITING_COMPLETION ---
  {
    from: 'WAITING_COMPLETION',
    to: 'IN_VERIFICATION',
    roles: [UserRole.ADMIN, UserRole.BOK_CONSULTANT, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: false,
    isReversal: true,
    description: 'Klient dostarczył brakujące materiały — wznowienie weryfikacji',
  },
  {
    from: 'WAITING_COMPLETION',
    to: 'CANCELLED',
    roles: [UserRole.ADMIN, UserRole.BOK_CONSULTANT, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Anulowanie z powodu braku odpowiedzi klienta',
  },

  // --- Z DOCUMENTS_COMPLETE ---
  {
    from: 'DOCUMENTS_COMPLETE',
    to: 'SENT_TO_DONOR',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: false,
    isReversal: false,
    description: 'Wysłanie wniosku do operatora oddającego',
  },
  {
    from: 'DOCUMENTS_COMPLETE',
    to: 'IN_VERIFICATION',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: true,
    description: 'Cofnięcie — wykryto błąd w dokumentacji',
  },
  {
    from: 'DOCUMENTS_COMPLETE',
    to: 'CANCELLED',
    roles: [UserRole.ADMIN, UserRole.BOK_CONSULTANT, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Anulowanie przed wysłaniem do operatora',
  },

  // --- Z SENT_TO_DONOR ---
  {
    from: 'SENT_TO_DONOR',
    to: 'ACCEPTED_BY_DONOR',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: false,
    isReversal: false,
    description: 'Rejestracja akceptacji przez operatora oddającego',
  },
  {
    from: 'SENT_TO_DONOR',
    to: 'REJECTED_BY_DONOR',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Rejestracja odrzucenia przez operatora oddającego',
  },
  {
    from: 'SENT_TO_DONOR',
    to: 'ON_HOLD',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Wstrzymanie w oczekiwaniu na odpowiedź / wyjaśnienie',
  },
  {
    from: 'SENT_TO_DONOR',
    to: 'CANCELLED',
    roles: [UserRole.ADMIN, UserRole.BOK_CONSULTANT, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Anulowanie po wysłaniu (wycofanie wniosku u operatora)',
  },

  // --- Z REJECTED_BY_DONOR ---
  {
    from: 'REJECTED_BY_DONOR',
    to: 'SENT_TO_DONOR',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: false,
    isReversal: false,
    description: 'Ponowne złożenie po korekcie danych',
  },
  {
    from: 'REJECTED_BY_DONOR',
    to: 'DOCUMENTS_COMPLETE',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: true,
    description: 'Cofnięcie do weryfikacji dokumentów w celu korekty',
  },
  {
    from: 'REJECTED_BY_DONOR',
    to: 'REJECTED_FINAL',
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Definitywne odrzucenie po wyczerpaniu możliwości korekty',
  },
  {
    from: 'REJECTED_BY_DONOR',
    to: 'CANCELLED',
    roles: [UserRole.ADMIN, UserRole.BOK_CONSULTANT, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Anulowanie po odrzuceniu przez operatora',
  },

  // --- Z ACCEPTED_BY_DONOR ---
  {
    from: 'ACCEPTED_BY_DONOR',
    to: 'PORTING_DATE_SET',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: false,
    isReversal: false,
    description: 'Ustalenie daty technicznego przeniesienia',
  },
  {
    from: 'ACCEPTED_BY_DONOR',
    to: 'ON_HOLD',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Wstrzymanie po akceptacji operatora',
  },
  {
    from: 'ACCEPTED_BY_DONOR',
    to: 'CANCELLED',
    roles: [UserRole.ADMIN, UserRole.BOK_CONSULTANT, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Anulowanie mimo akceptacji operatora (klient rezygnuje)',
  },

  // --- Z PORTING_DATE_SET ---
  {
    from: 'PORTING_DATE_SET',
    to: 'TECHNICAL_IN_PROGRESS',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER, UserRole.TECHNICAL],
    requiresComment: false,
    isReversal: false,
    description: 'Rozpoczęcie realizacji technicznej',
  },
  {
    from: 'PORTING_DATE_SET',
    to: 'ON_HOLD',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Wstrzymanie przed realizacją techniczną',
  },
  {
    from: 'PORTING_DATE_SET',
    to: 'CANCELLED',
    roles: [UserRole.ADMIN, UserRole.BOK_CONSULTANT, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Anulowanie z ustaloną datą',
  },

  // --- Z TECHNICAL_IN_PROGRESS ---
  {
    from: 'TECHNICAL_IN_PROGRESS',
    to: 'COMPLETED',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICAL],
    requiresComment: true,
    isReversal: false,
    description: 'Potwierdzenie pomyślnego przeniesienia numeru',
  },
  {
    from: 'TECHNICAL_IN_PROGRESS',
    to: 'ON_HOLD',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER, UserRole.TECHNICAL],
    requiresComment: true,
    isReversal: false,
    description: 'Wstrzymanie z powodu awarii lub problemu technicznego',
  },
  {
    from: 'TECHNICAL_IN_PROGRESS',
    to: 'CANCELLED',
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Anulowanie podczas realizacji technicznej (tylko Kierownik)',
  },

  // --- Z ON_HOLD ---
  {
    from: 'ON_HOLD',
    to: 'TECHNICAL_IN_PROGRESS',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER, UserRole.TECHNICAL],
    requiresComment: true,
    isReversal: true,
    description: 'Wznowienie realizacji technicznej po rozwiązaniu problemu',
  },
  {
    from: 'ON_HOLD',
    to: 'PORTING_DATE_SET',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: true,
    isReversal: true,
    description: 'Wznowienie z nową datą przeniesienia',
  },
  {
    from: 'ON_HOLD',
    to: 'CANCELLED',
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Anulowanie wstrzymanej sprawy',
  },

  // --- Z COMPLETED ---
  {
    from: 'COMPLETED',
    to: 'CLOSED',
    roles: [UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.MANAGER],
    requiresComment: false,
    isReversal: false,
    description: 'Zamknięcie i archiwizacja zrealizowanej sprawy',
  },
  {
    from: 'COMPLETED',
    to: 'TECHNICAL_IN_PROGRESS',
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    requiresComment: true,
    isReversal: true,
    description: 'Cofnięcie — numer nie został prawidłowo przeniesiony (tylko Kierownik)',
  },

  // --- Z OVERDUE ---
  {
    from: 'OVERDUE',
    to: 'IN_VERIFICATION',
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    requiresComment: true,
    isReversal: true,
    description: 'Wznowienie przeterminowanej sprawy od etapu weryfikacji',
  },
  {
    from: 'OVERDUE',
    to: 'CANCELLED',
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    requiresComment: true,
    isReversal: false,
    description: 'Anulowanie przeterminowanej sprawy',
  },

  // --- Z REJECTED_FINAL ---
  {
    from: 'REJECTED_FINAL',
    to: 'CLOSED',
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    requiresComment: false,
    isReversal: false,
    description: 'Zamknięcie definitywnie odrzuconej sprawy',
  },
]

// ============================================================
// MAIN SEED
// ============================================================

export async function seedMain() {
  console.info('🌱 Rozpoczynam seed danych startowych NP-Manager...')

  // ----------------------------------------------------------
  // 1. STATUSY SPRAW
  // ----------------------------------------------------------
  console.info('📋 Tworzenie statusów spraw...')

  const createdStatuses = await Promise.all(
    statusData.map((status) =>
      prisma.caseStatus.upsert({
        where: { code: status.code },
        update: {
          name: status.name,
          description: status.description,
          isFinal: status.isFinal,
          isError: status.isError,
          color: status.color,
          orderIndex: status.orderIndex,
        },
        create: status,
      }),
    ),
  )

  // Mapa: kod statusu → ID
  const statusMap = Object.fromEntries(createdStatuses.map((s) => [s.code, s.id]))
  console.info(`   ✓ Utworzono ${createdStatuses.length} statusów`)

  // ----------------------------------------------------------
  // 2. PRZEJŚCIA STATUSÓW
  // ----------------------------------------------------------
  console.info('🔀 Tworzenie przejść statusów...')

  let transitionCount = 0
  for (const t of transitionData) {
    const fromId = statusMap[t.from]
    const toId = statusMap[t.to]

    if (!fromId || !toId) {
      console.warn(`   ⚠ Pominięto przejście ${t.from} → ${t.to} (brak statusu)`)
      continue
    }

    await prisma.statusTransition.upsert({
      where: { fromStatusId_toStatusId: { fromStatusId: fromId, toStatusId: toId } },
      update: {
        allowedRoles: t.roles,
        requiresComment: t.requiresComment,
        isReversal: t.isReversal,
        description: t.description,
      },
      create: {
        fromStatusId: fromId,
        toStatusId: toId,
        allowedRoles: t.roles,
        requiresComment: t.requiresComment,
        isReversal: t.isReversal,
        description: t.description,
      },
    })
    transitionCount++
  }
  console.info(`   ✓ Utworzono ${transitionCount} przejść statusów`)

  // ----------------------------------------------------------
  // 3. TYPY DOKUMENTÓW
  // ----------------------------------------------------------
  console.info('📄 Tworzenie typów dokumentów...')

  const documentTypes = [
    {
      code: 'IDENTITY_DOCUMENT',
      name: 'Dokument tożsamości',
      description:
        'Dowód osobisty lub paszport posiadacza numeru. Wymagany dla klientów indywidualnych.',
      isRequired: true,
      isActive: true,
    },
    {
      code: 'CONSENT_FOR_PORTING',
      name: 'Zgoda na przeniesienie numeru',
      description:
        'Podpisany formularz zgody na przeniesienie numeru od operatora oddającego. Wymagany zawsze.',
      isRequired: true,
      isActive: true,
    },
    {
      code: 'POWER_OF_ATTORNEY',
      name: 'Pełnomocnictwo',
      description:
        'Pełnomocnictwo do reprezentowania właściciela numeru. Wymagane gdy wnioskodawca jest pełnomocnikiem.',
      isRequired: false,
      isActive: true,
    },
    {
      code: 'COMPANY_REGISTRATION',
      name: 'Dokument rejestrowy firmy',
      description:
        'Aktualny wydruk z KRS lub CEIDG potwierdzający rejestrację firmy. Wymagany dla klientów biznesowych.',
      isRequired: false,
      isActive: true,
    },
    {
      code: 'CONTRACT_COPY',
      name: 'Kopia umowy z operatorem oddającym',
      description:
        'Kopia aktualnej umowy abonenckiej u operatora oddającego (opcjonalne, pomocnicze).',
      isRequired: false,
      isActive: true,
    },
    {
      code: 'OTHER',
      name: 'Inny dokument',
      description: 'Dodatkowy dokument uzupełniający wniosek.',
      isRequired: false,
      isActive: true,
    },
  ]

  for (const dt of documentTypes) {
    await prisma.documentType.upsert({
      where: { code: dt.code },
      update: dt,
      create: dt,
    })
  }
  console.info(`   ✓ Utworzono ${documentTypes.length} typów dokumentów`)

  // ----------------------------------------------------------
  // 4. OPERATORZY TELEKOMUNIKACYJNI
  // ----------------------------------------------------------
  console.info('📡 Tworzenie operatorów telekomunikacyjnych...')

  const operators = [
    {
      name: 'G-NET',
      shortName: 'G-NET',
      routingNumber: 'GNET',
      isRecipientDefault: true,
      isActive: true,
    },
    {
      name: 'Orange Polska',
      shortName: 'Orange',
      routingNumber: 'ORANGE',
      isRecipientDefault: false,
      isActive: true,
    },
    {
      name: 'P4 sp. z o.o.',
      shortName: 'Play',
      routingNumber: 'PLAY',
      isRecipientDefault: false,
      isActive: true,
    },
    {
      name: 'T-Mobile Polska',
      shortName: 'T-Mobile',
      routingNumber: 'TMOBILE',
      isRecipientDefault: false,
      isActive: true,
    },
  ]

  for (const op of operators) {
    await prisma.operator.upsert({
      where: { routingNumber: op.routingNumber },
      update: op,
      create: op,
    })
  }
  console.info(`   ✓ Utworzono ${operators.length} operatorów`)

  // ----------------------------------------------------------
  // 5. KONTO ADMINISTRATORA
  // ----------------------------------------------------------
  console.info('👤 Tworzenie konta administratora...')

  const adminPassword = 'Admin@NP2026!'
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@np-manager.local' },
    update: {
      passwordHash: adminPasswordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email: 'admin@np-manager.local',
      passwordHash: adminPasswordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.info('   ✓ Konto administratora gotowe')
  console.info('   📧  E-mail:  admin@np-manager.local')
  console.info('   🔑  Hasło:   Admin@NP2026!  ← ZMIEŃ PO PIERWSZYM LOGOWANIU')

  // Konto testowe BOK — do weryfikacji RBAC (brak uprawnień ADMIN)
  const publishedTemplateVersionByCode = new Map<
    (typeof COMMUNICATION_TEMPLATE_SEED_DATA)[number]['code'],
    { id: string; versionNumber: number }
  >()

  for (const template of COMMUNICATION_TEMPLATE_SEED_DATA) {
    const family = await prisma.communicationTemplate.upsert({
      where: {
        code_channel: {
          code: template.code,
          channel: template.channel,
        },
      },
      update: {
        code: template.code,
        name: template.name,
        description: template.description,
        channel: template.channel,
        createdByUserId: adminUser.id,
        updatedByUserId: adminUser.id,
      },
      create: {
        id: template.templateId,
        code: template.code,
        name: template.name,
        description: template.description,
        channel: template.channel,
        createdByUserId: adminUser.id,
        updatedByUserId: adminUser.id,
      },
    })

    const existingPublishedVersion = await prisma.communicationTemplateVersion.findFirst({
      where: {
        templateId: family.id,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        versionNumber: true,
      },
    })

    const matchingVersion = await prisma.communicationTemplateVersion.findFirst({
      where: {
        OR: [
          { id: template.versionId },
          {
            templateId: family.id,
            versionNumber: template.versionNumber,
          },
        ],
      },
      select: {
        id: true,
        status: true,
      },
    })

    if (matchingVersion) {
      const shouldPublishVersion =
        !existingPublishedVersion || existingPublishedVersion.id === matchingVersion.id

      await prisma.communicationTemplateVersion.update({
        where: { id: matchingVersion.id },
        data: {
          templateId: family.id,
          versionNumber: template.versionNumber,
          status: shouldPublishVersion ? template.status : matchingVersion.status,
          subjectTemplate: template.subjectTemplate,
          bodyTemplate: template.bodyTemplate,
          createdByUserId: adminUser.id,
          updatedByUserId: adminUser.id,
          publishedAt:
            shouldPublishVersion && template.status === 'PUBLISHED'
              ? new Date('2026-04-01T08:00:00.000Z')
              : null,
          publishedByUserId:
            shouldPublishVersion && template.status === 'PUBLISHED' ? adminUser.id : null,
        },
      })
    } else if (!existingPublishedVersion) {
      await prisma.communicationTemplateVersion.create({
        data: {
          id: template.versionId,
          templateId: family.id,
          versionNumber: template.versionNumber,
          status: template.status,
          subjectTemplate: template.subjectTemplate,
          bodyTemplate: template.bodyTemplate,
          createdByUserId: adminUser.id,
          updatedByUserId: adminUser.id,
          publishedAt: template.status === 'PUBLISHED' ? new Date('2026-04-01T08:00:00.000Z') : null,
          publishedByUserId: template.status === 'PUBLISHED' ? adminUser.id : null,
        },
      })
    }

    const runtimePublishedVersion = await prisma.communicationTemplateVersion.findFirst({
      where: {
        templateId: family.id,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        versionNumber: true,
      },
    })

    if (runtimePublishedVersion) {
      publishedTemplateVersionByCode.set(template.code, runtimePublishedVersion)
    }
  }

  // Konto testowe BOK â€” do weryfikacji RBAC (brak uprawnieĹ„ ADMIN)
  const bokPassword = 'Bok@NP2026!'
  const bokPasswordHash = await bcrypt.hash(bokPassword, 12)

  await prisma.user.upsert({
    where: { email: 'bok@np-manager.local' },
    update: {
      passwordHash: bokPasswordHash,
      firstName: 'Anna',
      lastName: 'Konsultant',
      role: 'BOK_CONSULTANT',
      isActive: true,
    },
    create: {
      email: 'bok@np-manager.local',
      passwordHash: bokPasswordHash,
      firstName: 'Anna',
      lastName: 'Konsultant',
      role: 'BOK_CONSULTANT',
      isActive: true,
    },
  })
  console.info('   ✓ Konto testowe BOK_CONSULTANT gotowe')
  console.info('   📧  E-mail:  bok@np-manager.local')
  console.info('   🔑  Hasło:   Bok@NP2026!')

  // ----------------------------------------------------------
  // 6. DANE QA â€” klient i sprawy portowania
  // ----------------------------------------------------------
  console.info('Tworzenie minimalnych danych QA dla portowania...')

  const qaClient = await prisma.client.upsert({
    where: { pesel: '90010112345' },
    update: {
      clientType: 'INDIVIDUAL',
      firstName: 'Jan',
      lastName: 'Testowy',
      pesel: '90010112345',
      companyName: null,
      nip: null,
      krs: null,
      proxyName: null,
      proxyPesel: null,
      email: 'jan.testowy@np-manager.local',
      phoneContact: '600700800',
      addressStreet: 'ul. Testowa 10/5',
      addressCity: 'Warszawa',
      addressZip: '00-001',
      createdById: adminUser.id,
    },
    create: {
      clientType: 'INDIVIDUAL',
      firstName: 'Jan',
      lastName: 'Testowy',
      pesel: '90010112345',
      email: 'jan.testowy@np-manager.local',
      phoneContact: '600700800',
      addressStreet: 'ul. Testowa 10/5',
      addressCity: 'Warszawa',
      addressZip: '00-001',
      createdById: adminUser.id,
    },
  })

  const recipientOperator = await prisma.operator.findUniqueOrThrow({
    where: { routingNumber: 'GNET' },
  })

  const donorOperator = await prisma.operator.findUniqueOrThrow({
    where: { routingNumber: 'ORANGE' },
  })

  await prisma.portingRequest.upsert({
    where: { caseNumber: 'FNP-SEED-ACTIVE-001' },
    update: {
      clientId: qaClient.id,
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      primaryNumber: '221234567',
      rangeStart: null,
      rangeEnd: null,
      requestDocumentNumber: 'DOC-SEED-ACT-001',
      donorOperatorId: donorOperator.id,
      recipientOperatorId: recipientOperator.id,
      infrastructureOperatorId: null,
      donorRoutingNumber: donorOperator.routingNumber,
      recipientRoutingNumber: recipientOperator.routingNumber,
      requestRegisteredAt: new Date('2026-04-01T09:00:00.000Z'),
      requestedPortDate: new Date('2026-04-15T00:00:00.000Z'),
      requestedPortTime: '00:00',
      earliestAcceptablePortDate: null,
      confirmedPortDate: null,
      donorAssignedPortDate: null,
      donorAssignedPortTime: null,
      portingMode: 'DAY',
      statusInternal: 'SUBMITTED',
      statusPliCbd: null,
      pliCbdCaseId: null,
      pliCbdCaseNumber: null,
      pliCbdPackageId: null,
      pliCbdExportStatus: 'NOT_EXPORTED',
      pliCbdLastSyncAt: null,
      lastExxReceived: null,
      lastPliCbdStatusCode: null,
      lastPliCbdStatusDescription: null,
      rejectionCode: null,
      rejectionReason: null,
      subscriberKind: 'INDIVIDUAL',
      subscriberFirstName: 'Jan',
      subscriberLastName: 'Testowy',
      subscriberCompanyName: null,
      identityType: 'PESEL',
      identityValue: '90010112345',
      correspondenceAddress: 'ul. Testowa 10/5, 00-001 Warszawa',
      hasPowerOfAttorney: false,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'EMAIL',
      internalNotes: 'Seed QA: aktywna sprawa do testu eksportu i synchronizacji PLI CBD.',
      createdByUserId: adminUser.id,
    },
    create: {
      caseNumber: 'FNP-SEED-ACTIVE-001',
      clientId: qaClient.id,
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      primaryNumber: '221234567',
      requestDocumentNumber: 'DOC-SEED-ACT-001',
      donorOperatorId: donorOperator.id,
      recipientOperatorId: recipientOperator.id,
      donorRoutingNumber: donorOperator.routingNumber,
      recipientRoutingNumber: recipientOperator.routingNumber,
      requestRegisteredAt: new Date('2026-04-01T09:00:00.000Z'),
      requestedPortDate: new Date('2026-04-15T00:00:00.000Z'),
      requestedPortTime: '00:00',
      portingMode: 'DAY',
      statusInternal: 'SUBMITTED',
      pliCbdExportStatus: 'NOT_EXPORTED',
      subscriberKind: 'INDIVIDUAL',
      subscriberFirstName: 'Jan',
      subscriberLastName: 'Testowy',
      identityType: 'PESEL',
      identityValue: '90010112345',
      correspondenceAddress: 'ul. Testowa 10/5, 00-001 Warszawa',
      hasPowerOfAttorney: false,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'EMAIL',
      internalNotes: 'Seed QA: aktywna sprawa do testu eksportu i synchronizacji PLI CBD.',
      createdByUserId: adminUser.id,
    },
  })

  await prisma.portingRequest.upsert({
    where: { caseNumber: 'FNP-SEED-PORTED-001' },
    update: {
      clientId: qaClient.id,
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      primaryNumber: '221234568',
      rangeStart: null,
      rangeEnd: null,
      requestDocumentNumber: 'DOC-SEED-PRT-001',
      donorOperatorId: donorOperator.id,
      recipientOperatorId: recipientOperator.id,
      infrastructureOperatorId: null,
      donorRoutingNumber: donorOperator.routingNumber,
      recipientRoutingNumber: recipientOperator.routingNumber,
      requestRegisteredAt: new Date('2026-03-20T08:30:00.000Z'),
      requestedPortDate: new Date('2026-03-28T00:00:00.000Z'),
      requestedPortTime: '00:00',
      earliestAcceptablePortDate: null,
      confirmedPortDate: new Date('2026-03-28T00:00:00.000Z'),
      donorAssignedPortDate: new Date('2026-03-28T00:00:00.000Z'),
      donorAssignedPortTime: '08:00',
      portingMode: 'DAY',
      statusInternal: 'PORTED',
      statusPliCbd: 'PORTED',
      pliCbdCaseId: 'PLI-SEED-PORTED-001',
      pliCbdCaseNumber: 'PLI-SEED-PORTED-001',
      pliCbdPackageId: null,
      pliCbdExportStatus: 'EXPORTED',
      pliCbdLastSyncAt: new Date('2026-03-28T08:15:00.000Z'),
      lastExxReceived: 'E18',
      lastPliCbdStatusCode: 'COMPLETED',
      lastPliCbdStatusDescription:
        'Seed QA: sprawa zakonczona po E18 do testu terminalnego stanu procesu.',
      rejectionCode: null,
      rejectionReason: null,
      subscriberKind: 'INDIVIDUAL',
      subscriberFirstName: 'Jan',
      subscriberLastName: 'Testowy',
      subscriberCompanyName: null,
      identityType: 'PESEL',
      identityValue: '90010112345',
      correspondenceAddress: 'ul. Testowa 10/5, 00-001 Warszawa',
      hasPowerOfAttorney: false,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'EMAIL',
      internalNotes: 'Seed QA: zakonczona sprawa po E18 do testu terminalnego, zablokowanego preview.',
      createdByUserId: adminUser.id,
    },
    create: {
      caseNumber: 'FNP-SEED-PORTED-001',
      clientId: qaClient.id,
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      primaryNumber: '221234568',
      requestDocumentNumber: 'DOC-SEED-PRT-001',
      donorOperatorId: donorOperator.id,
      recipientOperatorId: recipientOperator.id,
      donorRoutingNumber: donorOperator.routingNumber,
      recipientRoutingNumber: recipientOperator.routingNumber,
      requestRegisteredAt: new Date('2026-03-20T08:30:00.000Z'),
      requestedPortDate: new Date('2026-03-28T00:00:00.000Z'),
      requestedPortTime: '00:00',
      confirmedPortDate: new Date('2026-03-28T00:00:00.000Z'),
      donorAssignedPortDate: new Date('2026-03-28T00:00:00.000Z'),
      donorAssignedPortTime: '08:00',
      portingMode: 'DAY',
      statusInternal: 'PORTED',
      statusPliCbd: 'PORTED',
      pliCbdCaseId: 'PLI-SEED-PORTED-001',
      pliCbdCaseNumber: 'PLI-SEED-PORTED-001',
      pliCbdExportStatus: 'EXPORTED',
      pliCbdLastSyncAt: new Date('2026-03-28T08:15:00.000Z'),
      lastExxReceived: 'E18',
      lastPliCbdStatusCode: 'COMPLETED',
      lastPliCbdStatusDescription:
        'Seed QA: sprawa zakonczona po E18 do testu terminalnego stanu procesu.',
      subscriberKind: 'INDIVIDUAL',
      subscriberFirstName: 'Jan',
      subscriberLastName: 'Testowy',
      identityType: 'PESEL',
      identityValue: '90010112345',
      correspondenceAddress: 'ul. Testowa 10/5, 00-001 Warszawa',
      hasPowerOfAttorney: false,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'EMAIL',
      internalNotes: 'Seed QA: zakonczona sprawa po E18 do testu terminalnego, zablokowanego preview.',
      createdByUserId: adminUser.id,
    },
  })

  await prisma.portingRequest.upsert({
    where: { caseNumber: 'FNP-SEED-E18-001' },
    update: {
      clientId: qaClient.id,
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      primaryNumber: '221234570',
      rangeStart: null,
      rangeEnd: null,
      requestDocumentNumber: 'DOC-SEED-E18-001',
      donorOperatorId: donorOperator.id,
      recipientOperatorId: recipientOperator.id,
      infrastructureOperatorId: null,
      donorRoutingNumber: donorOperator.routingNumber,
      recipientRoutingNumber: recipientOperator.routingNumber,
      requestRegisteredAt: new Date('2026-03-24T08:45:00.000Z'),
      requestedPortDate: new Date('2026-04-14T00:00:00.000Z'),
      requestedPortTime: '00:00',
      earliestAcceptablePortDate: null,
      confirmedPortDate: new Date('2026-04-14T00:00:00.000Z'),
      donorAssignedPortDate: new Date('2026-04-14T00:00:00.000Z'),
      donorAssignedPortTime: '07:00',
      portingMode: 'DAY',
      statusInternal: 'PORTED',
      statusPliCbd: 'READY_TO_PORT',
      pliCbdCaseId: 'PLI-SEED-E18-001',
      pliCbdCaseNumber: 'PLI-SEED-E18-001',
      pliCbdPackageId: null,
      pliCbdExportStatus: 'EXPORTED',
      pliCbdLastSyncAt: new Date('2026-04-14T07:15:00.000Z'),
      lastExxReceived: 'E13',
      lastPliCbdStatusCode: 'READY_TO_PORT',
      lastPliCbdStatusDescription:
        'Seed QA: termin uzgodniony po E13, numer przeniesiony technicznie, oczekuje na potwierdzenie E18.',
      rejectionCode: null,
      rejectionReason: null,
      subscriberKind: 'INDIVIDUAL',
      subscriberFirstName: 'Maria',
      subscriberLastName: 'Nowak',
      subscriberCompanyName: null,
      identityType: 'PESEL',
      identityValue: '88080834567',
      correspondenceAddress: 'ul. Lacznosci 18/4, 00-120 Warszawa',
      hasPowerOfAttorney: false,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'EMAIL',
      internalNotes:
        'Seed QA: sprawa READY_TO_PORT / PORTED do testu happy path preview Draft E18.',
      createdByUserId: adminUser.id,
    },
    create: {
      caseNumber: 'FNP-SEED-E18-001',
      clientId: qaClient.id,
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      primaryNumber: '221234570',
      requestDocumentNumber: 'DOC-SEED-E18-001',
      donorOperatorId: donorOperator.id,
      recipientOperatorId: recipientOperator.id,
      donorRoutingNumber: donorOperator.routingNumber,
      recipientRoutingNumber: recipientOperator.routingNumber,
      requestRegisteredAt: new Date('2026-03-24T08:45:00.000Z'),
      requestedPortDate: new Date('2026-04-14T00:00:00.000Z'),
      requestedPortTime: '00:00',
      confirmedPortDate: new Date('2026-04-14T00:00:00.000Z'),
      donorAssignedPortDate: new Date('2026-04-14T00:00:00.000Z'),
      donorAssignedPortTime: '07:00',
      portingMode: 'DAY',
      statusInternal: 'PORTED',
      statusPliCbd: 'READY_TO_PORT',
      pliCbdCaseId: 'PLI-SEED-E18-001',
      pliCbdCaseNumber: 'PLI-SEED-E18-001',
      pliCbdExportStatus: 'EXPORTED',
      pliCbdLastSyncAt: new Date('2026-04-14T07:15:00.000Z'),
      lastExxReceived: 'E13',
      lastPliCbdStatusCode: 'READY_TO_PORT',
      lastPliCbdStatusDescription:
        'Seed QA: termin uzgodniony po E13, numer przeniesiony technicznie, oczekuje na potwierdzenie E18.',
      subscriberKind: 'INDIVIDUAL',
      subscriberFirstName: 'Maria',
      subscriberLastName: 'Nowak',
      identityType: 'PESEL',
      identityValue: '88080834567',
      correspondenceAddress: 'ul. Lacznosci 18/4, 00-120 Warszawa',
      hasPowerOfAttorney: false,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'EMAIL',
      internalNotes:
        'Seed QA: sprawa READY_TO_PORT / PORTED do testu happy path preview Draft E18.',
      createdByUserId: adminUser.id,
    },
  })

  const communicationDraftRequest = await prisma.portingRequest.upsert({
    where: { caseNumber: 'FNP-SEED-COMM-DRAFT-001' },
    update: {
      clientId: qaClient.id,
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      primaryNumber: '221234571',
      rangeStart: null,
      rangeEnd: null,
      requestDocumentNumber: 'DOC-SEED-COMM-DR-001',
      donorOperatorId: donorOperator.id,
      recipientOperatorId: recipientOperator.id,
      infrastructureOperatorId: null,
      donorRoutingNumber: donorOperator.routingNumber,
      recipientRoutingNumber: recipientOperator.routingNumber,
      requestRegisteredAt: new Date('2026-04-02T09:15:00.000Z'),
      requestedPortDate: new Date('2026-04-18T00:00:00.000Z'),
      requestedPortTime: '00:00',
      earliestAcceptablePortDate: null,
      confirmedPortDate: null,
      donorAssignedPortDate: null,
      donorAssignedPortTime: null,
      portingMode: 'DAY',
      statusInternal: 'SUBMITTED',
      statusPliCbd: null,
      pliCbdCaseId: null,
      pliCbdCaseNumber: null,
      pliCbdPackageId: null,
      pliCbdExportStatus: 'NOT_EXPORTED',
      pliCbdLastSyncAt: null,
      lastExxReceived: null,
      lastPliCbdStatusCode: null,
      lastPliCbdStatusDescription: null,
      rejectionCode: null,
      rejectionReason: null,
      subscriberKind: 'INDIVIDUAL',
      subscriberFirstName: 'Jan',
      subscriberLastName: 'Testowy',
      subscriberCompanyName: null,
      identityType: 'PESEL',
      identityValue: '90010112345',
      correspondenceAddress: 'ul. Testowa 10/5, 00-001 Warszawa',
      hasPowerOfAttorney: false,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'EMAIL',
      internalNotes:
        'Seed QA: sprawa z dostepna akcja "Utworz draft" w panelu komunikacji dla ADMIN i BOK.',
      createdByUserId: adminUser.id,
    },
    create: {
      caseNumber: 'FNP-SEED-COMM-DRAFT-001',
      clientId: qaClient.id,
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      primaryNumber: '221234571',
      requestDocumentNumber: 'DOC-SEED-COMM-DR-001',
      donorOperatorId: donorOperator.id,
      recipientOperatorId: recipientOperator.id,
      donorRoutingNumber: donorOperator.routingNumber,
      recipientRoutingNumber: recipientOperator.routingNumber,
      requestRegisteredAt: new Date('2026-04-02T09:15:00.000Z'),
      requestedPortDate: new Date('2026-04-18T00:00:00.000Z'),
      requestedPortTime: '00:00',
      portingMode: 'DAY',
      statusInternal: 'SUBMITTED',
      pliCbdExportStatus: 'NOT_EXPORTED',
      subscriberKind: 'INDIVIDUAL',
      subscriberFirstName: 'Jan',
      subscriberLastName: 'Testowy',
      identityType: 'PESEL',
      identityValue: '90010112345',
      correspondenceAddress: 'ul. Testowa 10/5, 00-001 Warszawa',
      hasPowerOfAttorney: false,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'EMAIL',
      internalNotes:
        'Seed QA: sprawa z dostepna akcja "Utworz draft" w panelu komunikacji dla ADMIN i BOK.',
      createdByUserId: adminUser.id,
    },
  })

  const communicationDuplicateRequest = await prisma.portingRequest.upsert({
    where: { caseNumber: 'FNP-SEED-COMM-DUPLICATE-001' },
    update: {
      clientId: qaClient.id,
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      primaryNumber: '221234572',
      rangeStart: null,
      rangeEnd: null,
      requestDocumentNumber: 'DOC-SEED-COMM-DUP-001',
      donorOperatorId: donorOperator.id,
      recipientOperatorId: recipientOperator.id,
      infrastructureOperatorId: null,
      donorRoutingNumber: donorOperator.routingNumber,
      recipientRoutingNumber: recipientOperator.routingNumber,
      requestRegisteredAt: new Date('2026-04-03T08:40:00.000Z'),
      requestedPortDate: new Date('2026-04-19T00:00:00.000Z'),
      requestedPortTime: '00:00',
      earliestAcceptablePortDate: null,
      confirmedPortDate: null,
      donorAssignedPortDate: null,
      donorAssignedPortTime: null,
      portingMode: 'DAY',
      statusInternal: 'SUBMITTED',
      statusPliCbd: null,
      pliCbdCaseId: null,
      pliCbdCaseNumber: null,
      pliCbdPackageId: null,
      pliCbdExportStatus: 'NOT_EXPORTED',
      pliCbdLastSyncAt: null,
      lastExxReceived: null,
      lastPliCbdStatusCode: null,
      lastPliCbdStatusDescription: null,
      rejectionCode: null,
      rejectionReason: null,
      subscriberKind: 'INDIVIDUAL',
      subscriberFirstName: 'Jan',
      subscriberLastName: 'Testowy',
      subscriberCompanyName: null,
      identityType: 'PESEL',
      identityValue: '90010112345',
      correspondenceAddress: 'ul. Testowa 10/5, 00-001 Warszawa',
      hasPowerOfAttorney: false,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'EMAIL',
      internalNotes:
        'Seed QA: sprawa z aktywnym draftem CLIENT_CONFIRMATION do testu blokady duplikatu.',
      createdByUserId: adminUser.id,
    },
    create: {
      caseNumber: 'FNP-SEED-COMM-DUPLICATE-001',
      clientId: qaClient.id,
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      primaryNumber: '221234572',
      requestDocumentNumber: 'DOC-SEED-COMM-DUP-001',
      donorOperatorId: donorOperator.id,
      recipientOperatorId: recipientOperator.id,
      donorRoutingNumber: donorOperator.routingNumber,
      recipientRoutingNumber: recipientOperator.routingNumber,
      requestRegisteredAt: new Date('2026-04-03T08:40:00.000Z'),
      requestedPortDate: new Date('2026-04-19T00:00:00.000Z'),
      requestedPortTime: '00:00',
      portingMode: 'DAY',
      statusInternal: 'SUBMITTED',
      pliCbdExportStatus: 'NOT_EXPORTED',
      subscriberKind: 'INDIVIDUAL',
      subscriberFirstName: 'Jan',
      subscriberLastName: 'Testowy',
      identityType: 'PESEL',
      identityValue: '90010112345',
      correspondenceAddress: 'ul. Testowa 10/5, 00-001 Warszawa',
      hasPowerOfAttorney: false,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'EMAIL',
      internalNotes:
        'Seed QA: sprawa z aktywnym draftem CLIENT_CONFIRMATION do testu blokady duplikatu.',
      createdByUserId: adminUser.id,
    },
  })

  const communicationFailedRequest = await prisma.portingRequest.upsert({
    where: { caseNumber: QA_FAILED_COMMUNICATION_SEED_FIXTURE.caseNumber },
    update: {
      clientId: qaClient.id,
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      primaryNumber: QA_FAILED_COMMUNICATION_SEED_FIXTURE.primaryNumber,
      rangeStart: null,
      rangeEnd: null,
      requestDocumentNumber: QA_FAILED_COMMUNICATION_SEED_FIXTURE.requestDocumentNumber,
      donorOperatorId: donorOperator.id,
      recipientOperatorId: recipientOperator.id,
      infrastructureOperatorId: null,
      donorRoutingNumber: donorOperator.routingNumber,
      recipientRoutingNumber: recipientOperator.routingNumber,
      requestRegisteredAt: new Date(QA_FAILED_COMMUNICATION_SEED_FIXTURE.requestRegisteredAt),
      requestedPortDate: new Date(QA_FAILED_COMMUNICATION_SEED_FIXTURE.requestedPortDate),
      requestedPortTime: '00:00',
      earliestAcceptablePortDate: null,
      confirmedPortDate: null,
      donorAssignedPortDate: null,
      donorAssignedPortTime: null,
      portingMode: 'DAY',
      statusInternal: 'SUBMITTED',
      statusPliCbd: null,
      pliCbdCaseId: null,
      pliCbdCaseNumber: null,
      pliCbdPackageId: null,
      pliCbdExportStatus: 'NOT_EXPORTED',
      pliCbdLastSyncAt: null,
      lastExxReceived: null,
      lastPliCbdStatusCode: null,
      lastPliCbdStatusDescription: null,
      rejectionCode: null,
      rejectionReason: null,
      subscriberKind: 'INDIVIDUAL',
      subscriberFirstName: 'Jan',
      subscriberLastName: 'Testowy',
      subscriberCompanyName: null,
      identityType: 'PESEL',
      identityValue: '90010112345',
      correspondenceAddress: 'ul. Testowa 10/5, 00-001 Warszawa',
      hasPowerOfAttorney: false,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'EMAIL',
      internalNotes: QA_FAILED_COMMUNICATION_SEED_FIXTURE.internalNotes,
      createdByUserId: adminUser.id,
    },
    create: {
      caseNumber: QA_FAILED_COMMUNICATION_SEED_FIXTURE.caseNumber,
      clientId: qaClient.id,
      numberType: 'FIXED_LINE',
      numberRangeKind: 'SINGLE',
      primaryNumber: QA_FAILED_COMMUNICATION_SEED_FIXTURE.primaryNumber,
      requestDocumentNumber: QA_FAILED_COMMUNICATION_SEED_FIXTURE.requestDocumentNumber,
      donorOperatorId: donorOperator.id,
      recipientOperatorId: recipientOperator.id,
      donorRoutingNumber: donorOperator.routingNumber,
      recipientRoutingNumber: recipientOperator.routingNumber,
      requestRegisteredAt: new Date(QA_FAILED_COMMUNICATION_SEED_FIXTURE.requestRegisteredAt),
      requestedPortDate: new Date(QA_FAILED_COMMUNICATION_SEED_FIXTURE.requestedPortDate),
      requestedPortTime: '00:00',
      portingMode: 'DAY',
      statusInternal: 'SUBMITTED',
      pliCbdExportStatus: 'NOT_EXPORTED',
      subscriberKind: 'INDIVIDUAL',
      subscriberFirstName: 'Jan',
      subscriberLastName: 'Testowy',
      identityType: 'PESEL',
      identityValue: '90010112345',
      correspondenceAddress: 'ul. Testowa 10/5, 00-001 Warszawa',
      hasPowerOfAttorney: false,
      linkedWholesaleServiceOnRecipientSide: false,
      contactChannel: 'EMAIL',
      internalNotes: QA_FAILED_COMMUNICATION_SEED_FIXTURE.internalNotes,
      createdByUserId: adminUser.id,
    },
  })

  await prisma.portingCommunication.deleteMany({
    where: {
      portingRequestId: {
        in: [communicationDraftRequest.id, communicationDuplicateRequest.id, communicationFailedRequest.id],
      },
    },
  })

  await prisma.portingCommunication.create({
    data: {
      id: '00000000-0000-4000-8000-000000000701',
      portingRequestId: communicationDuplicateRequest.id,
      type: 'EMAIL',
      status: 'DRAFT',
      triggerType: 'CASE_RECEIVED',
      recipient: qaClient.email,
      subject: 'Potwierdzenie przyjecia sprawy portowania',
      body:
        'Dzien dobry,\n\npotwierdzamy przyjecie sprawy portowania numeru. To jest seed QA do testu blokady duplikatu draftu komunikacji.\n\nPozdrawiamy,\nNP-Manager',
      templateKey: 'client_confirmation',
      createdByUserId: adminUser.id,
      metadata: {
        actionType: 'CLIENT_CONFIRMATION',
        actionLabel: 'Potwierdzenie dla klienta',
        communicationTemplateCode: 'REQUEST_RECEIVED',
        communicationTemplateVersionId:
          publishedTemplateVersionByCode.get('REQUEST_RECEIVED')?.id ??
          '00000000-0000-4000-9000-000000000801',
        communicationTemplateVersionNumber:
          publishedTemplateVersionByCode.get('REQUEST_RECEIVED')?.versionNumber ?? 1,
        seedFixture: 'FNP-SEED-COMM-DUPLICATE-001',
      },
      createdAt: new Date('2026-04-03T09:00:00.000Z'),
      updatedAt: new Date('2026-04-03T09:00:00.000Z'),
    },
  })

  await prisma.portingCommunication.create({
    data: {
      id: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.id,
      portingRequestId: communicationFailedRequest.id,
      type: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.type,
      status: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.status,
      triggerType: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.triggerType,
      recipient: qaClient.email,
      subject: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.subject,
      body: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.body,
      templateKey: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.templateKey,
      createdByUserId: adminUser.id,
      sentAt: null,
      errorMessage: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.errorMessage,
      metadata: {
        actionType: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.actionType,
        actionLabel: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.actionLabel,
        issueDescription: 'Brak podpisanego pelnomocnictwa i potwierdzenia danych adresowych.',
        communicationTemplateCode: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.templateCode,
        communicationTemplateVersionId:
          publishedTemplateVersionByCode.get(
            QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.templateCode,
          )?.id ?? '00000000-0000-4000-9000-000000000804',
        communicationTemplateVersionNumber:
          publishedTemplateVersionByCode.get(
            QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.templateCode,
          )?.versionNumber ?? 1,
        seedFixture: QA_FAILED_COMMUNICATION_SEED_FIXTURE.caseNumber,
      },
      createdAt: new Date(QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.createdAt),
      updatedAt: new Date(QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.updatedAt),
    },
  })

  await prisma.communicationDeliveryAttempt.create({
    data: {
      id: QA_FAILED_COMMUNICATION_SEED_FIXTURE.deliveryAttempt.id,
      communicationId: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.id,
      attemptedAt: new Date(QA_FAILED_COMMUNICATION_SEED_FIXTURE.deliveryAttempt.attemptedAt),
      attemptedByUserId: adminUser.id,
      channel: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.type,
      recipient: qaClient.email,
      subjectSnapshot: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.subject,
      bodySnapshot: QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.body,
      outcome: QA_FAILED_COMMUNICATION_SEED_FIXTURE.deliveryAttempt.outcome,
      errorCode: QA_FAILED_COMMUNICATION_SEED_FIXTURE.deliveryAttempt.errorCode,
      errorMessage: QA_FAILED_COMMUNICATION_SEED_FIXTURE.deliveryAttempt.errorMessage,
      responsePayloadJson:
        QA_FAILED_COMMUNICATION_SEED_FIXTURE.deliveryAttempt.responsePayloadJson as Record<
          string,
          string
        >,
      adapterName: QA_FAILED_COMMUNICATION_SEED_FIXTURE.deliveryAttempt.adapterName,
      transportMessageId: null,
      transportReference: null,
      createdAt: new Date(QA_FAILED_COMMUNICATION_SEED_FIXTURE.deliveryAttempt.attemptedAt),
    },
  })

  const notificationFailureQueueRequestIdByCaseNumber = new Map([
    [communicationFailedRequest.caseNumber, communicationFailedRequest.id],
    [communicationDuplicateRequest.caseNumber, communicationDuplicateRequest.id],
  ])

  await prisma.internalNotificationDeliveryAttempt.deleteMany({
    where: {
      id: {
        in: QA_NOTIFICATION_FAILURE_QUEUE_SEED_FIXTURES.map((attempt) => attempt.id),
      },
    },
  })

  for (const attempt of QA_NOTIFICATION_FAILURE_QUEUE_SEED_FIXTURES) {
    const requestId = notificationFailureQueueRequestIdByCaseNumber.get(attempt.requestCaseNumber)

    if (!requestId) {
      throw new Error(`Brak sprawy seed dla kolejki powiadomien: ${attempt.requestCaseNumber}`)
    }

    await prisma.internalNotificationDeliveryAttempt.create({
      data: {
        id: attempt.id,
        requestId,
        eventCode: attempt.eventCode,
        eventLabel: attempt.eventLabel,
        attemptOrigin: attempt.attemptOrigin,
        channel: attempt.channel,
        recipient: attempt.recipient,
        mode: attempt.mode,
        outcome: attempt.outcome,
        errorCode: attempt.errorCode,
        errorMessage: attempt.errorMessage,
        failureKind: attempt.failureKind,
        retryCount: attempt.retryCount,
        isLatestForChain: attempt.isLatestForChain,
        triggeredByUserId: adminUser.id,
        createdAt: new Date(attempt.createdAt),
      },
    })
  }

  console.info(
    'Dodano klienta QA oraz 6 spraw portowania (aktywna + zakonczona po E18 + READY_TO_PORT/E18 + komunikacja create-draft + komunikacja duplicate-block + komunikacja failed-retry) + 2 rekordy QA kolejki bledow notyfikacji',
  )

  // ----------------------------------------------------------
  // 7. USTAWIENIA SYSTEMOWE
  // ----------------------------------------------------------
  console.info('⚙️  Tworzenie ustawień systemowych...')

  const settings = [
    {
      key: 'sla_days_total',
      value: '4',
      type: 'number',
      label: 'Łączny czas SLA (dni robocze)',
    },
    {
      key: 'sla_alert_hours_first',
      value: '24',
      type: 'number',
      label: 'Pierwszy alert SLA (godziny przed terminem)',
    },
    {
      key: 'sla_alert_hours_critical',
      value: '4',
      type: 'number',
      label: 'Krytyczny alert SLA (godziny przed terminem)',
    },
    {
      key: 'donor_response_days',
      value: '2',
      type: 'number',
      label: 'Maks. dni oczekiwania na odpowiedź operatora oddającego',
    },
    {
      key: 'max_file_size_mb',
      value: '10',
      type: 'number',
      label: 'Maksymalny rozmiar pliku (MB)',
    },
    {
      key: 'max_retry_count',
      value: '3',
      type: 'number',
      label: 'Maks. liczba ponownych złożeń po odrzuceniu przez operatora',
    },
    {
      key: 'allowed_mime_types',
      value: JSON.stringify(['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']),
      type: 'json',
      label: 'Dozwolone typy plików (MIME)',
    },
    // PR13A - powiadomienia wewnetrzne (routing zdarzen portowania)
    {
      key: 'porting_status_notify_shared_emails',
      value: 'bok@multiplay.pl,sud@multiplay.pl',
      type: 'string',
      label:
        'Domyslni odbiorcy powiadomien statusowych portowania (e-mail, rozdzielone przecinkami)',
    },
    {
      key: 'porting_status_teams_enabled',
      value: 'false',
      type: 'boolean',
      label: 'Wlacz powiadomienia Teams dla statusowych zdarzen portowania',
    },
    {
      key: 'porting_status_notify_shared_teams_webhook',
      value: '',
      type: 'string',
      label: 'URL webhooka Teams dla statusowych powiadomien portowania',
    },
    {
      key: 'porting_notify_shared_emails',
      value: 'bok@multiplay.pl,sud@multiplay.pl',
      type: 'string',
      label: 'Domyslni odbiorcy powiadomien portowania (legacy key)',
    },
    {
      key: 'porting_notify_teams_enabled',
      value: 'false',
      type: 'boolean',
      label: 'Wlacz powiadomienia Teams dla zdarzen portowania (legacy key)',
    },
    {
      key: 'porting_notify_teams_webhook',
      value: '',
      type: 'string',
      label: 'URL webhooka Teams dla powiadomien portowania (legacy key)',
    },
  ]

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, label: setting.label },
      create: setting,
    })
  }
  console.info(`   ✓ Utworzono ${settings.length} ustawień systemowych`)

  // ----------------------------------------------------------
  // 8. KALENDARZ ŚWIĄT 2026
  // ----------------------------------------------------------
  console.info('📅 Tworzenie kalendarza dni wolnych 2026...')

  const holidays2026 = [
    { date: new Date('2026-01-01'), name: 'Nowy Rok' },
    { date: new Date('2026-01-06'), name: 'Trzech Króli (Objawienie Pańskie)' },
    { date: new Date('2026-04-05'), name: 'Niedziela Wielkanocna' },
    { date: new Date('2026-04-06'), name: 'Poniedziałek Wielkanocny' },
    { date: new Date('2026-05-01'), name: 'Święto Pracy' },
    { date: new Date('2026-05-03'), name: 'Święto Konstytucji 3 Maja' },
    { date: new Date('2026-05-24'), name: 'Zielone Świątki (Niedziela)' },
    { date: new Date('2026-06-04'), name: 'Boże Ciało' },
    { date: new Date('2026-08-15'), name: 'Wniebowzięcie Najświętszej Maryi Panny' },
    { date: new Date('2026-11-01'), name: 'Wszystkich Świętych' },
    { date: new Date('2026-11-11'), name: 'Święto Niepodległości' },
    { date: new Date('2026-12-25'), name: 'Boże Narodzenie (I dzień)' },
    { date: new Date('2026-12-26'), name: 'Boże Narodzenie (II dzień)' },
  ]

  for (const holiday of holidays2026) {
    await prisma.workingCalendar.upsert({
      where: { date: holiday.date },
      update: { name: holiday.name, isWorkingDay: false },
      create: {
        date: holiday.date,
        isWorkingDay: false,
        name: holiday.name,
        year: 2026,
      },
    })
  }
  console.info(`   ✓ Dodano ${holidays2026.length} dni wolnych na rok 2026`)

  console.info('')
  console.info('✅ Seed zakończony pomyślnie!')
  console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.info('  Dane startowe:')
  console.info(`  • ${createdStatuses.length} statusów spraw`)
  console.info(`  • ${transitionCount} przejść statusów`)
  console.info(`  • ${documentTypes.length} typów dokumentów`)
  console.info(`  • ${operators.length} operatorów`)
  console.info('  • 2 konta użytkowników (ADMIN + BOK_CONSULTANT)')
  console.info(`  • ${settings.length} ustawień systemowych`)
  console.info(`  • ${holidays2026.length} dni wolnych 2026`)
  console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

if (require.main === module) {
  seedMain()
    .catch((err) => {
      console.error('❌ Błąd podczas seeda:', err)
      process.exit(1)
    })
    .finally(() => {
      void prisma.$disconnect()
    })
}
