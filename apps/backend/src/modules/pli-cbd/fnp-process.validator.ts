import type {
  FnpBlockingReason,
  FnpPortDateValidation,
} from '@np-manager/shared'
import {
  FNP_DAY_MODE_MIN_LEAD_DAYS,
  FNP_DAY_MODE_WHOLESALE_MIN_LEAD_DAYS,
} from '@np-manager/shared'

// ============================================================
// TYP WEJSCIOWY — pola sprawy potrzebne do walidacji
// ============================================================

export interface FnpValidationRequest {
  portingMode: 'END' | 'EOP' | 'DAY'
  statusInternal:
    | 'DRAFT'
    | 'SUBMITTED'
    | 'PENDING_DONOR'
    | 'CONFIRMED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'PORTED'
    | 'ERROR'
  requestDocumentNumber: string | null
  hasPowerOfAttorney: boolean
  linkedWholesaleServiceOnRecipientSide: boolean
  requestedPortDate: Date | null
  donorAssignedPortDate: Date | null
}

// ============================================================
// POMOCNICY
// ============================================================

/** Formatuje Date do ISO-like YYYY-MM-DD bez strefy czasowej. */
function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Dodaje pelne doby kalendarzowe (nie UTC milisekundy) do daty. */
function addCalendarDays(base: Date, days: number): Date {
  const result = new Date(base)
  result.setDate(result.getDate() + days)
  return result
}

// ============================================================
// WALIDACJA DATY PORTOWANIA
// ============================================================

/**
 * Buduje obiekt FnpPortDateValidation na podstawie pol sprawy
 * oraz wyniku zapytania do WorkingCalendar (pre-fetchowanego przez serwis).
 *
 * @param request     - pola sprawy
 * @param today       - biezaca data (Date o godzinie 00:00 lokalnie), iniekcja dla testowalnosci
 * @param isWorkingDay - wynik zapytania z WorkingCalendar dla portDate; null jesli brak wpisu lub brak daty
 */
export function buildDateValidation(
  request: FnpValidationRequest,
  today: Date,
  isWorkingDay: boolean | null,
): FnpPortDateValidation {
  const { portingMode, linkedWholesaleServiceOnRecipientSide } = request

  const wholesaleLeadTimeApplied =
    portingMode === 'DAY' && linkedWholesaleServiceOnRecipientSide

  const leadDays = wholesaleLeadTimeApplied
    ? FNP_DAY_MODE_WHOLESALE_MIN_LEAD_DAYS
    : FNP_DAY_MODE_MIN_LEAD_DAYS

  // W trybach END/EOP date wyznacza Dawca — brak minPortDate po stronie Biorcy
  const minPortDate =
    portingMode === 'DAY' ? toDateString(addCalendarDays(today, leadDays)) : null

  // Wynikowa data portowania zalezy od trybu
  const portDate =
    portingMode === 'DAY'
      ? request.requestedPortDate
        ? toDateString(request.requestedPortDate)
        : null
      : request.donorAssignedPortDate
        ? toDateString(request.donorAssignedPortDate)
        : null

  const blockingReasons: FnpBlockingReason[] = []

  if (portingMode === 'DAY') {
    if (!portDate) {
      blockingReasons.push({
        code: 'DATE_MISSING',
        message: 'Data przeniesienia jest wymagana dla trybu DAY.',
        field: 'requestedPortDate',
      })
    } else {
      if (minPortDate && portDate < minPortDate) {
        blockingReasons.push({
          code: 'DATE_TOO_EARLY',
          message: wholesaleLeadTimeApplied
            ? `Data przeniesienia musi byc co najmniej ${FNP_DAY_MODE_WHOLESALE_MIN_LEAD_DAYS} dni roboczych od dzis (usluga hurtowa).`
            : `Data przeniesienia musi byc co najmniej ${FNP_DAY_MODE_MIN_LEAD_DAYS} dni roboczych od dzis.`,
          field: 'requestedPortDate',
        })
      }

      if (isWorkingDay === false) {
        blockingReasons.push({
          code: 'DATE_NOT_WORKING_DAY',
          message: 'Wybrana data przeniesienia nie jest dniem roboczym (swiatecznym lub weekendem).',
          field: 'requestedPortDate',
        })
      }
    }
  }

  return {
    portDate,
    isWorkingDay,
    minPortDate,
    wholesaleLeadTimeApplied,
    blockingReasons,
  }
}

// ============================================================
// GOTOWOS DO WYGENEROWANIA KOMUNIKATOW EXX
// ============================================================

/**
 * Warunki do wyslania E03 (wniosek przeniesienia).
 * Sprawdza pola biznesowe — nie sprawdza etapu (robi to serwis).
 */
export function validateE03Readiness(
  request: FnpValidationRequest,
  dateValidation: FnpPortDateValidation,
): FnpBlockingReason[] {
  const reasons: FnpBlockingReason[] = []

  if (request.statusInternal !== 'SUBMITTED') {
    reasons.push({
      code: 'STATUS_NOT_SUBMITTED',
      message: 'Sprawa musi byc w statusie "Zlozona" aby wyslac wniosek E03.',
      field: 'statusInternal',
    })
  }

  if (!request.requestDocumentNumber) {
    reasons.push({
      code: 'DOCUMENT_NUMBER_MISSING',
      message: 'Numer dokumentu zlozenia wniosku jest wymagany.',
      field: 'requestDocumentNumber',
    })
  }

  if (request.portingMode === 'DAY' && !request.hasPowerOfAttorney) {
    reasons.push({
      code: 'POWER_OF_ATTORNEY_MISSING',
      message: 'Tryb DAY wymaga pelnomocnictwa (hasPowerOfAttorney).',
      field: 'hasPowerOfAttorney',
    })
  }

  // W trybie DAY data musi byc poprawna
  if (request.portingMode === 'DAY') {
    reasons.push(...dateValidation.blockingReasons)
  }

  return reasons
}

/**
 * Warunki do wyslania E12 (potwierdzenie terminu przez Biorca).
 * Wymagana jest data przeniesienia wyznaczona przez Dawce (z E06).
 */
export function validateE12Readiness(
  request: FnpValidationRequest,
): FnpBlockingReason[] {
  const reasons: FnpBlockingReason[] = []

  if (!request.donorAssignedPortDate) {
    reasons.push({
      code: 'DONOR_PORT_DATE_MISSING',
      message: 'Data przeniesienia wyznaczona przez Dawce (E06) jest wymagana do wyslania E12.',
      field: 'donorAssignedPortDate',
    })
  }

  return reasons
}

/**
 * Warunki do wyslania E18 (potwierdzenie wykonania przeniesienia).
 * Numer musi byc juz przeniesiony (statusInternal = PORTED).
 */
export function validateE18Readiness(
  request: FnpValidationRequest,
): FnpBlockingReason[] {
  const reasons: FnpBlockingReason[] = []

  if (request.statusInternal !== 'PORTED') {
    reasons.push({
      code: 'STATUS_NOT_PORTED',
      message: 'Sprawa musi byc w statusie "Przeniesiona" aby wyslac potwierdzenie E18.',
      field: 'statusInternal',
    })
  }

  return reasons
}

/**
 * Warunki do wyslania E23 (anulowanie).
 * Anulowanie jest mozliwe na wiekszosci aktywnych etapow — brak dodatkowych
 * wymagan biznesowych po stronie pol sprawy; etap jest kontrolowany przez serwis.
 */
export function validateE23Readiness(): FnpBlockingReason[] {
  return []
}
