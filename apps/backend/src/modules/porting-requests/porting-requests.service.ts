import { Prisma, type PortingCaseStatus } from '@prisma/client'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import { logAuditEvent } from '../../shared/audit/audit.service'
import type {
  CreatePortingRequestDto,
  PortingRequestDetailDto,
  PortingRequestListItemDto,
  PortingRequestListResultDto,
} from '@np-manager/shared'
import type {
  CreatePortingRequestBody,
  PortingRequestListQuery,
} from './porting-requests.schema'

const CLOSED_STATUSES: PortingCaseStatus[] = ['REJECTED', 'CANCELLED', 'PORTED']

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
  statusInternal: true,
  statusPliCbd: true,
  pliCbdCaseId: true,
  pliCbdPackageId: true,
  lastExxReceived: true,
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
    return `${request.rangeStart ?? '—'} — ${request.rangeEnd ?? '—'}`
  }

  return request.primaryNumber ?? '—'
}

function toDateOnlyString(value: Date | null | undefined): string | null {
  if (!value) return null
  return value.toISOString().slice(0, 10)
}

function toDateOnlyValue(value?: string): Date | undefined {
  if (!value) return undefined
  return new Date(`${value}T00:00:00.000Z`)
}

function normalizeIdentityValue(identityType: CreatePortingRequestDto['identityType'], value: string): string {
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

  throw AppError.internal('Nie udało się wygenerować numeru sprawy.')
}

async function getClientOrThrow(clientId: string): Promise<ClientRow> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: CLIENT_SELECT,
  })

  if (!client) {
    throw AppError.notFound('Wybrany klient nie został znaleziony.')
  }

  return client
}

async function getActiveOperatorOrThrow(operatorId: string, label: string): Promise<OperatorRow> {
  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: OPERATOR_SELECT,
  })

  if (!operator) {
    throw AppError.notFound(`${label} nie został znaleziony.`)
  }

  if (!operator.isActive) {
    throw AppError.badRequest(`${label} jest nieaktywny i nie może zostać użyty w sprawie.`)
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
      'Brak skonfigurowanego domyślnego operatora biorącego. Poproś administratora o uzupełnienie słownika operatorów.',
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
      `Dla wskazanej numeracji istnieje już otwarta sprawa (${duplicate.caseNumber}). Zamknij ją albo użyj innego numeru/zakresu.`,
      'ACTIVE_REQUEST_ALREADY_EXISTS_FOR_NUMBER',
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
    statusInternal: row.statusInternal,
    statusPliCbd: row.statusPliCbd,
    pliCbdCaseId: row.pliCbdCaseId,
    pliCbdPackageId: row.pliCbdPackageId,
    lastExxReceived: row.lastExxReceived,
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
      'Typ abonenta w sprawie musi być zgodny z typem wybranego klienta.',
      'SUBSCRIBER_KIND_MISMATCH',
    )
  }

  const donorOperator = await getActiveOperatorOrThrow(body.donorOperatorId, 'Operator oddający')
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
      requestedPortTime: body.requestedPortTime ?? null,
      earliestAcceptablePortDate: toDateOnlyValue(body.earliestAcceptablePortDate) ?? null,
      portingMode: body.portingMode,
      statusInternal: 'DRAFT',
      subscriberKind: body.subscriberKind,
      subscriberFirstName: body.subscriberKind === 'INDIVIDUAL' ? body.subscriberFirstName ?? null : null,
      subscriberLastName: body.subscriberKind === 'INDIVIDUAL' ? body.subscriberLastName ?? null : null,
      subscriberCompanyName: body.subscriberKind === 'BUSINESS' ? body.subscriberCompanyName ?? null : null,
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

  return toDetailDto(request)
}

export async function listPortingRequests(
  query: PortingRequestListQuery,
): Promise<PortingRequestListResultDto> {
  const where: Prisma.PortingRequestWhereInput = {}

  if (query.status) {
    where.statusInternal = query.status
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
    throw AppError.notFound('Sprawa portowania nie została znaleziona.')
  }

  return toDetailDto(request)
}
