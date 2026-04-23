import { Prisma, type PortingCaseStatus, type UserRole } from '@prisma/client'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import { logAuditEvent } from '../../shared/audit/audit.service'
import { PortingEvents } from './porting-events.service'
import type {
  CommercialOwnerCandidatesResultDto,
  CommercialOwnerSummaryDto,
  CreatePortingRequestDto,
  ExecutePortingRequestExternalActionResultDto,
  PortingRequestAssigneeSummaryDto,
  PortingRequestAssignmentHistoryItemDto,
  PortingRequestAssignmentHistoryResultDto,
  PortingRequestAssignmentUsersResultDto,
  PortingCommunicationDto,
  PortingRequestDetailDto,
  PliCbdIntegrationEventsResultDto,
  PortingRequestListItemDto,
  PortingRequestListResultDto,
  PortingRequestOperationalSummaryDto,
} from '@np-manager/shared'
import {
  getPortingUrgencyDateBoundaries,
  getPortingWorkPriorityRank,
  PORTING_CASE_STATUS_LABELS,
} from '@np-manager/shared'
import type {
  ConfirmPortingRequestPortDateBody,
  CreatePortingRequestBody,
  ExecutePortingRequestExternalActionBody,
  PortingRequestListQuery,
  PortingRequestSummaryQuery,
  UpdatePortingRequestAssignmentBody,
  UpdatePortingRequestCommercialOwnerBody,
  UpdatePortingRequestStatusBody,
} from './porting-requests.schema'
import { dispatchPortingNotification } from './porting-notification.service'
import {
  computeNotificationHealth,
  NOTIFICATION_FAILURE_OUTCOMES,
} from './porting-notification-health.helper'
import { PORTING_NOTIFICATION_EVENT } from './porting-notification-events'
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
import { resolveSystemCapabilities } from '../system-capabilities/system-capabilities.service'

const CLOSED_STATUSES: PortingCaseStatus[] = ['REJECTED', 'CANCELLED', 'PORTED']
const MANUAL_PORT_DATE_CONFIRMATION_ALLOWED_STATUSES: PortingCaseStatus[] = [
  'SUBMITTED',
  'PENDING_DONOR',
  'CONFIRMED',
]
const MANUAL_PORT_DATE_CONFIRMATION_TARGET_STATUS: PortingCaseStatus = 'CONFIRMED'
const PLI_CBD_MANUAL_TRIGGER_ACTION = 'MANUAL_FOUNDATION_TRIGGER'
const DISPATCH_TITLE_PREFIX = '[Dispatch] '

const NOTIFICATION_FAILURE_EVENT_WHERE: Prisma.PortingRequestEventWhereInput = {
  eventSource: 'INTERNAL',
  eventType: 'NOTE',
  title: { startsWith: DISPATCH_TITLE_PREFIX },
  OR: NOTIFICATION_FAILURE_OUTCOMES.map((outcome) => ({
    description: { contains: outcome },
  })),
}

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

const ASSIGNEE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
} as const

const LIST_SELECT = {
  id: true,
  caseNumber: true,
  primaryNumber: true,
  rangeStart: true,
  rangeEnd: true,
  numberRangeKind: true,
  confirmedPortDate: true,
  portingMode: true,
  statusInternal: true,
  createdAt: true,
  clientId: true,
  client: { select: CLIENT_SELECT },
  donorOperatorId: true,
  donorOperator: {
    select: { id: true, name: true },
  },
  assignedUser: {
    select: ASSIGNEE_SELECT,
  },
  commercialOwner: {
    select: ASSIGNEE_SELECT,
  },
  events: {
    where: NOTIFICATION_FAILURE_EVENT_WHERE,
    select: { description: true, occurredAt: true },
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
  assignedAt: true,
  assignedByUserId: true,
  commercialOwnerUserId: true,
  createdAt: true,
  updatedAt: true,
  client: { select: CLIENT_SELECT },
  donorOperator: { select: OPERATOR_SELECT },
  recipientOperator: { select: OPERATOR_SELECT },
  infrastructureOperator: { select: OPERATOR_SELECT },
  assignedUser: { select: ASSIGNEE_SELECT },
  commercialOwner: { select: ASSIGNEE_SELECT },
  events: {
    where: NOTIFICATION_FAILURE_EVENT_WHERE,
    select: { description: true, occurredAt: true },
  },
} as const

type ClientRow = Prisma.ClientGetPayload<{ select: typeof CLIENT_SELECT }>
type OperatorRow = Prisma.OperatorGetPayload<{ select: typeof OPERATOR_SELECT }>
type AssigneeRow = Prisma.UserGetPayload<{ select: typeof ASSIGNEE_SELECT }>
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

type AssignmentTargetRow = Prisma.PortingRequestGetPayload<{
  select: {
    id: true
    caseNumber: true
    assignedUserId: true
  }
}>

type AssignmentHistoryRow = Prisma.PortingRequestAssignmentHistoryGetPayload<{
  select: {
    id: true
    portingRequestId: true
    createdAt: true
    previousAssignedUser: {
      select: typeof ASSIGNEE_SELECT
    }
    nextAssignedUser: {
      select: typeof ASSIGNEE_SELECT
    }
    changedByUser: {
      select: typeof ASSIGNEE_SELECT
    }
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

function getUserDisplayName(user: {
  firstName?: string | null
  lastName?: string | null
}): string {
  const parts = [user.firstName, user.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Brak danych'
}

function toAssigneeSummary(user: AssigneeRow | null | undefined): PortingRequestAssigneeSummaryDto | null {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    displayName: getUserDisplayName(user),
    role: user.role,
  }
}

function toCommercialOwnerSummary(user: AssigneeRow | null | undefined): CommercialOwnerSummaryDto | null {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    displayName: getUserDisplayName(user),
    role: user.role,
  }
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

function buildQuickWorkFilterWhere(
  quickWorkFilter: PortingRequestListQuery['quickWorkFilter'],
): Prisma.PortingRequestWhereInput | null {
  if (!quickWorkFilter) {
    return null
  }

  if (quickWorkFilter === 'NO_DATE') {
    return { confirmedPortDate: null }
  }

  const boundaries = getPortingUrgencyDateBoundaries()
  const dueBefore =
    quickWorkFilter === 'NEEDS_ACTION_TODAY'
      ? toDateOnlyValue(boundaries.tomorrowYmd)
      : toDateOnlyValue(boundaries.nextIsoWeekStartYmd)

  if (!dueBefore) {
    return null
  }

  return {
    confirmedPortDate: {
      lt: dueBefore,
    },
  }
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

async function getPortingRequestForAssignmentOrThrow(
  requestId: string,
): Promise<AssignmentTargetRow> {
  const request = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      caseNumber: true,
      assignedUserId: true,
    },
  })

  if (!request) {
    throw AppError.notFound('Sprawa portowania nie zostala znaleziona.')
  }

  return request
}

async function getActiveAssigneeOrThrow(userId: string): Promise<AssigneeRow> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: ASSIGNEE_SELECT,
  })

  if (!user) {
    throw AppError.notFound(
      'Wskazany uzytkownik do przypisania nie istnieje.',
      'ASSIGNEE_NOT_FOUND',
    )
  }

  if (!user.isActive) {
    throw AppError.badRequest(
      'Nie mozna przypisac sprawy do nieaktywnego uzytkownika.',
      'ASSIGNEE_INACTIVE',
    )
  }

  return user
}

function toAssignmentHistoryItem(row: AssignmentHistoryRow): PortingRequestAssignmentHistoryItemDto {
  return {
    id: row.id,
    portingRequestId: row.portingRequestId,
    previousAssignedUser: toAssigneeSummary(row.previousAssignedUser),
    nextAssignedUser: toAssigneeSummary(row.nextAssignedUser),
    changedByUser: toAssigneeSummary(row.changedByUser)!,
    createdAt: row.createdAt.toISOString(),
  }
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
  const notifHealth = computeNotificationHealth(row.events)
  return {
    id: row.id,
    caseNumber: row.caseNumber,
    clientId: row.clientId,
    clientDisplayName: getClientDisplayName(row.client),
    numberDisplay: getNumberDisplay(row),
    confirmedPortDate: toDateOnlyString(row.confirmedPortDate),
    donorOperatorId: row.donorOperatorId,
    donorOperatorName: row.donorOperator.name,
    portingMode: row.portingMode,
    statusInternal: row.statusInternal,
    assignedUserSummary: toAssigneeSummary(row.assignedUser),
    commercialOwnerSummary: toCommercialOwnerSummary(row.commercialOwner),
    hasNotificationFailures: row.events.length > 0,
    notificationHealthStatus: notifHealth.status,
    notificationFailureCount: notifHealth.failureCount,
    notificationLastFailureAt: notifHealth.lastFailureAt,
    notificationLastFailureOutcome: notifHealth.lastFailureOutcome,
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
    assignedUser: toAssigneeSummary(row.assignedUser),
    assignedAt: row.assignedAt?.toISOString() ?? null,
    assignedByUserId: row.assignedByUserId,
    commercialOwner: toCommercialOwnerSummary(row.commercialOwner),
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
    notificationHealth: computeNotificationHealth(row.events),
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
  currentUserId: string,
): Promise<PortingRequestListResultDto> {
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 20
  const sort = query.sort ?? 'CREATED_AT_DESC'
  const where = buildPortingRequestListWhere(query, currentUserId)

  if (sort === 'WORK_PRIORITY') {
    return listPortingRequestsByWorkPriority(where, page, pageSize)
  }

  const [total, requests] = await prisma.$transaction([
    prisma.portingRequest.count({ where }),
    prisma.portingRequest.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    items: requests.map(toListItem),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

async function listPortingRequestsByWorkPriority(
  where: Prisma.PortingRequestWhereInput,
  page: number,
  pageSize: number,
): Promise<PortingRequestListResultDto> {
  // Reuzywamy shared semantyki urgency do wyliczenia kubelka pracy dla kazdej
  // sprawy, a nastepnie paginujemy po stronie serwera aby lista byla spojna
  // miedzy stronami.
  const candidates = await prisma.portingRequest.findMany({
    where,
    select: { id: true, confirmedPortDate: true, createdAt: true },
  })

  const now = new Date()
  const ordered = [...candidates].sort((a, b) => compareWorkPriority(a, b, now))
  const total = ordered.length
  const pageIds = ordered.slice((page - 1) * pageSize, page * pageSize).map((r) => r.id)

  const rows = pageIds.length
    ? await prisma.portingRequest.findMany({
        where: { id: { in: pageIds } },
        select: LIST_SELECT,
      })
    : []

  const byId = new Map(rows.map((row) => [row.id, row]))
  const items: PortingRequestListItemDto[] = []
  for (const id of pageIds) {
    const row = byId.get(id)
    if (row) items.push(toListItem(row))
  }

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  }
}

interface WorkPriorityCandidate {
  id: string
  confirmedPortDate: Date | null
  createdAt: Date
}

function compareWorkPriority(
  a: WorkPriorityCandidate,
  b: WorkPriorityCandidate,
  now: Date,
): number {
  const aIso = toDateOnlyString(a.confirmedPortDate)
  const bIso = toDateOnlyString(b.confirmedPortDate)
  const aRank = getPortingWorkPriorityRank(aIso, now)
  const bRank = getPortingWorkPriorityRank(bIso, now)
  if (aRank !== bRank) return aRank - bRank

  // Dla dat: rosnaco po confirmedPortDate. NO_DATE: oldest-first wg createdAt.
  if (aIso && bIso) {
    if (aIso !== bIso) return aIso < bIso ? -1 : 1
  }

  const aCreated = a.createdAt.getTime()
  const bCreated = b.createdAt.getTime()
  if (aCreated !== bCreated) return aCreated - bCreated

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

interface BuildListWhereOptions {
  ignoreCommercialOwnerFilter?: boolean
  ignoreNotificationHealthFilter?: boolean
}

function buildPortingRequestListWhere(
  query: PortingRequestListQuery | PortingRequestSummaryQuery,
  currentUserId: string,
  options: BuildListWhereOptions = {},
): Prisma.PortingRequestWhereInput {
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

  if (query.ownership === 'MINE') {
    where.assignedUserId = currentUserId
  } else if (query.ownership === 'UNASSIGNED') {
    where.assignedUserId = null
  }

  const quickWorkFilterWhere = buildQuickWorkFilterWhere(
    'quickWorkFilter' in query ? query.quickWorkFilter : undefined,
  )
  if (quickWorkFilterWhere) {
    Object.assign(where, quickWorkFilterWhere)
  }

  if (!options.ignoreCommercialOwnerFilter) {
    if (query.commercialOwnerFilter === 'WITH_OWNER') {
      where.commercialOwnerUserId = { not: null }
    } else if (query.commercialOwnerFilter === 'WITHOUT_OWNER') {
      where.commercialOwnerUserId = null
    } else if (query.commercialOwnerFilter === 'MINE') {
      where.commercialOwnerUserId = currentUserId
    }
  }

  if (!options.ignoreNotificationHealthFilter) {
    if (query.notificationHealthFilter === 'HAS_FAILURES') {
      where.events = { some: NOTIFICATION_FAILURE_EVENT_WHERE }
    } else if (query.notificationHealthFilter === 'NO_FAILURES') {
      where.events = { none: NOTIFICATION_FAILURE_EVENT_WHERE }
    }
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

  return where
}

function withAdditionalWhere(
  baseWhere: Prisma.PortingRequestWhereInput,
  extraWhere: Prisma.PortingRequestWhereInput,
): Prisma.PortingRequestWhereInput {
  const clauses = [baseWhere, extraWhere].filter((clause) => Object.keys(clause).length > 0)

  if (clauses.length === 0) {
    return {}
  }

  if (clauses.length === 1) {
    return clauses[0] as Prisma.PortingRequestWhereInput
  }

  return { AND: clauses }
}

export async function getPortingRequestsOperationalSummary(
  query: PortingRequestSummaryQuery,
  currentUserId: string,
): Promise<PortingRequestOperationalSummaryDto> {
  const baseWhere = buildPortingRequestListWhere(query, currentUserId, {
    ignoreCommercialOwnerFilter: true,
    ignoreNotificationHealthFilter: true,
  })

  const urgentWhere = buildQuickWorkFilterWhere('URGENT')
  const noDateWhere = buildQuickWorkFilterWhere('NO_DATE')
  const needsActionTodayWhere = buildQuickWorkFilterWhere('NEEDS_ACTION_TODAY')

  const [
    totalRequests,
    withCommercialOwner,
    withoutCommercialOwner,
    myCommercialRequests,
    requestsWithNotificationFailures,
    urgentCount,
    noDateCount,
    needsActionTodayCount,
  ] = await prisma.$transaction([
    prisma.portingRequest.count({ where: baseWhere }),
    prisma.portingRequest.count({
      where: withAdditionalWhere(baseWhere, {
        commercialOwnerUserId: { not: null },
      }),
    }),
    prisma.portingRequest.count({
      where: withAdditionalWhere(baseWhere, {
        commercialOwnerUserId: null,
      }),
    }),
    prisma.portingRequest.count({
      where: withAdditionalWhere(baseWhere, {
        commercialOwnerUserId: currentUserId,
      }),
    }),
    prisma.portingRequest.count({
      where: withAdditionalWhere(baseWhere, {
        events: { some: NOTIFICATION_FAILURE_EVENT_WHERE },
      }),
    }),
    prisma.portingRequest.count({
      where: urgentWhere ? withAdditionalWhere(baseWhere, urgentWhere) : baseWhere,
    }),
    prisma.portingRequest.count({
      where: noDateWhere ? withAdditionalWhere(baseWhere, noDateWhere) : baseWhere,
    }),
    prisma.portingRequest.count({
      where: needsActionTodayWhere ? withAdditionalWhere(baseWhere, needsActionTodayWhere) : baseWhere,
    }),
  ])

  return {
    totalRequests,
    withCommercialOwner,
    withoutCommercialOwner,
    myCommercialRequests,
    requestsWithNotificationFailures,
    quickWorkCounts: {
      urgent: urgentCount,
      noDate: noDateCount,
      needsActionToday: needsActionTodayCount,
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

export async function getPortingRequestByCaseNumber(
  caseNumber: string,
  actorRole: UserRole,
): Promise<PortingRequestDetailDto> {
  const requestStub = await prisma.portingRequest.findUnique({
    where: { caseNumber },
    select: { id: true },
  })

  if (!requestStub) {
    throw AppError.notFound('Sprawa portowania nie zostala znaleziona.')
  }

  return getPortingRequest(requestStub.id, actorRole)
}

export async function updatePortingRequestAssignment(
  requestId: string,
  body: UpdatePortingRequestAssignmentBody,
  userId: string,
  userRole: UserRole,
  ipAddress?: string,
  userAgent?: string,
): Promise<PortingRequestDetailDto> {
  const nextAssignedUserId = body.assignedUserId

  if (nextAssignedUserId) {
    await getActiveAssigneeOrThrow(nextAssignedUserId)
  }

  const request = await getPortingRequestForAssignmentOrThrow(requestId)
  const previousAssignedUserId = request.assignedUserId

  if (previousAssignedUserId === nextAssignedUserId) {
    return getPortingRequest(requestId, userRole)
  }

  const now = new Date()

  await prisma.$transaction(async (tx) => {
    await tx.portingRequest.update({
      where: { id: requestId },
      data: {
        assignedUserId: nextAssignedUserId,
        assignedAt: nextAssignedUserId ? now : null,
        assignedByUserId: nextAssignedUserId ? userId : null,
      },
    })

    await tx.portingRequestAssignmentHistory.create({
      data: {
        portingRequestId: requestId,
        previousAssignedUserId,
        nextAssignedUserId,
        changedByUserId: userId,
      },
    })
  })

  await logAuditEvent({
    action: 'UPDATE',
    userId,
    entityType: 'porting_request',
    entityId: requestId,
    requestId,
    fieldName: 'assignedUserId',
    oldValue: previousAssignedUserId ?? 'UNASSIGNED',
    newValue: nextAssignedUserId ?? 'UNASSIGNED',
    ipAddress,
    userAgent,
  })

  return getPortingRequest(requestId, userRole)
}

export async function assignPortingRequestToMe(
  requestId: string,
  userId: string,
  userRole: UserRole,
  ipAddress?: string,
  userAgent?: string,
): Promise<PortingRequestDetailDto> {
  return updatePortingRequestAssignment(
    requestId,
    { assignedUserId: userId },
    userId,
    userRole,
    ipAddress,
    userAgent,
  )
}

export async function getPortingRequestAssignmentHistory(
  requestId: string,
): Promise<PortingRequestAssignmentHistoryResultDto> {
  await getPortingRequestForAssignmentOrThrow(requestId)

  const rows = await prisma.portingRequestAssignmentHistory.findMany({
    where: { portingRequestId: requestId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      portingRequestId: true,
      createdAt: true,
      previousAssignedUser: { select: ASSIGNEE_SELECT },
      nextAssignedUser: { select: ASSIGNEE_SELECT },
      changedByUser: { select: ASSIGNEE_SELECT },
    },
  })

  return {
    items: rows.map(toAssignmentHistoryItem),
  }
}

export async function listAssignablePortingRequestUsers(): Promise<PortingRequestAssignmentUsersResultDto> {
  const rows = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { email: 'asc' }],
  })

  return {
    users: rows.map((row) => ({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role as UserRole,
    })),
  }
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
  const updated = await getPortingRequest(requestId, userRole)

  // Powiadomienie wewnętrzne — non-blocking, nie blokuje odpowiedzi API
  dispatchPortingNotification({
    requestId,
    caseNumber: updated.caseNumber,
    event: PORTING_NOTIFICATION_EVENT.STATUS_CHANGED,
    commercialOwnerUserId: updated.commercialOwner?.id ?? null,
    actorUserId: userId,
    metadata: { newStatus: updated.statusInternal },
  }).catch(() => {})

  return updated
}

export async function confirmPortingRequestPortDateManual(
  requestId: string,
  body: ConfirmPortingRequestPortDateBody,
  userId: string,
  userRole: UserRole,
  ipAddress?: string,
  userAgent?: string,
): Promise<PortingRequestDetailDto> {
  const capabilities = await resolveSystemCapabilities()
  if (capabilities.mode !== 'STANDALONE') {
    throw AppError.badRequest(
      'Akcja potwierdzenia daty przeniesienia jest dostepna tylko w trybie manualnym.',
      'PORTING_REQUEST_MANUAL_PORT_DATE_CONFIRMATION_NOT_AVAILABLE',
    )
  }

  const request = await getPortingRequestForExternalActionOrThrow(requestId)
  const currentStatus = request.statusInternal

  if (!MANUAL_PORT_DATE_CONFIRMATION_ALLOWED_STATUSES.includes(currentStatus)) {
    throw AppError.badRequest(
      `Nie mozna potwierdzic daty przeniesienia w statusie ${PORTING_CASE_STATUS_LABELS[currentStatus]}.`,
      'PORTING_REQUEST_MANUAL_PORT_DATE_CONFIRMATION_STATUS_NOT_ALLOWED',
    )
  }

  const normalizedComment = body.comment?.trim() ? body.comment.trim() : null
  const confirmedPortDate = toDateOnlyValue(body.confirmedPortDate)
  const previousConfirmedPortDate = toDateOnlyString(request.confirmedPortDate)

  if (!confirmedPortDate) {
    throw AppError.badRequest(
      'Potwierdzona data przeniesienia jest wymagana.',
      'PORTING_REQUEST_MANUAL_PORT_DATE_CONFIRMATION_DATE_REQUIRED',
    )
  }

  const resolvedTransition =
    currentStatus === MANUAL_PORT_DATE_CONFIRMATION_TARGET_STATUS
      ? null
      : resolveWorkflowTransition(
          currentStatus,
          { targetStatus: MANUAL_PORT_DATE_CONFIRMATION_TARGET_STATUS },
          userRole,
        )

  const nextStatus = resolvedTransition?.config.targetStatus ?? currentStatus
  const statusChanged = nextStatus !== currentStatus

  await prisma.$transaction(async (tx) => {
    await tx.portingRequest.update({
      where: { id: requestId },
      data: {
        confirmedPortDate,
        donorAssignedPortDate: confirmedPortDate,
        rejectionReason: null,
        statusInternal: statusChanged ? nextStatus : undefined,
      },
    })

    await createCaseHistoryEntry(tx, {
      requestId,
      eventType: 'STATUS_CHANGED',
      statusBefore: statusChanged ? currentStatus : null,
      statusAfter: nextStatus,
      comment: normalizedComment,
      actorUserId: userId,
      metadata: {
        actionId: 'CONFIRM_PORT_DATE_MANUAL',
        actionLabel: 'Potwierdz date przeniesienia',
        confirmedPortDate: body.confirmedPortDate,
        previousConfirmedPortDate,
        statusTransitionApplied: statusChanged,
      },
    })

    const descriptionParts = [
      `Potwierdzono date przeniesienia: ${body.confirmedPortDate}.`,
      statusChanged
        ? `Status sprawy zmieniono z ${PORTING_CASE_STATUS_LABELS[currentStatus]} na ${PORTING_CASE_STATUS_LABELS[nextStatus]}.`
        : null,
      normalizedComment ? `Komentarz: ${normalizedComment}` : null,
    ].filter(Boolean)

    await tx.portingRequestEvent.create({
      data: {
        request: { connect: { id: requestId } },
        eventSource: 'INTERNAL',
        eventType: 'NOTE',
        title: 'Potwierdzono date przeniesienia',
        description: descriptionParts.join(' '),
        statusBefore: currentStatus,
        statusAfter: nextStatus,
        createdBy: { connect: { id: userId } },
      },
    })
  })

  await logAuditEvent({
    action: statusChanged ? 'STATUS_CHANGE' : 'UPDATE',
    userId,
    entityType: 'porting_request',
    entityId: requestId,
    requestId,
    fieldName: statusChanged ? undefined : 'confirmedPortDate',
    oldValue: statusChanged ? currentStatus : previousConfirmedPortDate ?? 'BRAK',
    newValue: statusChanged ? nextStatus : body.confirmedPortDate,
    ipAddress,
    userAgent,
  })

  const updated = await getPortingRequest(requestId, userRole)

  dispatchPortingNotification({
    requestId,
    caseNumber: updated.caseNumber,
    event: PORTING_NOTIFICATION_EVENT.PORT_DATE_CONFIRMED,
    commercialOwnerUserId: updated.commercialOwner?.id ?? null,
    actorUserId: userId,
    metadata: {
      confirmedPortDate: body.confirmedPortDate,
      statusTransitionApplied: statusChanged,
      newStatus: updated.statusInternal,
    },
  }).catch(() => {})

  return updated
}

export async function updateCommercialOwner(
  requestId: string,
  body: UpdatePortingRequestCommercialOwnerBody,
  userId: string,
  userRole: UserRole,
  ipAddress?: string,
  userAgent?: string,
): Promise<PortingRequestDetailDto> {
  const nextOwnerId = body.commercialOwnerUserId

  const current = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: { id: true, caseNumber: true, commercialOwnerUserId: true },
  })

  if (!current) {
    throw AppError.notFound('Sprawa portowania nie została znaleziona.')
  }

  if (current.commercialOwnerUserId === nextOwnerId) {
    return getPortingRequest(requestId, userRole)
  }

  if (nextOwnerId) {
    const candidate = await prisma.user.findUnique({
      where: { id: nextOwnerId },
      select: { id: true, role: true, isActive: true, firstName: true, lastName: true },
    })

    if (!candidate) {
      throw AppError.notFound('Wskazany opiekun handlowy nie został znaleziony.')
    }

    if (!candidate.isActive) {
      throw AppError.badRequest(
        'Wskazany użytkownik jest nieaktywny i nie może pełnić roli opiekuna handlowego.',
        'COMMERCIAL_OWNER_INACTIVE',
      )
    }

    if (candidate.role !== 'SALES') {
      throw AppError.badRequest(
        'Opiekunem handlowym może zostać wyłącznie użytkownik z rolą Opiekun Handlowy (SALES).',
        'COMMERCIAL_OWNER_INVALID_ROLE',
      )
    }
  }

  await prisma.portingRequest.update({
    where: { id: requestId },
    data: { commercialOwnerUserId: nextOwnerId },
  })

  await logAuditEvent({
    action: 'UPDATE',
    userId,
    entityType: 'porting_request',
    entityId: requestId,
    requestId,
    fieldName: 'commercialOwnerUserId',
    oldValue: current.commercialOwnerUserId ?? 'BRAK',
    newValue: nextOwnerId ?? 'BRAK',
    ipAddress,
    userAgent,
  })

  const updated = await getPortingRequest(requestId, userRole)

  // Powiadomienie wewnętrzne — non-blocking
  dispatchPortingNotification({
    requestId,
    caseNumber: updated.caseNumber,
    event: PORTING_NOTIFICATION_EVENT.COMMERCIAL_OWNER_CHANGED,
    commercialOwnerUserId: nextOwnerId,
    actorUserId: userId,
    metadata: {
      newOwnerName: updated.commercialOwner?.displayName ?? null,
    },
  }).catch(() => {})

  return updated
}

export async function listCommercialOwnerCandidates(): Promise<CommercialOwnerCandidatesResultDto> {
  const rows = await prisma.user.findMany({
    where: { isActive: true, role: 'SALES' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  return {
    users: rows.map((row) => ({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role as UserRole,
    })),
  }
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
