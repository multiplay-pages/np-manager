import { Prisma, type PortingCaseStatus } from '@prisma/client'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import { logAuditEvent } from '../../shared/audit/audit.service'
import { PortingEvents } from './porting-events.service'
import type {
  CreatePortingRequestDto,
  PortingRequestDetailDto,
  PliCbdIntegrationEventsResultDto,
  PortingRequestListItemDto,
  PortingRequestListResultDto,
} from '@np-manager/shared'
import {
  getAllowedPortingCaseStatusTransitions,
  PORTING_CASE_STATUS_LABELS,
} from '@np-manager/shared'
import type {
  CreatePortingRequestBody,
  PortingRequestListQuery,
  UpdatePortingRequestStatusBody,
} from './porting-requests.schema'
import {
  PLI_CBD_TRIGGER_SELECT,
  type PliCbdTriggerRow,
  portingRequestPliCbdAdapter,
} from '../pli-cbd/pli-cbd.adapter'
import {
  getPliCbdIntegrationEvents,
  withPliCbdIntegrationTracking,
} from '../pli-cbd/pli-cbd.integration-tracker'

const CLOSED_STATUSES: PortingCaseStatus[] = ['REJECTED', 'CANCELLED', 'PORTED']
const PLI_CBD_MANUAL_TRIGGER_ACTION = 'MANUAL_FOUNDATION_TRIGGER'

const CLIENT_SELECT = {
  id: true,
  clientType: true,
  firstName: true,
  lastName: true,
  companyName: true,
  addressStreet: true,
  addressCity: true,
  addressZip: true,
} as const

const OPERATOR_SELECT = {
  id: true,
  name: true,
  shortName: true,
  routingNumber: true,
  isActive: true,
} as const

const LIST_SELECT = {
  id: true,
  caseNumber: true,
  primaryNumber: true,
  rangeStart: true,
  rangeEnd: true,
  numberRangeKind: true,
  portingMode: true,
  statusInternal: true,
  createdAt: true,
  clientId: true,
  client: { select: CLIENT_SELECT },
  donorOperatorId: true,
  donorOperator: {
    select: { id: true, name: true },
  },
} as const

const DETAIL_SELECT = {
  id: true,
  caseNumber: true,
  clientId: true,
  numberType: true,
  numberRangeKind: true,
  primaryNumber: true,
  rangeStart: true,
  rangeEnd: true,
  requestDocumentNumber: true,
  donorRoutingNumber: true,
  recipientRoutingNumber: true,
  portingMode: true,
  requestedPortDate: true,
  requestedPortTime: true,
  earliestAcceptablePortDate: true,
  confirmedPortDate: true,
  donorAssignedPortDate: true,
  donorAssignedPortTime: true,
  statusInternal: true,
  statusPliCbd: true,
  pliCbdCaseId: true,
  pliCbdCaseNumber: true,
  pliCbdPackageId: true,
  pliCbdExportStatus: true,
  pliCbdLastSyncAt: true,
  lastExxReceived: true,
  lastPliCbdStatusCode: true,
  lastPliCbdStatusDescription: true,
  rejectionCode: true,
  rejectionReason: true,
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
  internalNotes: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  client: { select: CLIENT_SELECT },
  donorOperator: { select: OPERATOR_SELECT },
  recipientOperator: { select: OPERATOR_SELECT },
  infrastructureOperator: { select: OPERATOR_SELECT },
} as const

type ClientRow = Prisma.ClientGetPayload<{ select: typeof CLIENT_SELECT }>
type OperatorRow = Prisma.OperatorGetPayload<{ select: typeof OPERATOR_SELECT }>
type ListRow = Prisma.PortingRequestGetPayload<{ select: typeof LIST_SELECT }>
type DetailRow = Prisma.PortingRequestGetPayload<{ select: typeof DETAIL_SELECT }>
type StatusChangeRow = Prisma.PortingRequestGetPayload<{
  select: {
    id: true
    caseNumber: true
    statusInternal: true
  }
}>

function getClientDisplayName(client: {
  clientType: string
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
}): string {
  if (client.clientType === 'BUSINESS') {
    return client.companyName ?? 'Firma (brak nazwy)'
  }

  const parts = [client.firstName, client.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Brak danych'
}

function getSubscriberDisplayName(request: {
  subscriberKind: string
  subscriberFirstName?: string | null
  subscriberLastName?: string | null
  subscriberCompanyName?: string | null
}): string {
  if (request.subscriberKind === 'BUSINESS') {
    return request.subscriberCompanyName ?? 'Firma (brak nazwy)'
  }

  const parts = [request.subscriberFirstName, request.subscriberLastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Brak danych'
}

function getNumberDisplay(request: {
  numberRangeKind: string
  primaryNumber?: string | null
  rangeStart?: string | null
  rangeEnd?: string | null
}): string {
  if (request.numberRangeKind === 'DDI_RANGE') {
    return `${request.rangeStart ?? '-'} - ${request.rangeEnd ?? '-'}`
  }

  return request.primaryNumber ?? '-'
}

function toDateOnlyString(value: Date | null | undefined): string | null {
  if (!value) return null
  return value.toISOString().slice(0, 10)
}

function toDateOnlyValue(value?: string): Date | undefined {
  if (!value) return undefined
  return new Date(`${value}T00:00:00.000Z`)
}

function normalizeIdentityValue(
  identityType: CreatePortingRequestDto['identityType'],
  value: string,
): string {
  const trimmed = value.trim()

  if (identityType === 'NIP') {
    return trimmed.replace(/[-\s]/g, '')
  }

  if (identityType === 'REGON' || identityType === 'PESEL') {
    return trimmed.replace(/\s/g, '')
  }

  return trimmed
}

async function generateCaseNumber(): Promise<string> {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
    const caseNumber = `FNP-${datePart}-${suffix}`

    const exists = await prisma.portingRequest.findUnique({
      where: { caseNumber },
      select: { id: true },
    })

    if (!exists) {
      return caseNumber
    }
  }

  throw AppError.internal('Nie udalo sie wygenerowac numeru sprawy.')
}

async function getClientOrThrow(clientId: string): Promise<ClientRow> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: CLIENT_SELECT,
  })

  if (!client) {
    throw AppError.notFound('Wybrany klient nie zostal znaleziony.')
  }

  return client
}

async function getActiveOperatorOrThrow(operatorId: string, label: string): Promise<OperatorRow> {
  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: OPERATOR_SELECT,
  })

  if (!operator) {
    throw AppError.notFound(`${label} nie zostal znaleziony.`)
  }

  if (!operator.isActive) {
    throw AppError.badRequest(`${label} jest nieaktywny i nie moze zostac uzyty w sprawie.`)
  }

  return operator
}

async function getDefaultRecipientOperatorOrThrow(): Promise<OperatorRow> {
  const operator = await prisma.operator.findFirst({
    where: {
      isActive: true,
      isRecipientDefault: true,
    },
    select: OPERATOR_SELECT,
    orderBy: { name: 'asc' },
  })

  if (!operator) {
    throw AppError.badRequest(
      'Brak skonfigurowanego domyslnego operatora bioracego. Popros administratora o uzupelnienie slownika operatorow.',
      'DEFAULT_RECIPIENT_OPERATOR_NOT_CONFIGURED',
    )
  }

  return operator
}

async function assertNoDuplicateOpenRequest(
  primaryNumber: string | null,
  numberRangeKind: 'SINGLE' | 'DDI_RANGE',
  rangeStart: string | null,
  rangeEnd: string | null,
): Promise<void> {
  const duplicate =
    numberRangeKind === 'SINGLE'
      ? await prisma.portingRequest.findFirst({
          where: {
            numberType: 'FIXED_LINE',
            statusInternal: { notIn: CLOSED_STATUSES },
            OR: [
              { primaryNumber: primaryNumber ?? undefined },
              {
                AND: [
                  { numberRangeKind: 'DDI_RANGE' },
                  { rangeStart: { lte: primaryNumber ?? undefined } },
                  { rangeEnd: { gte: primaryNumber ?? undefined } },
                ],
              },
            ],
          },
          select: { id: true, caseNumber: true },
        })
      : await prisma.portingRequest.findFirst({
          where: {
            numberType: 'FIXED_LINE',
            statusInternal: { notIn: CLOSED_STATUSES },
            OR: [
              {
                primaryNumber: {
                  gte: rangeStart ?? undefined,
                  lte: rangeEnd ?? undefined,
                },
              },
              {
                AND: [
                  { numberRangeKind: 'DDI_RANGE' },
                  { rangeStart: { lte: rangeEnd ?? undefined } },
                  { rangeEnd: { gte: rangeStart ?? undefined } },
                ],
              },
            ],
          },
          select: { id: true, caseNumber: true },
        })

  if (duplicate) {
    throw AppError.conflict(
      `Dla wskazanej numeracji istnieje juz otwarta sprawa (${duplicate.caseNumber}). Zamknij ja albo uzyj innego numeru lub zakresu.`,
      'ACTIVE_REQUEST_ALREADY_EXISTS_FOR_NUMBER',
    )
  }
}

async function getPortingRequestForPliCbdOrThrow(requestId: string): Promise<PliCbdTriggerRow> {
  const request = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: PLI_CBD_TRIGGER_SELECT,
  })

  if (!request) {
    throw AppError.notFound('Sprawa portowania nie zostala znaleziona.')
  }

  return request
}

async function getPortingRequestForStatusChangeOrThrow(
  requestId: string,
): Promise<StatusChangeRow> {
  const request = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      caseNumber: true,
      statusInternal: true,
    },
  })

  if (!request) {
    throw AppError.notFound('Sprawa portowania nie zostala znaleziona.')
  }

  return request
}

function assertStatusTransitionAllowed(
  currentStatus: PortingCaseStatus,
  targetStatus: PortingCaseStatus,
): void {
  if (currentStatus === targetStatus) {
    throw AppError.badRequest(
      'Sprawa ma juz wskazany status.',
      'PORTING_REQUEST_STATUS_UNCHANGED',
    )
  }

  const allowedTransitions = getAllowedPortingCaseStatusTransitions(currentStatus)

  if (!allowedTransitions.includes(targetStatus)) {
    throw AppError.badRequest(
      'Nie mozna wykonac tej zmiany statusu.',
      'PORTING_REQUEST_STATUS_TRANSITION_NOT_ALLOWED',
    )
  }
}

function toListItem(row: ListRow): PortingRequestListItemDto {
  return {
    id: row.id,
    caseNumber: row.caseNumber,
    clientId: row.clientId,
    clientDisplayName: getClientDisplayName(row.client),
    numberDisplay: getNumberDisplay(row),
    donorOperatorId: row.donorOperatorId,
    donorOperatorName: row.donorOperator.name,
    portingMode: row.portingMode,
    statusInternal: row.statusInternal,
    createdAt: row.createdAt.toISOString(),
  }
}

function toOperatorRef(operator: DetailRow['donorOperator']) {
  return {
    id: operator.id,
    name: operator.name,
    shortName: operator.shortName,
    routingNumber: operator.routingNumber,
  }
}

function toDetailDto(row: DetailRow): PortingRequestDetailDto {
  return {
    id: row.id,
    caseNumber: row.caseNumber,
    client: {
      id: row.client.id,
      clientType: row.client.clientType,
      displayName: getClientDisplayName(row.client),
    },
    numberType: row.numberType,
    numberRangeKind: row.numberRangeKind,
    primaryNumber: row.primaryNumber,
    rangeStart: row.rangeStart,
    rangeEnd: row.rangeEnd,
    numberDisplay: getNumberDisplay(row),
    requestDocumentNumber: row.requestDocumentNumber,
    donorOperator: toOperatorRef(row.donorOperator),
    recipientOperator: toOperatorRef(row.recipientOperator),
    infrastructureOperator: row.infrastructureOperator
      ? toOperatorRef(row.infrastructureOperator)
      : null,
    donorRoutingNumber: row.donorRoutingNumber,
    recipientRoutingNumber: row.recipientRoutingNumber,
    portingMode: row.portingMode,
    requestedPortDate: toDateOnlyString(row.requestedPortDate),
    requestedPortTime: row.requestedPortTime,
    earliestAcceptablePortDate: toDateOnlyString(row.earliestAcceptablePortDate),
    confirmedPortDate: toDateOnlyString(row.confirmedPortDate),
    donorAssignedPortDate: toDateOnlyString(row.donorAssignedPortDate),
    donorAssignedPortTime: row.donorAssignedPortTime,
    statusInternal: row.statusInternal,
    statusPliCbd: row.statusPliCbd,
    pliCbdCaseId: row.pliCbdCaseId,
    pliCbdCaseNumber: row.pliCbdCaseNumber,
    pliCbdPackageId: row.pliCbdPackageId,
    pliCbdExportStatus: row.pliCbdExportStatus,
    pliCbdLastSyncAt: row.pliCbdLastSyncAt?.toISOString() ?? null,
    lastExxReceived: row.lastExxReceived,
    lastPliCbdMessageType: row.lastExxReceived,
    lastPliCbdStatusCode: row.lastPliCbdStatusCode,
    lastPliCbdStatusDescription: row.lastPliCbdStatusDescription,
    rejectionCode: row.rejectionCode,
    rejectionReason: row.rejectionReason,
    subscriberKind: row.subscriberKind,
    subscriberDisplayName: getSubscriberDisplayName(row),
    subscriberFirstName: row.subscriberFirstName,
    subscriberLastName: row.subscriberLastName,
    subscriberCompanyName: row.subscriberCompanyName,
    identityType: row.identityType,
    identityValue: row.identityValue,
    correspondenceAddress: row.correspondenceAddress,
    hasPowerOfAttorney: row.hasPowerOfAttorney,
    linkedWholesaleServiceOnRecipientSide: row.linkedWholesaleServiceOnRecipientSide,
    contactChannel: row.contactChannel,
    internalNotes: row.internalNotes,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function createPortingRequest(
  body: CreatePortingRequestBody,
  createdByUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<PortingRequestDetailDto> {
  const client = await getClientOrThrow(body.clientId)

  if (client.clientType !== body.subscriberKind) {
    throw AppError.badRequest(
      'Typ abonenta w sprawie musi byc zgodny z typem wybranego klienta.',
      'SUBSCRIBER_KIND_MISMATCH',
    )
  }

  const donorOperator = await getActiveOperatorOrThrow(body.donorOperatorId, 'Operator oddajacy')
  const recipientOperator = await getDefaultRecipientOperatorOrThrow()
  const infrastructureOperator = body.infrastructureOperatorId
    ? await getActiveOperatorOrThrow(body.infrastructureOperatorId, 'Operator infrastrukturalny')
    : null

  const primaryNumber = body.numberRangeKind === 'SINGLE'
    ? body.primaryNumber ?? null
    : body.rangeStart ?? null
  const rangeStart = body.numberRangeKind === 'DDI_RANGE' ? body.rangeStart ?? null : null
  const rangeEnd = body.numberRangeKind === 'DDI_RANGE' ? body.rangeEnd ?? null : null

  await assertNoDuplicateOpenRequest(primaryNumber, body.numberRangeKind, rangeStart, rangeEnd)

  const caseNumber = await generateCaseNumber()

  const request = await prisma.portingRequest.create({
    data: {
      caseNumber,
      clientId: client.id,
      numberType: body.numberType,
      numberRangeKind: body.numberRangeKind,
      primaryNumber,
      rangeStart,
      rangeEnd,
      requestDocumentNumber: body.requestDocumentNumber ?? null,
      donorOperatorId: donorOperator.id,
      recipientOperatorId: recipientOperator.id,
      infrastructureOperatorId: infrastructureOperator?.id ?? null,
      donorRoutingNumber: donorOperator.routingNumber,
      recipientRoutingNumber: recipientOperator.routingNumber,
      requestedPortDate: toDateOnlyValue(body.requestedPortDate) ?? null,
      requestedPortTime: body.portingMode === 'DAY' ? '00:00' : null,
      earliestAcceptablePortDate: toDateOnlyValue(body.earliestAcceptablePortDate) ?? null,
      portingMode: body.portingMode,
      statusInternal: 'DRAFT',
      pliCbdExportStatus: 'NOT_EXPORTED',
      subscriberKind: body.subscriberKind,
      subscriberFirstName:
        body.subscriberKind === 'INDIVIDUAL' ? body.subscriberFirstName ?? null : null,
      subscriberLastName:
        body.subscriberKind === 'INDIVIDUAL' ? body.subscriberLastName ?? null : null,
      subscriberCompanyName:
        body.subscriberKind === 'BUSINESS' ? body.subscriberCompanyName ?? null : null,
      identityType: body.identityType,
      identityValue: normalizeIdentityValue(body.identityType, body.identityValue),
      correspondenceAddress: body.correspondenceAddress,
      hasPowerOfAttorney: body.hasPowerOfAttorney,
      linkedWholesaleServiceOnRecipientSide: body.linkedWholesaleServiceOnRecipientSide,
      contactChannel: body.contactChannel,
      internalNotes: body.internalNotes ?? null,
      createdByUserId,
    },
    select: DETAIL_SELECT,
  })

  await logAuditEvent({
    action: 'CREATE',
    userId: createdByUserId,
    entityType: 'porting_request',
    entityId: request.id,
    requestId: request.id,
    newValue: `CREATE ${request.caseNumber}`,
    ipAddress,
    userAgent,
  })

  await PortingEvents.requestCreated(request.id, request.caseNumber, createdByUserId)

  return toDetailDto(request)
}

export async function listPortingRequests(
  query: PortingRequestListQuery,
): Promise<PortingRequestListResultDto> {
  const where: Prisma.PortingRequestWhereInput = {}

  if (query.status) {
    where.statusInternal = query.status
  }

  if (query.portingMode) {
    where.portingMode = query.portingMode
  }

  if (query.donorOperatorId) {
    where.donorOperatorId = query.donorOperatorId
  }

  if (query.search?.trim()) {
    const search = query.search.trim()

    where.OR = [
      { caseNumber: { contains: search, mode: 'insensitive' } },
      { primaryNumber: { contains: search } },
      { rangeStart: { contains: search } },
      { rangeEnd: { contains: search } },
      { requestDocumentNumber: { contains: search, mode: 'insensitive' } },
      {
        client: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
    ]
  }

  const [total, requests] = await prisma.$transaction([
    prisma.portingRequest.count({ where }),
    prisma.portingRequest.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])

  return {
    items: requests.map(toListItem),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  }
}

export async function getPortingRequest(id: string): Promise<PortingRequestDetailDto> {
  const request = await prisma.portingRequest.findUnique({
    where: { id },
    select: DETAIL_SELECT,
  })

  if (!request) {
    throw AppError.notFound('Sprawa portowania nie zostala znaleziona.')
  }

  return toDetailDto(request)
}

export async function getPortingRequestIntegrationEvents(
  requestId: string,
): Promise<PliCbdIntegrationEventsResultDto> {
  await getPortingRequestForPliCbdOrThrow(requestId)
  return getPliCbdIntegrationEvents(requestId)
}

export async function updatePortingRequestStatus(
  requestId: string,
  body: UpdatePortingRequestStatusBody,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<PortingRequestDetailDto> {
  const request = await getPortingRequestForStatusChangeOrThrow(requestId)
  const currentStatus = request.statusInternal
  const targetStatus = body.targetStatus

  assertStatusTransitionAllowed(currentStatus, targetStatus)

  await prisma.$transaction([
    prisma.portingRequest.update({
      where: { id: requestId },
      data: {
        statusInternal: targetStatus,
      },
    }),
    prisma.portingRequestEvent.create({
      data: {
        request: { connect: { id: requestId } },
        eventSource: 'INTERNAL',
        eventType: 'STATUS_CHANGED',
        title: `Zmiana statusu na: ${PORTING_CASE_STATUS_LABELS[targetStatus]}`,
        description: `Status sprawy zostal zmieniony z ${PORTING_CASE_STATUS_LABELS[currentStatus]} na ${PORTING_CASE_STATUS_LABELS[targetStatus]}.`,
        statusBefore: currentStatus,
        statusAfter: targetStatus,
        createdBy: { connect: { id: userId } },
      },
    }),
  ])

  await logAuditEvent({
    action: 'STATUS_CHANGE',
    userId,
    entityType: 'porting_request',
    entityId: requestId,
    requestId,
    oldValue: currentStatus,
    newValue: targetStatus,
    ipAddress,
    userAgent,
  })

  return getPortingRequest(requestId)
}

export async function exportPortingRequestToPliCbd(
  requestId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<PortingRequestDetailDto> {
  const request = await getPortingRequestForPliCbdOrThrow(requestId)

  if (CLOSED_STATUSES.includes(request.statusInternal)) {
    const error = AppError.badRequest(
      'Nie mozna eksportowac do PLI CBD sprawy zakonczonej lub zamknietej.',
      'PORTING_REQUEST_ALREADY_CLOSED',
    )

    await prisma.pliCbdIntegrationEvent.create({
      data: {
        portingRequestId: request.id,
        operationType: 'EXPORT',
        operationStatus: 'ERROR',
        actionName: PLI_CBD_MANUAL_TRIGGER_ACTION,
        errorMessage: error.message,
        triggeredByUserId: userId,
      },
    })

    throw error
  }

  await PortingEvents.exportTriggered(requestId, userId)

  const adapterResult = await withPliCbdIntegrationTracking(
    requestId,
    userId,
    'EXPORT',
    request,
    PLI_CBD_MANUAL_TRIGGER_ACTION,
    () => portingRequestPliCbdAdapter.exportPortingRequestToPliCbd(request),
  )

  const resolvedExportStatus = adapterResult.exportStatus ?? request.pliCbdExportStatus

  await prisma.portingRequest.update({
    where: { id: requestId },
    data: {
      pliCbdExportStatus: resolvedExportStatus,
      pliCbdCaseId: adapterResult.pliCbdCaseId ?? request.pliCbdCaseId,
      pliCbdCaseNumber: adapterResult.pliCbdCaseNumber ?? request.pliCbdCaseNumber,
      pliCbdLastSyncAt:
        adapterResult.pliCbdLastSyncAt === undefined
          ? undefined
          : adapterResult.pliCbdLastSyncAt,
      donorAssignedPortDate:
        adapterResult.donorAssignedPortDate === undefined
          ? undefined
          : adapterResult.donorAssignedPortDate,
      donorAssignedPortTime:
        adapterResult.donorAssignedPortTime === undefined
          ? undefined
          : adapterResult.donorAssignedPortTime,
      lastExxReceived:
        adapterResult.lastPliCbdMessageType === undefined
          ? undefined
          : adapterResult.lastPliCbdMessageType,
      lastPliCbdStatusCode:
        adapterResult.lastPliCbdStatusCode === undefined
          ? undefined
          : adapterResult.lastPliCbdStatusCode,
      lastPliCbdStatusDescription:
        adapterResult.lastPliCbdStatusDescription === undefined
          ? undefined
          : adapterResult.lastPliCbdStatusDescription,
    },
  })

  await PortingEvents.exportStateUpdated(requestId, userId, resolvedExportStatus)

  await logAuditEvent({
    action: 'EXPORT',
    userId,
    entityType: 'porting_request',
    entityId: requestId,
    requestId,
    newValue: 'EXPORT_TO_PLI_CBD_MANUAL_TRIGGER',
    ipAddress,
    userAgent,
  })

  return getPortingRequest(requestId)
}

export async function syncPortingRequestFromPliCbd(
  requestId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<PortingRequestDetailDto> {
  const request = await getPortingRequestForPliCbdOrThrow(requestId)

  if (request.pliCbdExportStatus === 'NOT_EXPORTED') {
    const error = AppError.badRequest(
      'Nie mozna synchronizowac sprawy, ktora nie zostala jeszcze wyeksportowana do PLI CBD.',
      'PORTING_REQUEST_NOT_EXPORTED',
    )

    await prisma.pliCbdIntegrationEvent.create({
      data: {
        portingRequestId: request.id,
        operationType: 'SYNC',
        operationStatus: 'ERROR',
        actionName: PLI_CBD_MANUAL_TRIGGER_ACTION,
        errorMessage: error.message,
        triggeredByUserId: userId,
      },
    })

    throw error
  }

  await PortingEvents.syncTriggered(requestId, userId)

  const adapterResult = await withPliCbdIntegrationTracking(
    requestId,
    userId,
    'SYNC',
    request,
    PLI_CBD_MANUAL_TRIGGER_ACTION,
    () => portingRequestPliCbdAdapter.syncPortingRequestFromPliCbd(request),
  )

  const resolvedSyncAt = adapterResult.pliCbdLastSyncAt ?? new Date()

  await prisma.portingRequest.update({
    where: { id: requestId },
    data: {
      pliCbdExportStatus: adapterResult.exportStatus ?? request.pliCbdExportStatus,
      pliCbdCaseId: adapterResult.pliCbdCaseId ?? request.pliCbdCaseId,
      pliCbdCaseNumber: adapterResult.pliCbdCaseNumber ?? request.pliCbdCaseNumber,
      pliCbdLastSyncAt: resolvedSyncAt,
      donorAssignedPortDate:
        adapterResult.donorAssignedPortDate === undefined
          ? undefined
          : adapterResult.donorAssignedPortDate,
      donorAssignedPortTime:
        adapterResult.donorAssignedPortTime === undefined
          ? undefined
          : adapterResult.donorAssignedPortTime,
      lastExxReceived:
        adapterResult.lastPliCbdMessageType === undefined
          ? undefined
          : adapterResult.lastPliCbdMessageType,
      lastPliCbdStatusCode:
        adapterResult.lastPliCbdStatusCode === undefined
          ? undefined
          : adapterResult.lastPliCbdStatusCode,
      lastPliCbdStatusDescription:
        adapterResult.lastPliCbdStatusDescription === undefined
          ? undefined
          : adapterResult.lastPliCbdStatusDescription,
    },
  })

  await PortingEvents.syncStateUpdated(requestId, userId, resolvedSyncAt.toISOString())

  await logAuditEvent({
    action: 'UPDATE',
    userId,
    entityType: 'porting_request',
    entityId: requestId,
    requestId,
    newValue: 'SYNC_FROM_PLI_CBD_MANUAL_TRIGGER',
    ipAddress,
    userAgent,
  })

  return getPortingRequest(requestId)
}
