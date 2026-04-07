import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import { logAuditEvent } from '../../shared/audit/audit.service'
import type {
  MarkPortingCommunicationSentDto,
  PortingCommunicationDto,
  PortingCommunicationListResultDto,
  PortingCommunicationPreviewDto,
  PortingCommunicationTemplateContextDto,
  PortingCommunicationTriggerType,
  PortingRequestCommunicationActionType,
  PreparePortingCommunicationDraftDto,
  UserRole,
} from '@np-manager/shared'
import { renderCommunicationTemplate } from '../communications/communication-template-renderer'
import {
  getPublishedCommunicationTemplateVersionOrThrow,
  resolveCommunicationTemplateCodeForAction,
} from '../communications/communication-templates.service'
import {
  getAvailableCommunicationActionsForRequest,
  getCommunicationActionPolicy,
  resolveCommunicationActionTypeForRecord,
  resolveCommunicationActionTypeFromTemplateKey,
  resolveCommunicationActionTypeFromTriggerType,
  resolveCommunicationTemplateKeyForAction,
  resolveCommunicationTriggerTypeForAction,
  resolveSuggestedCommunicationActionType,
} from '../communications/porting-request-communication-policy'
import { resolveSuggestedCommunicationTriggerType } from './porting-request-communication.templates'

type CommunicationDbClient = PrismaClient | Prisma.TransactionClient

const REQUEST_COMMUNICATION_SNAPSHOT_SELECT = {
  id: true,
  caseNumber: true,
  statusInternal: true,
  primaryNumber: true,
  rangeStart: true,
  rangeEnd: true,
  numberRangeKind: true,
  requestedPortDate: true,
  confirmedPortDate: true,
  donorAssignedPortDate: true,
  rejectionReason: true,
  sentToExternalSystemAt: true,
  client: {
    select: {
      clientType: true,
      firstName: true,
      lastName: true,
      companyName: true,
      email: true,
      phoneContact: true,
    },
  },
  donorOperator: {
    select: {
      name: true,
    },
  },
  recipientOperator: {
    select: {
      name: true,
    },
  },
} as const

const COMMUNICATION_SELECT = {
  id: true,
  portingRequestId: true,
  type: true,
  status: true,
  triggerType: true,
  recipient: true,
  subject: true,
  body: true,
  templateKey: true,
  createdByUserId: true,
  sentAt: true,
  errorMessage: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      firstName: true,
      lastName: true,
      role: true,
    },
  },
} as const

type RequestCommunicationSnapshotRow = Prisma.PortingRequestGetPayload<{
  select: typeof REQUEST_COMMUNICATION_SNAPSHOT_SELECT
}>
type CommunicationRow = Prisma.PortingCommunicationGetPayload<{ select: typeof COMMUNICATION_SELECT }>

function getClientDisplayName(snapshot: RequestCommunicationSnapshotRow['client']): string {
  if (snapshot.clientType === 'BUSINESS') {
    return snapshot.companyName?.trim() || 'Klient biznesowy'
  }

  const parts = [snapshot.firstName, snapshot.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Klient'
}

function getPhoneNumberDisplay(snapshot: RequestCommunicationSnapshotRow): string {
  if (snapshot.numberRangeKind === 'DDI_RANGE') {
    return `${snapshot.rangeStart ?? '-'} - ${snapshot.rangeEnd ?? '-'}`
  }

  return snapshot.primaryNumber ?? '-'
}

function formatDateForTemplate(value: Date | null): string | null {
  if (!value) return null

  return value.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Warsaw',
  })
}

function mapMetadata(
  metadata: Prisma.JsonValue | null,
): Record<string, string | number | boolean | null> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null
  }

  return Object.fromEntries(
    Object.entries(metadata as Record<string, Prisma.JsonValue>).filter(([, value]) => {
      return (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      )
    }),
  ) as Record<string, string | number | boolean | null>
}

function resolveActionType(
  snapshot: RequestCommunicationSnapshotRow,
  body: PreparePortingCommunicationDraftDto,
): PortingRequestCommunicationActionType {
  if (body.actionType) {
    return body.actionType
  }

  if (body.templateKey) {
    return (
      resolveCommunicationActionTypeFromTemplateKey(body.templateKey) ??
      resolveSuggestedCommunicationActionType(snapshot)
    )
  }

  if (body.triggerType) {
    return resolveCommunicationActionTypeFromTriggerType(body.triggerType)
  }

  return resolveSuggestedCommunicationActionType(snapshot)
}

export async function getPortingCommunicationHistoryItems(
  requestId: string,
  db: CommunicationDbClient = prisma,
): Promise<PortingCommunicationDto[]> {
  const items = await db.portingCommunication.findMany({
    where: { portingRequestId: requestId },
    select: COMMUNICATION_SELECT,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })

  return items.map(mapCommunicationToDto)
}

function getPolicyActionForRequestOrThrow(params: {
  snapshot: RequestCommunicationSnapshotRow
  actionType: PortingRequestCommunicationActionType
  actorRole: UserRole
  communicationHistory: PortingCommunicationDto[]
}) {
  const action = getAvailableCommunicationActionsForRequest(
    params.snapshot,
    params.actorRole,
    params.communicationHistory,
  ).find((item) => item.type === params.actionType)

  if (!action) {
    throw AppError.forbidden(
      'Nie masz uprawnien do wykonania tej akcji komunikacyjnej.',
      'PORTING_COMMUNICATION_ACTION_ROLE_NOT_ALLOWED',
    )
  }

  if (action.disabled && !action.canPreview && !action.canCreateDraft && !action.canMarkSent) {
    throw AppError.badRequest(
      action.disabledReason ?? 'Ta akcja komunikacyjna nie jest dostepna dla aktualnej sprawy.',
      'PORTING_COMMUNICATION_ACTION_NOT_ALLOWED',
    )
  }

  return action
}

export function mapCommunicationToDto(row: CommunicationRow): PortingCommunicationDto {
  const createdByDisplayName = row.createdBy
    ? [row.createdBy.firstName, row.createdBy.lastName].filter(Boolean).join(' ').trim()
    : null
  const metadata = mapMetadata(row.metadata)

  return {
    id: row.id,
    portingRequestId: row.portingRequestId,
    actionType: resolveCommunicationActionTypeForRecord({
      metadata,
      templateKey: row.templateKey,
      triggerType: row.triggerType,
    }),
    type: row.type,
    status: row.status,
    triggerType: row.triggerType,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    templateKey: row.templateKey,
    createdByUserId: row.createdByUserId,
    createdByDisplayName: createdByDisplayName || null,
    createdByRole: row.createdBy?.role ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    errorMessage: row.errorMessage,
    metadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function buildCommunicationTemplateContext(
  snapshot: RequestCommunicationSnapshotRow,
  params: {
    actionType: PortingRequestCommunicationActionType
    triggerType: PortingCommunicationTriggerType
    metadata?: Record<string, string | number | boolean | null> | null
  },
): PortingCommunicationTemplateContextDto {
  const metadataIssueDescription =
    typeof params.metadata?.issueDescription === 'string' &&
    params.metadata.issueDescription.trim().length > 0
      ? params.metadata.issueDescription.trim()
      : null
  const defaultIssueDescription =
    params.actionType === 'MISSING_DOCUMENTS'
      ? 'Brakuje dokumentow lub danych wymaganych do dalszej obslugi sprawy.'
      : params.actionType === 'REJECTION_NOTICE'
        ? snapshot.rejectionReason?.trim() || 'Sprawa wymaga korekty po stronie klienta.'
        : params.actionType === 'INTERNAL_NOTE_EMAIL'
          ? 'Wiadomosc operacyjna wymaga uwagi po stronie odbiorcy.'
          : params.triggerType === 'CASE_REJECTED'
            ? snapshot.rejectionReason?.trim() || 'Wystapil problem po stronie procesu portowania.'
            : null

  return {
    clientName: getClientDisplayName(snapshot.client),
    caseNumber: snapshot.caseNumber,
    portedNumber: getPhoneNumberDisplay(snapshot),
    donorOperatorName: snapshot.donorOperator.name,
    recipientOperatorName: snapshot.recipientOperator.name,
    plannedPortDate: formatDateForTemplate(
      snapshot.donorAssignedPortDate ?? snapshot.confirmedPortDate ?? snapshot.requestedPortDate,
    ),
    issueDescription: metadataIssueDescription ?? defaultIssueDescription,
    contactEmail: snapshot.client.email?.trim() || null,
    contactPhone: snapshot.client.phoneContact?.trim() || null,
  }
}

async function getPortingRequestCommunicationSnapshotOrThrow(
  requestId: string,
): Promise<RequestCommunicationSnapshotRow> {
  const request = await prisma.portingRequest.findUnique({
    where: { id: requestId },
    select: REQUEST_COMMUNICATION_SNAPSHOT_SELECT,
  })

  if (!request) {
    throw AppError.notFound('Sprawa portowania nie zostala znaleziona.')
  }

  return request
}

function resolvePreviewTriggerType(
  snapshot: RequestCommunicationSnapshotRow,
  actionType: PortingRequestCommunicationActionType,
  body: PreparePortingCommunicationDraftDto,
): PortingCommunicationTriggerType {
  if (body.triggerType) {
    return body.triggerType
  }

  if (actionType === 'CLIENT_CONFIRMATION') {
    return resolveSuggestedCommunicationTriggerType(snapshot)
  }

  return resolveCommunicationTriggerTypeForAction(actionType)
}

export async function resolveCommunicationPreview(
  snapshot: RequestCommunicationSnapshotRow,
  body: PreparePortingCommunicationDraftDto,
): Promise<PortingCommunicationPreviewDto> {
  const actionType = resolveActionType(snapshot, body)
  const type = body.type ?? 'EMAIL'

  if (type !== 'EMAIL') {
    throw AppError.badRequest(
      'Workflow SMS nie jest jeszcze wdrozony. Na tym etapie obslugiwane sa tylko drafty e-mail.',
      'PORTING_COMMUNICATION_SMS_NOT_IMPLEMENTED',
    )
  }

  const triggerType = resolvePreviewTriggerType(snapshot, actionType, body)
  const templateKey = body.templateKey ?? resolveCommunicationTemplateKeyForAction(actionType)
  const recipient = body.recipient?.trim() || snapshot.client.email?.trim()

  if (!recipient) {
    throw AppError.badRequest(
      'Brak adresu e-mail klienta do przygotowania draftu komunikacji.',
      'PORTING_COMMUNICATION_RECIPIENT_MISSING',
    )
  }

  const templateCode = resolveCommunicationTemplateCodeForAction({
    actionType,
    triggerType,
  })
  const publishedTemplateVersion = await getPublishedCommunicationTemplateVersionOrThrow(
    templateCode,
    'EMAIL',
  )
  const context = buildCommunicationTemplateContext(snapshot, {
    actionType,
    triggerType,
    metadata: body.metadata ?? null,
  })
  const renderResult = renderCommunicationTemplate(
    {
      subjectTemplate: publishedTemplateVersion.subjectTemplate,
      bodyTemplate: publishedTemplateVersion.bodyTemplate,
    },
    context,
  )

  if (renderResult.unknownPlaceholders.length > 0) {
    throw AppError.badRequest(
      `Aktywny szablon zawiera nieznane placeholdery: ${renderResult.unknownPlaceholders.join(', ')}.`,
      'COMMUNICATION_TEMPLATE_RENDER_UNKNOWN_PLACEHOLDERS',
    )
  }

  if (renderResult.missingPlaceholders.length > 0) {
    throw AppError.badRequest(
      `Nie mozna wyrenderowac komunikacji. Brakuje danych dla placeholderow: ${renderResult.missingPlaceholders.join(', ')}.`,
      'COMMUNICATION_TEMPLATE_RENDER_MISSING_PLACEHOLDERS',
    )
  }

  return {
    actionType,
    type,
    triggerType,
    templateKey,
    recipient,
    subject: renderResult.renderedSubject,
    body: renderResult.renderedBody,
    context,
  }
}

export function buildCommunicationCreateData(params: {
  requestId: string
  preview: PortingCommunicationPreviewDto
  createdByUserId: string
  templateVersion: {
    versionId: string
    versionNumber: number
  }
  metadata?: Record<string, string | number | boolean | null> | null
}): Prisma.PortingCommunicationCreateInput {
  const templateCode = resolveCommunicationTemplateCodeForAction({
    actionType: params.preview.actionType,
    triggerType: params.preview.triggerType,
  })

  return {
    portingRequest: { connect: { id: params.requestId } },
    type: params.preview.type,
    status: 'DRAFT',
    triggerType: params.preview.triggerType,
    recipient: params.preview.recipient,
    subject: params.preview.subject,
    body: params.preview.body,
    templateKey: params.preview.templateKey,
    createdBy: { connect: { id: params.createdByUserId } },
    metadata: {
      ...(params.metadata ?? {}),
      actionType: params.preview.actionType,
      actionLabel: getCommunicationActionPolicy(params.preview.actionType).label,
      communicationTemplateCode: templateCode,
      communicationTemplateVersionId: params.templateVersion.versionId,
      communicationTemplateVersionNumber: params.templateVersion.versionNumber,
    },
  }
}

export async function previewPortingCommunication(
  requestId: string,
  body: PreparePortingCommunicationDraftDto,
  actorRole: UserRole,
): Promise<PortingCommunicationPreviewDto> {
  const snapshot = await getPortingRequestCommunicationSnapshotOrThrow(requestId)
  const communicationHistory = await getPortingCommunicationHistoryItems(requestId)
  const actionType = resolveActionType(snapshot, body)
  const action = getPolicyActionForRequestOrThrow({
    snapshot,
    actionType,
    actorRole,
    communicationHistory,
  })

  if (!action.canPreview) {
    throw AppError.badRequest(
      action.disabledReason ?? 'Podglad tej komunikacji nie jest dostepny dla aktualnej sprawy.',
      'PORTING_COMMUNICATION_PREVIEW_NOT_ALLOWED',
    )
  }

  return resolveCommunicationPreview(snapshot, body)
}

export async function createPortingCommunicationDraft(
  requestId: string,
  body: PreparePortingCommunicationDraftDto,
  createdByUserId: string,
  actorRole: UserRole,
  ipAddress?: string,
  userAgent?: string,
  db: CommunicationDbClient = prisma,
): Promise<PortingCommunicationDto> {
  const snapshot =
    db === prisma
      ? await getPortingRequestCommunicationSnapshotOrThrow(requestId)
      : await db.portingRequest.findUnique({
          where: { id: requestId },
          select: REQUEST_COMMUNICATION_SNAPSHOT_SELECT,
        })

  if (!snapshot) {
    throw AppError.notFound('Sprawa portowania nie zostala znaleziona.')
  }

  const communicationHistory = await getPortingCommunicationHistoryItems(requestId, db)
  const actionType = resolveActionType(snapshot, body)
  const action = getPolicyActionForRequestOrThrow({
    snapshot,
    actionType,
    actorRole,
    communicationHistory,
  })

  if (!action.canCreateDraft) {
    throw AppError.conflict(
      action.existingDraftInfo
        ? `Istnieje juz aktywny draft tego typu (${action.existingDraftInfo.subject}).`
        : action.disabledReason ?? 'Nie mozna utworzyc draftu dla tej akcji komunikacyjnej.',
      'COMMUNICATION_DRAFT_ALREADY_EXISTS',
    )
  }

  const preview = await resolveCommunicationPreview(snapshot, body)
  const publishedTemplateVersion = await getPublishedCommunicationTemplateVersionOrThrow(
    resolveCommunicationTemplateCodeForAction({
      actionType: preview.actionType,
      triggerType: preview.triggerType,
    }),
    'EMAIL',
  )
  const createdCommunication = await db.portingCommunication.create({
    data: buildCommunicationCreateData({
      requestId,
      preview,
      createdByUserId,
      templateVersion: {
        versionId: publishedTemplateVersion.versionId,
        versionNumber: publishedTemplateVersion.versionNumber,
      },
      metadata: body.metadata ?? null,
    }),
    select: COMMUNICATION_SELECT,
  })

  const result = mapCommunicationToDto(createdCommunication)

  if (db === prisma) {
    await logAuditEvent({
      action: 'CREATE',
      userId: createdByUserId,
      entityType: 'porting_communication',
      entityId: result.id,
      requestId,
      newValue: `${result.actionType}:${result.status}`,
      ipAddress,
      userAgent,
    })
  }

  return result
}

export async function getPortingCommunicationHistory(
  requestId: string,
): Promise<PortingCommunicationListResultDto> {
  await getPortingRequestCommunicationSnapshotOrThrow(requestId)

  return {
    items: await getPortingCommunicationHistoryItems(requestId),
  }
}

export async function markPortingCommunicationAsSent(
  requestId: string,
  communicationId: string,
  actorRole: UserRole,
  markedByUserId: string,
  body: MarkPortingCommunicationSentDto = {},
  ipAddress?: string,
  userAgent?: string,
): Promise<PortingCommunicationDto> {
  const snapshot = await getPortingRequestCommunicationSnapshotOrThrow(requestId)
  const existing = await prisma.portingCommunication.findFirst({
    where: {
      id: communicationId,
      portingRequestId: requestId,
    },
    select: COMMUNICATION_SELECT,
  })

  if (!existing) {
    throw AppError.notFound('Komunikat nie zostal znaleziony dla wskazanej sprawy.')
  }

  const existingDto = mapCommunicationToDto(existing)

  if (existingDto.status === 'SENT') {
    throw AppError.conflict(
      'Ten komunikat jest juz oznaczony jako wyslany.',
      'PORTING_COMMUNICATION_ALREADY_SENT',
    )
  }

  if (existingDto.status === 'CANCELLED') {
    throw AppError.badRequest(
      'Nie mozna oznaczyc anulowanego komunikatu jako wyslanego.',
      'PORTING_COMMUNICATION_CANCELLED',
    )
  }

  if (existingDto.status === 'SENDING') {
    throw AppError.conflict(
      'Wysylka tego komunikatu jest juz w toku.',
      'PORTING_COMMUNICATION_SENDING_IN_PROGRESS',
    )
  }

  const policy = getCommunicationActionPolicy(existingDto.actionType)

  if (!policy.allowedRoles.includes(actorRole)) {
    throw AppError.forbidden(
      'Nie masz uprawnien do oznaczenia tej komunikacji jako wyslanej.',
      'PORTING_COMMUNICATION_MARK_SENT_ROLE_NOT_ALLOWED',
    )
  }

  if (!policy.allowedStatuses.includes(snapshot.statusInternal)) {
    throw AppError.badRequest(
      'Nie mozna oznaczyc tej komunikacji jako wyslanej dla aktualnego statusu sprawy.',
      'PORTING_COMMUNICATION_MARK_SENT_STATUS_NOT_ALLOWED',
    )
  }

  if (!policy.canMarkSent) {
    throw AppError.badRequest(
      'Ta akcja komunikacyjna nie pozwala na reczne oznaczenie jako wyslana.',
      'PORTING_COMMUNICATION_MARK_SENT_NOT_ALLOWED',
    )
  }

  const sentAt = body.sentAt ? new Date(body.sentAt) : new Date()

  if (Number.isNaN(sentAt.getTime())) {
    throw AppError.badRequest(
      'Nieprawidlowy czas oznaczenia komunikatu jako wyslanego.',
      'PORTING_COMMUNICATION_SENT_AT_INVALID',
    )
  }

  const updatedCommunication = await prisma.portingCommunication.update({
    where: { id: communicationId },
    data: {
      status: 'SENT',
      sentAt,
      errorMessage: null,
    },
    select: COMMUNICATION_SELECT,
  })

  const result = mapCommunicationToDto(updatedCommunication)

  await logAuditEvent({
    action: 'UPDATE',
    userId: markedByUserId,
    entityType: 'porting_communication',
    entityId: result.id,
    requestId,
    oldValue: existingDto.status,
    newValue: result.status,
    ipAddress,
    userAgent,
  })

  return result
}
