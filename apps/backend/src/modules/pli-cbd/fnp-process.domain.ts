import type {
  FnpExxMessage,
  FnpProcessStage,
  PliCbdExxType,
  PliCbdExportStatus,
  PortingCaseStatus,
} from '@np-manager/shared'

// ============================================================
// MAPOWANIE STATUS WEWNETRZNY + PLI CBD → ETAP FNP
// ============================================================

/**
 * Wyprowadza aktualny etap procesu FNP na podstawie pol sprawy.
 *
 * Logika:
 * 1. Statusy terminalne (REJECTED, CANCELLED, ERROR) → natychmiast.
 * 1a. PORTED staje sie terminalne dopiero po wyslaniu E18.
 * 2. Niewyeksportowana → NOT_IN_PROCESS.
 * 3. EXPORT_PENDING → czeka na rejestracje w PLI.
 * 4. EXPORTED / SYNC_ERROR → etap zalezy od ostatniego komunikatu Exx.
 */
export function deriveFnpProcessStage(fields: {
  statusInternal: PortingCaseStatus
  pliCbdExportStatus: PliCbdExportStatus
  lastExxReceived: PliCbdExxType | null
}): FnpProcessStage {
  const { statusInternal, pliCbdExportStatus, lastExxReceived } = fields

  // Statusy terminalne — jednoznaczne, niezalezne od PLI CBD
  if (statusInternal === 'REJECTED') return 'REJECTED'
  if (statusInternal === 'CANCELLED') return 'CANCELLED'
  if (statusInternal === 'ERROR') return 'PROCESS_ERROR'

  // Sprawa nie trafila jeszcze do PLI CBD
  if (pliCbdExportStatus === 'NOT_EXPORTED') return 'NOT_IN_PROCESS'

  // Wyeksportowana, czeka na rejestracje
  if (pliCbdExportStatus === 'EXPORT_PENDING') return 'EXPORT_PENDING'

  // EXPORTED lub SYNC_ERROR — etap zalezy od ostatniego Exx
  // Brak Exx → PLI CBD przetwarza, czekamy na E06 od Dawcy
  if (!lastExxReceived) return 'AWAITING_DONOR_E06'

  // E06 otrzymane od Dawcy
  if (lastExxReceived === 'E06') {
    // Jesli sprawa w PENDING_DONOR — Biorca moze potwierdzic date (wyslac E12)
    if (statusInternal === 'PENDING_DONOR') return 'AWAITING_E12'
    // Jesli juz CONFIRMED — E12 zostalo wyslane, czekamy na E13
    if (statusInternal === 'CONFIRMED') return 'AWAITING_E13'
    // Fallback (np. stan przejsciowy)
    return 'AWAITING_E12'
  }

  // E12 wyslane przez Biorca — czekamy na E13 od Dawcy
  if (lastExxReceived === 'E12') return 'AWAITING_E13'

  // E13 otrzymane — termin ostateczny uzgodniony, sprawa gotowa do przeniesienia
  if (lastExxReceived === 'E13') return 'READY_TO_PORT'

  // E18 wyslane — przeniesienie zakonczone
  if (lastExxReceived === 'E18') return 'COMPLETED'

  // E23 — anulowanie zostalo wysylane / przetworzone
  if (lastExxReceived === 'E23') return 'CANCELLED'

  // E16 — blad walidacyjny, sprawa zawieszona
  if (lastExxReceived === 'E16') return 'PROCESS_ERROR'

  // Po technicznym przeniesieniu numeru, ale przed wyslaniem E18, pozostajemy
  // w etapie READY_TO_PORT — to stan, w ktorym preview E18 ma byc gotowe.
  if (statusInternal === 'PORTED') return 'READY_TO_PORT'

  // Pozostale Exx (E17, E31, E03 jako echo itp.) — zachowaj etap oparty na statusie
  if (statusInternal === 'CONFIRMED') return 'AWAITING_E13'
  if (statusInternal === 'PENDING_DONOR') return 'AWAITING_E12'

  return 'AWAITING_DONOR_E06'
}

// ============================================================
// DOZWOLONE NASTEPNE KOMUNIKATY BIORACY → PLI CBD
// ============================================================

/**
 * Zwraca liste komunikatow Exx, ktore Biorca moze zainicjowac
 * na aktualnym etapie procesu.
 *
 * Uwagi:
 * - E06 i E13 sa wychodzace od Dawcy — nie sa tutaj uwzglednianie.
 * - E23 (anulowanie) jest dostepne na wiekszosci aktywnych etapow.
 * - E03 odpowiada aktualnej operacji "eksport".
 * - E12 odpowiada potwierdzeniu terminu po stronie Biorcy.
 * - E18 odpowiada potwierdzeniu wykonania przeniesienia po stronie Biorcy.
 */
export function getAllowedNextMessages(stage: FnpProcessStage): FnpExxMessage[] {
  switch (stage) {
    case 'NOT_IN_PROCESS':
      // Mozna wyslac E03 (wniosek przeniesienia) lub jeszcze nie — sprawa musi byc SUBMITTED
      return ['E03']

    case 'EXPORT_PENDING':
      // Czekamy na PLI CBD — mozemy anulowac
      return ['E23']

    case 'AWAITING_DONOR_E06':
      // Czekamy na odpowiedz Dawcy — mozemy anulowac
      return ['E23']

    case 'AWAITING_E12':
      // Biorca moze potwierdzic date (E12) lub anulowac
      return ['E12', 'E23']

    case 'AWAITING_E13':
      // Czekamy na Dawce — mozemy anulowac
      return ['E23']

    case 'READY_TO_PORT':
      // Po przeniesieniu Biorca wysyla E18; mozna jeszcze anulowac przed D
      return ['E18', 'E23']

    case 'COMPLETED':
    case 'REJECTED':
    case 'CANCELLED':
    case 'PROCESS_ERROR':
      return []
  }
}

// ============================================================
// METADANE ETAPOW — opisy dla UI
// ============================================================

export interface FnpProcessStageMetadata {
  label: string
  description: string
  /** Kolor jako token Tailwind (dla UI). */
  colorClass: string
  /** Czy etap jest aktywny (mozliwe sa dalsze akcje). */
  isActive: boolean
  /** Czy etap jest terminalny (brak dalszych krokow). */
  isTerminal: boolean
}

export const FNP_PROCESS_STAGE_METADATA: Record<FnpProcessStage, FnpProcessStageMetadata> = {
  NOT_IN_PROCESS: {
    label: 'Poza procesem PLI CBD',
    description: 'Sprawa nie zostala jeszcze zarejestrowana w systemie PLI CBD.',
    colorClass: 'bg-gray-100 text-gray-600',
    isActive: true,
    isTerminal: false,
  },
  EXPORT_PENDING: {
    label: 'Oczekuje na rejestracje w PLI CBD',
    description: 'Wniosek zostal wyeksportowany i czeka na potwierdzenie rejestracji przez PLI CBD.',
    colorClass: 'bg-amber-100 text-amber-700',
    isActive: true,
    isTerminal: false,
  },
  AWAITING_DONOR_E06: {
    label: 'Oczekuje na odpowiedz Dawcy (E06)',
    description: 'Wniosek E03 zostal zarejestrowany w PLI CBD. Oczekiwanie na odpowiedz operatora oddajacego.',
    colorClass: 'bg-blue-100 text-blue-700',
    isActive: true,
    isTerminal: false,
  },
  AWAITING_E12: {
    label: 'Wymagane potwierdzenie terminu (E12)',
    description: 'Dawca odpowiedzial na wniosek (E06). Biorca musi potwierdzic proponowany termin przeniesienia.',
    colorClass: 'bg-violet-100 text-violet-700',
    isActive: true,
    isTerminal: false,
  },
  AWAITING_E13: {
    label: 'Oczekuje na potwierdzenie terminu przez Dawce (E13)',
    description: 'Biorca potwierdzil termin (E12). Oczekiwanie na ostateczne potwierdzenie przez Dawce.',
    colorClass: 'bg-indigo-100 text-indigo-700',
    isActive: true,
    isTerminal: false,
  },
  READY_TO_PORT: {
    label: 'Termin uzgodniony — gotowe do przeniesienia',
    description: 'Termin przeniesienia zostal potwierdzony przez obie strony (E13). Oczekiwanie na dzien D.',
    colorClass: 'bg-emerald-100 text-emerald-700',
    isActive: true,
    isTerminal: false,
  },
  COMPLETED: {
    label: 'Przeniesienie zakonczone',
    description: 'Numer zostal przeniesiony. Biorca potwierdzil wykonanie do PLI CBD (E18).',
    colorClass: 'bg-green-100 text-green-700',
    isActive: false,
    isTerminal: true,
  },
  REJECTED: {
    label: 'Wniosek odrzucony',
    description: 'Dawca odrzucil wniosek przeniesienia. Aby kontynuowac nalezy zamknac sprawe i zlozyc nowy wniosek.',
    colorClass: 'bg-red-100 text-red-700',
    isActive: false,
    isTerminal: true,
  },
  CANCELLED: {
    label: 'Wniosek anulowany',
    description: 'Wniosek zostal anulowany. Sprawa jest zamknieta.',
    colorClass: 'bg-gray-100 text-gray-500',
    isActive: false,
    isTerminal: true,
  },
  PROCESS_ERROR: {
    label: 'Blad procesu',
    description: 'Proces PLI CBD zakonczyl sie bledem. Wymagana interwencja operatora.',
    colorClass: 'bg-red-100 text-red-600',
    isActive: false,
    isTerminal: true,
  },
}
