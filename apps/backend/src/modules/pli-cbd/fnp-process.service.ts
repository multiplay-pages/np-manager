import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import type {
  FnpBlockingReason,
  FnpMessageReadiness,
  PliCbdE03DraftBuildResultDto,
  PliCbdE03DraftDto,
  PliCbdE12DraftBuildResultDto,
  PliCbdE12DraftDto,
  PliCbdE18DraftBuildResultDto,
  PliCbdE18DraftDto,
  PliCbdProcessSnapshotDto,
} from '@np-manager/shared'
import {
  FNP_EXX_MESSAGE_DESCRIPTIONS,
  FNP_EXX_MESSAGE_LABELS,
  FNP_PROCESS_STAGE_LABELS,
  PORTING_CASE_STATUS_LABELS,
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

const DRAFT_OPERATOR_SELECT = {
  id: true,
  name: true,
  shortName: true,
  routingNumber: true,
} as const

const E03_DRAFT_SELECT = {
  id: true,
  caseNumber: true,
  clientId: true,
  numberType: true,
  numberRangeKind: true,
  primaryNumber: true,
  rangeStart: true,
  rangeEnd: true,
  requestDocumentNumber: true,
  portingMode: true,
  requestedPortDate: true,
  earliestAcceptablePortDate: true,
  subscriberKind: true,
  subscriberFirstName: true,
  subscriberLastName: true,
  subscriberCompanyName: true,
  identityType: true,
  identityValue: true,
  correspondenceAddress: true,
  hasPowerOfAttorney: true,
  linkedWholesaleServiceOnRecipientSide: true,
  contactChannel: true,
  client: {
    select: {
      id: true,
      clientType: true,
      firstName: true,
      lastName: true,
      companyName: true,
    },
  },
  donorOperator: {
    select: DRAFT_OPERATOR_SELECT,
  },
  recipientOperator: {
    select: DRAFT_OPERATOR_SELECT,
  },
  infrastructureOperator: {
    select: DRAFT_OPERATOR_SELECT,
  },
} as const

type E03DraftRow = Prisma.PortingRequestGetPayload<{ select: typeof E03_DRAFT_SELECT }>

const E12_DRAFT_SELECT = {
  id: true,
  caseNumber: true,
  clientId: true,
  numberType: true,
  numberRangeKind: true,
  primaryNumber: true,
  rangeStart: true,
  rangeEnd: true,
  portingMode: true,
  statusInternal: true,
  pliCbdExportStatus: true,
  lastExxReceived: true,
  donorAssignedPortDate: true,
  donorAssignedPortTime: true,
  client: {
    select: {
      id: true,
      clientType: true,
      firstName: true,
      lastName: true,
      companyName: true,
    },
  },
  donorOperator: {
    select: DRAFT_OPERATOR_SELECT,
  },
  recipientOperator: {
    select: DRAFT_OPERATOR_SELECT,
  },
  subscriberKind: true,
  subscriberFirstName: true,
  subscriberLastName: true,
  subscriberCompanyName: true,
} as const

type E12DraftRow = Prisma.PortingRequestGetPayload<{ select: typeof E12_DRAFT_SELECT }>
const E18_DRAFT_SELECT = {
  id: true,
  caseNumber: true,
  clientId: true,
  numberType: true,
  numberRangeKind: true,
  primaryNumber: true,
  rangeStart: true,
  rangeEnd: true,
  portingMode: true,
  statusInternal: true,
  pliCbdExportStatus: true,
  lastExxReceived: true,
  confirmedPortDate: true,
  donorAssignedPortDate: true,
  donorAssignedPortTime: true,
  client: {
    select: {
      id: true,
      clientType: true,
      firstName: true,
      lastName: true,
      companyName: true,
    },
  },
  donorOperator: {
    select: DRAFT_OPERATOR_SELECT,
  },
  recipientOperator: {
    select: DRAFT_OPERATOR_SELECT,
  },
  subscriberKind: true,
  subscriberFirstName: true,
  subscriberLastName: true,
  subscriberCompanyName: true,
} as const

type E18DraftRow = Prisma.PortingRequestGetPayload<{ select: typeof E18_DRAFT_SELECT }>

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

export async function buildE03DraftForPortingRequest(
  requestId: string,
): Promise<PliCbdE03DraftBuildResultDto> {
  const snapshot = await getPortingRequestProcessSnapshot(requestId)

  if (!snapshot.allowedNextMessages.includes('E03')) {
    return {
      requestId: snapshot.requestId,
      caseNumber: snapshot.caseNumber,
      isReady: false,
      blockingReasons:
        snapshot.blockingReasons.length > 0
          ? snapshot.blockingReasons
          : [
              {
                code: 'E03_NOT_ALLOWED_AT_CURRENT_STAGE',
                message: `Komunikat E03 nie jest dostepny na aktualnym etapie procesu: ${snapshot.currentStageLabel}.`,
                field: 'currentStage',
              },
            ],
      draft: null,
    }
  }

  const e03Readiness = snapshot.draftableMessages.find((message) => message.messageType === 'E03')

  if (!e03Readiness) {
    return {
      requestId: snapshot.requestId,
      caseNumber: snapshot.caseNumber,
      isReady: false,
      blockingReasons: [
        {
          code: 'E03_READINESS_NOT_AVAILABLE',
          message: 'Nie udalo sie wyznaczyc gotowosci draftu E03 dla tej sprawy.',
        },
      ],
      draft: null,
    }
  }

  if (!e03Readiness.ready) {
    return {
      requestId: snapshot.requestId,
      caseNumber: snapshot.caseNumber,
      isReady: false,
      blockingReasons: e03Readiness.blockingReasons,
      draft: null,
    }
  }

  const row = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: E03_DRAFT_SELECT,
  })

  if (!row) {
    throw AppError.notFound(`Sprawa o id "${requestId}" nie istnieje.`)
  }

  return {
    requestId: row.id,
    caseNumber: row.caseNumber,
    isReady: true,
    blockingReasons: [],
    draft: buildE03Draft(row),
  }
}

export async function buildE12DraftForPortingRequest(
  requestId: string,
): Promise<PliCbdE12DraftBuildResultDto> {
  const snapshot = await getPortingRequestProcessSnapshot(requestId)

  if (!snapshot.allowedNextMessages.includes('E12')) {
    return {
      requestId: snapshot.requestId,
      caseNumber: snapshot.caseNumber,
      isReady: false,
      blockingReasons:
        snapshot.blockingReasons.length > 0
          ? snapshot.blockingReasons
          : [
              {
                code: 'E12_NOT_ALLOWED_AT_CURRENT_STAGE',
                message: `Komunikat E12 nie jest dostepny na aktualnym etapie procesu: ${snapshot.currentStageLabel}.`,
                field: 'currentStage',
              },
            ],
      draft: null,
    }
  }

  const e12Readiness = snapshot.draftableMessages.find((message) => message.messageType === 'E12')

  if (!e12Readiness) {
    return {
      requestId: snapshot.requestId,
      caseNumber: snapshot.caseNumber,
      isReady: false,
      blockingReasons: [
        {
          code: 'E12_READINESS_NOT_AVAILABLE',
          message: 'Nie udalo sie wyznaczyc gotowosci draftu E12 dla tej sprawy.',
        },
      ],
      draft: null,
    }
  }

  if (!e12Readiness.ready) {
    return {
      requestId: snapshot.requestId,
      caseNumber: snapshot.caseNumber,
      isReady: false,
      blockingReasons: e12Readiness.blockingReasons,
      draft: null,
    }
  }

  const row = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: E12_DRAFT_SELECT,
  })

  if (!row) {
    throw AppError.notFound(`Sprawa o id "${requestId}" nie istnieje.`)
  }

  return {
    requestId: row.id,
    caseNumber: row.caseNumber,
    isReady: true,
    blockingReasons: [],
    draft: buildE12Draft(row, snapshot),
  }
}

export async function buildE18DraftForPortingRequest(
  requestId: string,
): Promise<PliCbdE18DraftBuildResultDto> {
  const snapshot = await getPortingRequestProcessSnapshot(requestId)

  if (!snapshot.allowedNextMessages.includes('E18')) {
    return {
      requestId: snapshot.requestId,
      caseNumber: snapshot.caseNumber,
      isReady: false,
      blockingReasons:
        snapshot.blockingReasons.length > 0
          ? snapshot.blockingReasons
          : [
              {
                code: 'E18_NOT_ALLOWED_AT_CURRENT_STAGE',
                message: `Komunikat E18 nie jest dostepny na aktualnym etapie procesu: ${snapshot.currentStageLabel}.`,
                field: 'currentStage',
              },
            ],
      draft: null,
    }
  }

  const e18Readiness = snapshot.draftableMessages.find((message) => message.messageType === 'E18')

  if (!e18Readiness) {
    return {
      requestId: snapshot.requestId,
      caseNumber: snapshot.caseNumber,
      isReady: false,
      blockingReasons: [
        {
          code: 'E18_READINESS_NOT_AVAILABLE',
          message: 'Nie udalo sie wyznaczyc gotowosci draftu E18 dla tej sprawy.',
        },
      ],
      draft: null,
    }
  }

  if (!e18Readiness.ready) {
    return {
      requestId: snapshot.requestId,
      caseNumber: snapshot.caseNumber,
      isReady: false,
      blockingReasons: e18Readiness.blockingReasons,
      draft: null,
    }
  }

  const row = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: E18_DRAFT_SELECT,
  })

  if (!row) {
    throw AppError.notFound(`Sprawa o id "${requestId}" nie istnieje.`)
  }

  return {
    requestId: row.id,
    caseNumber: row.caseNumber,
    isReady: true,
    blockingReasons: [],
    draft: buildE18Draft(row, snapshot),
  }
}

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

function buildE03Draft(row: E03DraftRow): PliCbdE03DraftDto {
  return {
    messageType: 'E03',
    serviceType: 'FNP',
    requestId: row.id,
    caseNumber: row.caseNumber,
    clientId: row.clientId,
    clientDisplayName: getClientDisplayName(row.client),
    subscriberKind: row.subscriberKind,
    subscriberDisplayName: getSubscriberDisplayName(row),
    subscriberFirstName: row.subscriberFirstName,
    subscriberLastName: row.subscriberLastName,
    subscriberCompanyName: row.subscriberCompanyName,
    numberType: row.numberType,
    portedNumberKind: row.numberRangeKind,
    primaryNumber: row.primaryNumber,
    rangeStart: row.rangeStart,
    rangeEnd: row.rangeEnd,
    numberDisplay: getNumberDisplay(row),
    portingMode: row.portingMode,
    requestedPortDate: toDateOnlyString(row.requestedPortDate),
    earliestAcceptablePortDate: toDateOnlyString(row.earliestAcceptablePortDate),
    requestDocumentNumber: row.requestDocumentNumber ?? '',
    donorOperator: toDraftOperator(row.donorOperator),
    recipientOperator: toDraftOperator(row.recipientOperator),
    infrastructureOperator: row.infrastructureOperator
      ? toDraftOperator(row.infrastructureOperator)
      : null,
    identity: {
      type: row.identityType,
      value: row.identityValue,
    },
    correspondenceAddress: row.correspondenceAddress,
    hasPowerOfAttorney: row.hasPowerOfAttorney,
    linkedWholesaleServiceOnRecipientSide: row.linkedWholesaleServiceOnRecipientSide,
    contactChannel: row.contactChannel,
    technicalHints: {
      portDateSource:
        row.portingMode === 'DAY' ? 'REQUESTED_PORT_DATE' : 'EARLIEST_ACCEPTABLE_PORT_DATE',
      numberSelectionSource:
        row.numberRangeKind === 'DDI_RANGE' ? 'NUMBER_RANGE' : 'PRIMARY_NUMBER',
    },
  }
}

function buildE12Draft(row: E12DraftRow, snapshot: PliCbdProcessSnapshotDto): PliCbdE12DraftDto {
  const lastReceivedMessageType = toFnpLastExx(row.lastExxReceived)

  return {
    messageType: 'E12',
    serviceType: 'FNP',
    portingRequestId: row.id,
    caseNumber: row.caseNumber,
    clientId: row.clientId,
    clientDisplayName: getClientDisplayName(row.client),
    subscriberDisplayName: getSubscriberDisplayName(row),
    donorOperator: toDraftOperator(row.donorOperator),
    recipientOperator: toDraftOperator(row.recipientOperator),
    portingMode: row.portingMode,
    numberType: row.numberType,
    numberRangeKind: row.numberRangeKind,
    numberDisplay: getNumberDisplay(row),
    confirmationContext: {
      currentStage: snapshot.currentStage,
      currentStageLabel: snapshot.currentStageLabel,
      statusInternal: row.statusInternal,
      statusInternalLabel: PORTING_CASE_STATUS_LABELS[row.statusInternal],
      exportStatus: row.pliCbdExportStatus,
      lastReceivedMessageType,
      donorAssignedPortDate: toDateOnlyString(row.donorAssignedPortDate),
      donorAssignedPortTime: row.donorAssignedPortTime,
    },
    reasonHints: buildE12ReasonHints(row, snapshot, lastReceivedMessageType),
    technicalHints: {
      dataSource: 'CURRENT_CASE_AND_PROCESS_SNAPSHOT',
      portDateSource: 'DONOR_ASSIGNED_PORT_DATE',
      numberSelectionSource:
        row.numberRangeKind === 'DDI_RANGE' ? 'NUMBER_RANGE' : 'PRIMARY_NUMBER',
      allowedMessagesAtStage: snapshot.allowedNextMessages,
    },
  }
}

function buildE18Draft(row: E18DraftRow, snapshot: PliCbdProcessSnapshotDto): PliCbdE18DraftDto {
  const lastReceivedMessageType = toFnpLastExx(row.lastExxReceived)

  return {
    messageType: 'E18',
    serviceType: 'FNP',
    requestId: row.id,
    caseNumber: row.caseNumber,
    clientId: row.clientId,
    clientDisplayName: getClientDisplayName(row.client),
    subscriberDisplayName: getSubscriberDisplayName(row),
    donorOperator: toDraftOperator(row.donorOperator),
    recipientOperator: toDraftOperator(row.recipientOperator),
    portingMode: row.portingMode,
    numberType: row.numberType,
    numberRangeKind: row.numberRangeKind,
    numberDisplay: getNumberDisplay(row),
    completionContext: {
      currentStage: snapshot.currentStage,
      currentStageLabel: snapshot.currentStageLabel,
      statusInternal: row.statusInternal,
      statusInternalLabel: PORTING_CASE_STATUS_LABELS[row.statusInternal],
      exportStatus: row.pliCbdExportStatus,
      lastReceivedMessageType,
      confirmedPortDate: toDateOnlyString(row.confirmedPortDate),
      donorAssignedPortDate: toDateOnlyString(row.donorAssignedPortDate),
      donorAssignedPortTime: row.donorAssignedPortTime,
    },
    reasonHints: buildE18ReasonHints(row, snapshot, lastReceivedMessageType),
    technicalHints: {
      dataSource: 'CURRENT_CASE_AND_PROCESS_SNAPSHOT',
      numberSelectionSource:
        row.numberRangeKind === 'DDI_RANGE' ? 'NUMBER_RANGE' : 'PRIMARY_NUMBER',
      allowedMessagesAtStage: snapshot.allowedNextMessages,
    },
  }
}

function buildE18ReasonHints(
  row: E18DraftRow,
  snapshot: PliCbdProcessSnapshotDto,
  lastReceivedMessageType: PliCbdE18DraftDto['completionContext']['lastReceivedMessageType'],
): string[] {
  const hints = [
    `Proces FNP znajduje sie obecnie na etapie: ${snapshot.currentStageLabel}.`,
    'Draft E18 reprezentuje potwierdzenie wykonania przeniesienia numeru przez Biorce.',
  ]

  if (lastReceivedMessageType) {
    hints.push(
      `Ostatni komunikat uwzgledniony w modelu procesu: ${FNP_EXX_MESSAGE_LABELS[lastReceivedMessageType]}.`,
    )
  }

  if (row.confirmedPortDate) {
    hints.push(`Potwierdzona data przeniesienia: ${toDateOnlyString(row.confirmedPortDate)}.`)
  }

  if (row.donorAssignedPortDate) {
    hints.push(`Data wyznaczona przez Dawce: ${toDateOnlyString(row.donorAssignedPortDate)}.`)
  }

  return hints
}

function toDateOnlyString(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}

function toDraftOperator(
  operator: E03DraftRow['donorOperator'],
): PliCbdE03DraftDto['donorOperator'] {
  return {
    id: operator.id,
    name: operator.name,
    shortName: operator.shortName,
    routingNumber: operator.routingNumber,
  }
}

function buildE12ReasonHints(
  row: E12DraftRow,
  snapshot: PliCbdProcessSnapshotDto,
  lastReceivedMessageType: PliCbdE12DraftDto['confirmationContext']['lastReceivedMessageType'],
): string[] {
  const hints = [
    `Proces FNP znajduje sie obecnie na etapie: ${snapshot.currentStageLabel}.`,
    'Draft E12 reprezentuje potwierdzenie terminu po stronie Biorcy.',
  ]

  if (lastReceivedMessageType) {
    hints.push(
      `Ostatni komunikat uwzgledniony w modelu procesu: ${FNP_EXX_MESSAGE_LABELS[lastReceivedMessageType]}.`,
    )
  }

  if (row.donorAssignedPortDate) {
    const date = toDateOnlyString(row.donorAssignedPortDate)
    hints.push(`Termin przekazany przez Dawce do potwierdzenia: ${date}.`)
  }

  return hints
}

function getClientDisplayName(client: E03DraftRow['client']): string {
  if (client.clientType === 'BUSINESS') {
    return client.companyName ?? 'Firma (brak nazwy)'
  }

  const parts = [client.firstName, client.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Brak danych'
}

function getSubscriberDisplayName(request: {
  subscriberKind: string
  subscriberFirstName: string | null
  subscriberLastName: string | null
  subscriberCompanyName: string | null
}): string {
  if (request.subscriberKind === 'BUSINESS') {
    return request.subscriberCompanyName ?? 'Firma (brak nazwy)'
  }

  const parts = [request.subscriberFirstName, request.subscriberLastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Brak danych'
}

function getNumberDisplay(request: {
  numberRangeKind: string
  primaryNumber: string | null
  rangeStart: string | null
  rangeEnd: string | null
}): string {
  if (request.numberRangeKind === 'DDI_RANGE') {
    return `${request.rangeStart ?? '-'} - ${request.rangeEnd ?? '-'}`
  }

  return request.primaryNumber ?? '-'
}
