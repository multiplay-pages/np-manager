import type { FnpExxMessage, FnpProcessStage, PortingMode } from '../constants'

// ============================================================
// BLOKUJACE WARUNKI PROCESU
// ============================================================

export interface FnpBlockingReason {
  /** Staly kod maszynowy, niezalezny od jezyka. */
  code: string
  /** Opis czytelny dla uzytkownika. */
  message: string
  /** Opcjonalne pole modelu, ktorego dotyczy blokada. */
  field?: string
}

// ============================================================
// WALIDACJA DATY PORTOWANIA
// ============================================================

export interface FnpPortDateValidation {
  /** Wynikowa data portowania (requestedPortDate dla DAY, donorAssignedPortDate po E06). */
  portDate: string | null
  /**
   * Czy data jest dniem roboczym wg kalendarza systemu.
   * null jesli data jest null lub nie ma wpisu w kalendarzu.
   */
  isWorkingDay: boolean | null
  /**
   * Najwczesniejsza dozwolona data (YYYY-MM-DD) obliczona z wyprzedzenia minimalnego.
   * null dla trybow END/EOP (date wyznacza Dawca).
   */
  minPortDate: string | null
  /** Czy zastosowano zaostrzone wymogi dla uslugi hurtowej. */
  wholesaleLeadTimeApplied: boolean
  /** Blokady zwiazan z data — do wyswietlenia w UI. */
  blockingReasons: FnpBlockingReason[]
}

// ============================================================
// GOTOWOS DO WYGENEROWANIA KOMUNIKATU Exx
// ============================================================

export interface FnpMessageReadiness {
  messageType: FnpExxMessage
  /** Etykieta czytelna dla uzytkownika. */
  label: string
  /** Opis domenowy komunikatu. */
  description: string
  /** Czy wszystkie warunki do wygenerowania komunikatu sa spelnione. */
  ready: boolean
  /** Blokady uniemozliwiajace wygenerowanie (puste gdy ready=true). */
  blockingReasons: FnpBlockingReason[]
  /**
   * Podglad kluczowych pol, ktore znalazlyby sie w komunikacie.
   * Pomocne w weryfikacji przed wyslaniem.
   */
  summaryFields: Record<string, string | null>
}

// ============================================================
// SNAPSHOT PROCESU PLI CBD DLA SPRAWY
// ============================================================

export interface PliCbdProcessSnapshotDto {
  requestId: string
  caseNumber: string
  /** Aktualny etap procesu FNP po stronie PLI CBD. */
  currentStage: FnpProcessStage
  /** Etykieta czytelna dla uzytkownika. */
  currentStageLabel: string
  portingMode: PortingMode
  portingModeLabel: string
  /**
   * Komunikaty Exx, ktore Biorca moze zainicjowac na tym etapie.
   * E06 i E13 sa pominiete (wychodza od Dawcy).
   */
  allowedNextMessages: FnpExxMessage[]
  /**
   * Szczegolowa gotowos dla kazdego z allowedNextMessages.
   * Pozwala UI pokazac co blokuje wygenerowanie konkretnego komunikatu.
   */
  draftableMessages: FnpMessageReadiness[]
  /** Walidacja daty portowania. */
  dateValidation: FnpPortDateValidation
  /**
   * Blokady globalne dla calego procesu (np. zamknieta sprawa).
   * Niezalezne od konkretnego komunikatu Exx.
   */
  blockingReasons: FnpBlockingReason[]
}
