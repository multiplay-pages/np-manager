import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import type {
  FnpBlockingReason,
  FnpMessageReadiness,
  PliCbdProcessSnapshotDto,
} from '@np-manager/shared'
import {
  FNP_EXX_MESSAGE_DESCRIPTIONS,
  FNP_EXX_MESSAGE_LABELS,
  FNP_PROCESS_STAGE_LABELS,
  PORTING_MODE_LABELS,
} from '@np-manager/shared'
import { deriveFnpProcessStage, getAllowedNextMessages } from './fnp-process.domain'
import {
  buildDateValidation,
  validateE03Readiness,
  validateE12Readiness,
  validateE18Readiness,
  validateE23Readiness,
  type FnpValidationRequest,
} from './fnp-process.validator'

// ============================================================
// SELECT — pola sprawy potrzebne do obliczenia snapshotu
// ============================================================

const FNP_PROCESS_SELECT = {
  id: true,
  caseNumber: true,
  statusInternal: true,
  pliCbdExportStatus: true,
  lastExxReceived: true,
  portingMode: true,
  requestDocumentNumber: true,
  hasPowerOfAttorney: true,
  linkedWholesaleServiceOnRecipientSide: true,
  requestedPortDate: true,
  donorAssignedPortDate: true,
} as const

// ============================================================
// POMOCNIK — mapowanie PliCbdExxType → FnpExxMessage | null
// ============================================================

/**
 * Filtruje lastExxReceived z Prisma do podzestawu uznawanego przez domene FNP.
 * E17 i E31 sa typami technicznymi spoza modelu komunikatow Biorcy.
 */
function toFnpLastExx(
  raw: string | null,
): 'E03' | 'E06' | 'E12' | 'E13' | 'E16' | 'E18' | 'E23' | null {
  if (raw === null || raw === 'E17' || raw === 'E31') return null
  return raw as 'E03' | 'E06' | 'E12' | 'E13' | 'E16' | 'E18' | 'E23'
}

// ============================================================
// GLOWNA FUNKCJA SERWISU
// ============================================================

export async function getPortingRequestProcessSnapshot(
  requestId: string,
): Promise<PliCbdProcessSnapshotDto> {
  const row = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: FNP_PROCESS_SELECT,
  })

  if (!row) {
    throw AppError.notFound(`Sprawa o id "${requestId}" nie istnieje.`)
  }

  // Wyznacz etap procesu FNP
  const currentStage = deriveFnpProcessStage({
    statusInternal: row.statusInternal,
    pliCbdExportStatus: row.pliCbdExportStatus,
    lastExxReceived: toFnpLastExx(row.lastExxReceived),
  })

  // Pobierz komunikaty dozwolone na tym etapie
  const allowedNextMessages = getAllowedNextMessages(currentStage)

  // Wyznacz date portowania do weryfikacji w kalendarzu
  const dateForCalendar =
    row.portingMode === 'DAY' ? row.requestedPortDate : row.donorAssignedPortDate

  // Zapytaj WorkingCalendar tylko gdy jest data do sprawdzenia
  let isWorkingDay: boolean | null = null

  if (dateForCalendar) {
    const calendarEntry = await prisma.workingCalendar.findUnique({
      where: { date: dateForCalendar },
      select: { isWorkingDay: true },
    })

    if (calendarEntry !== null) {
      // Wynik z bazy — wiazacy
      isWorkingDay = calendarEntry.isWorkingDay
    } else {
      // Brak wpisu w kalendarzu — fallback na dzien tygodnia:
      // weekend (sobota=6, niedziela=0) na pewno nie jest dniem roboczym;
      // dni powszednie bez wpisu zostawiamy jako null (moze byc swieto)
      const dayOfWeek = dateForCalendar.getDay()
      isWorkingDay = dayOfWeek === 0 || dayOfWeek === 6 ? false : null
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const validationRequest: FnpValidationRequest = {
    portingMode: row.portingMode,
    statusInternal: row.statusInternal,
    requestDocumentNumber: row.requestDocumentNumber,
    hasPowerOfAttorney: row.hasPowerOfAttorney,
    linkedWholesaleServiceOnRecipientSide: row.linkedWholesaleServiceOnRecipientSide,
    requestedPortDate: row.requestedPortDate,
    donorAssignedPortDate: row.donorAssignedPortDate,
  }

  const dateValidation = buildDateValidation(validationRequest, today, isWorkingDay)

  // Zbuduj draftableMessages dla kazdego dozwolonego komunikatu
  const draftableMessages: FnpMessageReadiness[] = allowedNextMessages.map((messageType) => {
    let blockingReasons: FnpBlockingReason[]

    switch (messageType) {
      case 'E03':
        blockingReasons = validateE03Readiness(validationRequest, dateValidation)
        break
      case 'E12':
        blockingReasons = validateE12Readiness(validationRequest)
        break
      case 'E18':
        blockingReasons = validateE18Readiness(validationRequest)
        break
      case 'E23':
        blockingReasons = validateE23Readiness()
        break
      default:
        blockingReasons = []
    }

    return {
      messageType,
      label: FNP_EXX_MESSAGE_LABELS[messageType],
      description: FNP_EXX_MESSAGE_DESCRIPTIONS[messageType],
      ready: blockingReasons.length === 0,
      blockingReasons,
      summaryFields: buildSummaryFields(messageType, row),
    }
  })

  // Blokady globalne dla calego procesu
  const blockingReasons: FnpBlockingReason[] = []

  if (
    currentStage === 'COMPLETED' ||
    currentStage === 'REJECTED' ||
    currentStage === 'CANCELLED' ||
    currentStage === 'PROCESS_ERROR'
  ) {
    blockingReasons.push({
      code: 'PROCESS_TERMINAL',
      message: 'Proces PLI CBD dla tej sprawy zakonczyl sie. Brak mozliwych akcji.',
    })
  }

  return {
    requestId: row.id,
    caseNumber: row.caseNumber,
    currentStage,
    currentStageLabel: FNP_PROCESS_STAGE_LABELS[currentStage],
    portingMode: row.portingMode,
    portingModeLabel: PORTING_MODE_LABELS[row.portingMode],
    allowedNextMessages,
    draftableMessages,
    dateValidation,
    blockingReasons,
  }
}

// ============================================================
// POMOCNIK — podglad pol dla konkretnego komunikatu
// ============================================================

function buildSummaryFields(
  messageType: string,
  row: FnpValidationRequest & { id: string; caseNumber: string },
): Record<string, string | null> {
  switch (messageType) {
    case 'E03':
      return {
        portingMode: row.portingMode,
        requestDocumentNumber: row.requestDocumentNumber,
        requestedPortDate: row.requestedPortDate?.toISOString().slice(0, 10) ?? null,
      }
    case 'E12':
      return {
        donorAssignedPortDate: row.donorAssignedPortDate?.toISOString().slice(0, 10) ?? null,
      }
    case 'E18':
      return {
        statusInternal: row.statusInternal,
      }
    case 'E23':
      return {
        caseNumber: row.caseNumber,
      }
    default:
      return {}
  }
}
