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

async function main() {
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

  await prisma.user.upsert({
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
  // 6. USTAWIENIA SYSTEMOWE
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
  // 7. KALENDARZ ŚWIĄT 2026
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

main()
  .catch((err) => {
    console.error('❌ Błąd podczas seeda:', err)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
