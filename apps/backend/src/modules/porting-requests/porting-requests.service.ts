import { Prisma, type PortingCaseStatus, type UserRole } from '@prisma/client'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import { logAuditEvent } from '../../shared/audit/audit.service'
import { PortingEvents } from './porting-events.service'
import type {
  CreatePortingRequestDto,
  ExecutePortingRequestExternalActionResultDto,
  PortingCommunicationDto,
  PortingRequestDetailDto,
  PliCbdIntegrationEventsResultDto,
  PortingRequestListItemDto,
  PortingRequestListResultDto,
} from '@np-manager/shared'
import {
  PORTING_CASE_STATUS_LABELS,
} from '@np-manager/shared'
import type {
  CreatePortingRequestBody,
  ExecutePortingRequestExternalActionBody,
  PortingRequestListQuery,
  UpdatePortingRequestStatusBody,
} from './porting-requests.schema'
import {
  PLI_CBD_TRIGGER_SELECT,
  type PliCbdTriggerRow,
  portingRequestPliCbdAdapter,
} from '../pli-cbd/pli-cbd.adapter'
import {
  createFailedIntegrationAttempt,
  getPliCbdIntegrationEvents,
  withPliCbdIntegrationTracking,
} from '../pli-cbd/pli-cbd.integration-tracker'
import {
  createCaseHistoryEntry,
} from './porting-request-case-history.service'
import {
  getAvailableStatusActions,
  resolveWorkflowTransition,
} from './porting-request-workflow'
import {
  getAvailableExternalActions,
  resolveExternalActionPlan,
} from './porting-request-external-actions'
import {
  createPortingCommunicationDraft,
  getPortingCommunicationHistoryItems,
} from './porting-request-communication.service'
import {
  buildCommunicationSummary,
  getAvailableCommunicationActionsForRequest,
} from '../communications/porting-request-communication-policy'

const CLOSED_STATUSES: PortingCaseStatus[] = ['REJECTED', 'CANCELLED', 'PORTED']
const PLI_CBD_MANUAL_TRIGGER_ACTION = 'MANUAL_FOUNDATION_TRIGGER'

const CLIENT_SELECT = {
  id: true,
  clientType: true,
  firstName: true,
  lastName: true,
  companyName: true,
  email: true,
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
  sentToExternalSystemAt: true,
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

type ExternalActionRow = Prisma.PortingRequestGetPayload<{
  select: {
    id: true
    caseNumber: true
    statusInternal: true
    sentToExternalSystemAt: true
    requestedPortDate: true
    confirmedPortDate: true
    donorAssignedPortDate: true
    rejectionReason: true
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

function formatExternalActionDate(value: string | null): string | null {
  if (!value) return null
  return value
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

async function getPortingRequestForExternalActionOrThrow(
  requestId: string,
): Promise<ExternalActionRow> {
  const request = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      caseNumber: true,
      statusInternal: true,
      sentToExternalSystemAt: true,
      requestedPortDate: true,
      confirmedPortDate: true,
      donorAssignedPortDate: true,
      rejectionReason: true,
    },
  })

  if (!request) {
    throw AppError.notFound('Sprawa portowania nie zostala znaleziona.')
  }

  return request
}

function buildExternalActionEvent(
  actionId: ExecutePortingRequestExternalActionBody['actionId'],
  payload: {
    scheduledPortDate?: string | null
    rejectionReason?: string | null
    comment?: string | null
  },
): { title: string; description: string } {
  if (actionId === 'MARK_SENT_TO_EXTERNAL_SYSTEM') {
    return {
      title: 'Przekazano sprawe do obslugi zewnetrznej',
      description: payload.comment
        ? `Sprawa zostala oznaczona jako przekazana do Adescom. ${payload.comment}`
        : 'Sprawa zostala oznaczona jako przekazana do Adescom.',
    }
  }

  if (actionId === 'SET_PORT_DATE') {
    const scheduledPortDate = formatExternalActionDate(payload.scheduledPortDate ?? null)
    return {
      title: 'Ustalono date przeniesienia',
      description: [
        scheduledPortDate ? `Data przeniesienia: ${scheduledPortDate}.` : null,
        payload.comment,
      ]
        .filter(Boolean)
        .join(' '),
    }
  }

  if (actionId === 'MARK_DONOR_REJECTION') {
    return {
      title: 'Zarejestrowano odrzucenie od dawcy',
      description: [
        payload.rejectionReason ? `Powod: ${payload.rejectionReason}.` : null,
        payload.comment,
      ]
        .filter(Boolean)
        .join(' '),
    }
  }

  return {
    title: 'Oznaczono przeniesienie jako zakonczone',
    description: payload.comment
      ? `Przeniesienie numeru zostalo oznaczone jako zakonczone. ${payload.comment}`
      : 'Przeniesienie numeru zostalo oznaczone jako zakonczone.',
  }
}

async function throwBlockedPliCbdIntegrationAttempt(
  request: PliCbdTriggerRow,
  userId: string,
  operationType: 'EXPORT' | 'SYNC',
  error: AppError,
): Promise<never> {
  try {
    await createFailedIntegrationAttempt(
      request.id,
      userId,
      operationType,
      request,
      PLI_CBD_MANUAL_TRIGGER_ACTION,
      error.message,
    )
  } catch {
    // Audit failure must not mask the original business error returned to UI/API.
  }

  throw error
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

function toDetailDto(
  row: DetailRow,
  actorRole: UserRole,
  communicationHistory: PortingCommunicationDto[],
): PortingRequestDetailDto {
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
    sentToExternalSystemAt: row.sentToExternalSystemAt?.toISOString() ?? null,
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
    availableStatusActions: getAvailableStatusActions(row.statusInternal, actorRole),
    availableExternalActions: getAvailableExternalActions(
      {
        statusInternal: row.statusInternal,
        sentToExternalSystemAt: row.sentToExternalSystemAt,
      },
      actorRole,
    ),
    availableCommunicationActions: getAvailableCommunicationActionsForRequest(
      {
        statusInternal: row.statusInternal,
        sentToExternalSystemAt: row.sentToExternalSystemAt,
        confirmedPortDate: row.confirmedPortDate,
        donorAssignedPortDate: row.donorAssignedPortDate,
      },
      actorRole,
      communicationHistory,
    ),
    communicationSummary: buildCommunicationSummary(communicationHistory),
  }
}

export async function createPortingRequest(
  body: CreatePortingRequestBody,
  createdByUserId: string,
  actorRole: UserRole,
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

  const request = await prisma.$transaction(async (tx) => {
    const createdRequest = await tx.portingRequest.create({
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

    await createCaseHistoryEntry(tx, {
      requestId: createdRequest.id,
      eventType: 'REQUEST_CREATED',
      statusAfter: createdRequest.statusInternal,
      actorUserId: createdByUserId,
      metadata: {
        caseNumber: createdRequest.caseNumber,
        source: 'PORTING_REQUEST_CREATE',
      },
    })

    return createdRequest
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

  return toDetailDto(request, actorRole, [])
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

export async function getPortingRequest(
  id: string,
  actorRole: UserRole,
): Promise<PortingRequestDetailDto> {
  const [request, communicationHistory] = await Promise.all([
    prisma.portingRequest.findUnique({
      where: { id },
      select: DETAIL_SELECT,
    }),
    getPortingCommunicationHistoryItems(id),
  ])

  if (!request) {
    throw AppError.notFound('Sprawa portowania nie zostala znaleziona.')
  }

  return toDetailDto(request, actorRole, communicationHistory)
}

export async function getPortingRequestIntegrationEvents(
  requestId: string,
): Promise<PliCbdIntegrationEventsResultDto> {
  await getPortingRequestForPliCbdOrThrow(requestId)
  return getPliCbdIntegrationEvents(requestId)
}

export async function changePortingRequestStatus(
  requestId: string,
  body: UpdatePortingRequestStatusBody,
  userId: string,
  userRole: UserRole,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  const request = await getPortingRequestForStatusChangeOrThrow(requestId)
  const currentStatus = request.statusInternal
  const { config, reason, comment } = resolveWorkflowTransition(currentStatus, body, userRole)
  const descriptionLines = [
    `Status sprawy zostal zmieniony z ${PORTING_CASE_STATUS_LABELS[currentStatus]} na ${PORTING_CASE_STATUS_LABELS[config.targetStatus]}.`,
    reason ? `Powod: ${reason}.` : null,
    comment ? `Komentarz: ${comment}` : null,
  ].filter(Boolean)

  await prisma.$transaction(async (tx) => {
    await tx.portingRequest.update({
      where: { id: requestId },
      data: {
        statusInternal: config.targetStatus,
      },
    })

    await createCaseHistoryEntry(tx, {
      requestId,
      eventType: 'STATUS_CHANGED',
      statusBefore: currentStatus,
      statusAfter: config.targetStatus,
      reason,
      comment,
      actorUserId: userId,
      metadata: {
        actionId: config.actionId,
        actionLabel: config.label,
      },
    })

    await tx.portingRequestEvent.create({
      data: {
        request: { connect: { id: requestId } },
        eventSource: 'INTERNAL',
        eventType: 'STATUS_CHANGED',
        title: `Zmiana statusu na: ${PORTING_CASE_STATUS_LABELS[config.targetStatus]}`,
        description: descriptionLines.join(' '),
        statusBefore: currentStatus,
        statusAfter: config.targetStatus,
        createdBy: { connect: { id: userId } },
      },
    })
  })

  await logAuditEvent({
    action: 'STATUS_CHANGE',
    userId,
    entityType: 'porting_request',
    entityId: requestId,
    requestId,
    oldValue: currentStatus,
    newValue: config.targetStatus,
    ipAddress,
    userAgent,
  })
}

export async function updatePortingRequestStatus(
  requestId: string,
  body: UpdatePortingRequestStatusBody,
  userId: string,
  userRole: UserRole,
  ipAddress?: string,
  userAgent?: string,
): Promise<PortingRequestDetailDto> {
  await changePortingRequestStatus(requestId, body, userId, userRole, ipAddress, userAgent)
  return getPortingRequest(requestId, userRole)
}

export async function executePortingRequestExternalAction(
  requestId: string,
  body: ExecutePortingRequestExternalActionBody,
  userId: string,
  userRole: UserRole,
  ipAddress?: string,
  userAgent?: string,
): Promise<ExecutePortingRequestExternalActionResultDto> {
  const request = await getPortingRequestForExternalActionOrThrow(requestId)
  const plan = resolveExternalActionPlan(
    {
      statusInternal: request.statusInternal,
      sentToExternalSystemAt: request.sentToExternalSystemAt,
    },
    body,
    userRole,
  )

  const { title, description } = buildExternalActionEvent(plan.config.actionId, {
    scheduledPortDate: plan.scheduledPortDate,
    rejectionReason: plan.rejectionReason,
    comment: plan.comment,
  })

  const communication = await prisma.$transaction(async (tx) => {
    const updateData: Prisma.PortingRequestUpdateInput = {}

    if (plan.config.actionId === 'MARK_SENT_TO_EXTERNAL_SYSTEM') {
      updateData.sentToExternalSystemAt = new Date()
    }

    if (plan.config.actionId === 'SET_PORT_DATE') {
      const scheduledPortDate = toDateOnlyValue(plan.scheduledPortDate ?? undefined) ?? null
      updateData.confirmedPortDate = scheduledPortDate
      updateData.donorAssignedPortDate = scheduledPortDate
      updateData.rejectionReason = null
    }

    if (plan.config.actionId === 'MARK_DONOR_REJECTION') {
      updateData.rejectionReason = plan.rejectionReason
    }

    if (plan.config.actionId === 'MARK_PORT_COMPLETED') {
      updateData.rejectionReason = null
    }

    if (plan.targetStatus) {
      updateData.statusInternal = plan.targetStatus
    }

    await tx.portingRequest.update({
      where: { id: requestId },
      data: updateData,
    })

    if (plan.targetStatus) {
      await createCaseHistoryEntry(tx, {
        requestId,
        eventType: 'STATUS_CHANGED',
        statusBefore: request.statusInternal,
        statusAfter: plan.targetStatus,
        reason: plan.rejectionReason,
        comment: plan.comment,
        actorUserId: userId,
        metadata: {
          actionId: plan.config.actionId,
          actionLabel: plan.config.label,
          externalAction: true,
        },
      })
    }

    await tx.portingRequestEvent.create({
      data: {
        request: { connect: { id: requestId } },
        eventSource: 'INTERNAL',
        eventType: 'NOTE',
        title,
        description,
        statusBefore: request.statusInternal,
        statusAfter: plan.targetStatus ?? request.statusInternal,
        createdBy: { connect: { id: userId } },
      },
    })

    if (!body.createCommunicationDraft) {
      return null
    }

    return createPortingCommunicationDraft(
      requestId,
      {
        actionType:
          plan.config.actionId === 'MARK_DONOR_REJECTION'
            ? 'REJECTION_NOTICE'
            : plan.config.actionId === 'MARK_PORT_COMPLETED'
              ? 'COMPLETION_NOTICE'
              : 'CLIENT_CONFIRMATION',
        type: 'EMAIL',
        triggerType: plan.config.suggestedCommunicationTriggerType,
        recipient: body.recipient,
        metadata: {
          sourceActionId: plan.config.actionId,
          sourceActionLabel: plan.config.label,
        },
      },
      userId,
      userRole,
      ipAddress,
      userAgent,
      tx,
    )
  })

  await logAuditEvent({
    action: plan.targetStatus ? 'STATUS_CHANGE' : 'UPDATE',
    userId,
    entityType: 'porting_request',
    entityId: requestId,
    requestId,
    oldValue: request.statusInternal,
    newValue: plan.targetStatus ?? plan.config.actionId,
    ipAddress,
    userAgent,
  })

  return {
    request: await getPortingRequest(requestId, userRole),
    communication,
  }
}

export async function exportPortingRequestToPliCbd(
  requestId: string,
  userId: string,
  actorRole: UserRole,
  ipAddress?: string,
  userAgent?: string,
): Promise<PortingRequestDetailDto> {
  const request = await getPortingRequestForPliCbdOrThrow(requestId)

  if (CLOSED_STATUSES.includes(request.statusInternal)) {
    await throwBlockedPliCbdIntegrationAttempt(
      request,
      userId,
      'EXPORT',
      AppError.badRequest(
        'Nie mozna eksportowac do PLI CBD sprawy zakonczonej lub zamknietej.',
        'PORTING_REQUEST_ALREADY_CLOSED',
      ),
    )
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

  return getPortingRequest(requestId, actorRole)
}

export async function syncPortingRequestFromPliCbd(
  requestId: string,
  userId: string,
  actorRole: UserRole,
  ipAddress?: string,
  userAgent?: string,
): Promise<PortingRequestDetailDto> {
  const request = await getPortingRequestForPliCbdOrThrow(requestId)

  if (request.pliCbdExportStatus === 'NOT_EXPORTED') {
    await throwBlockedPliCbdIntegrationAttempt(
      request,
      userId,
      'SYNC',
      AppError.badRequest(
        'Nie mozna synchronizowac sprawy, ktora nie zostala jeszcze wyeksportowana do PLI CBD.',
        'PORTING_REQUEST_NOT_EXPORTED',
      ),
    )
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

  return getPortingRequest(requestId, actorRole)
}
