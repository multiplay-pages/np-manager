import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import { logAuditEvent } from '../../shared/audit/audit.service'
import { renderCommunicationTemplate } from './communication-template-renderer'
import type {
  CommunicationTemplateDto,
  CommunicationTemplateListResultDto,
  CommunicationTemplateCode,
  CreateCommunicationTemplateDto,
  PortingCommunicationTemplateContextDto,
  PortingCommunicationTriggerType,
  PortingRequestCommunicationActionType,
  UpdateCommunicationTemplateDto,
} from '@np-manager/shared'

const COMMUNICATION_TEMPLATE_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  channel: true,
  subjectTemplate: true,
  bodyTemplate: true,
  isActive: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  createdByUserId: true,
  updatedByUserId: true,
  createdBy: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
  updatedBy: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} as const

type CommunicationTemplateRow = Prisma.CommunicationTemplateGetPayload<{
  select: typeof COMMUNICATION_TEMPLATE_SELECT
}>

function getDisplayName(user: { firstName: string; lastName: string } | null): string | null {
  if (!user) return null

  const value = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return value.length > 0 ? value : null
}

function mapCommunicationTemplateToDto(row: CommunicationTemplateRow): CommunicationTemplateDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    channel: row.channel,
    subjectTemplate: row.subjectTemplate,
    bodyTemplate: row.bodyTemplate,
    isActive: row.isActive,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdByDisplayName: getDisplayName(row.createdBy),
    updatedByDisplayName: getDisplayName(row.updatedBy),
  }
}

function getMockTemplateContext(): PortingCommunicationTemplateContextDto {
  return {
    clientName: 'Jan Testowy',
    caseNumber: 'FNP-TEMPLATE-001',
    portedNumber: '221234567',
    donorOperatorName: 'Orange Polska',
    recipientOperatorName: 'G-NET',
    plannedPortDate: '2026-04-20',
    issueDescription: 'Brakuje pelnomocnictwa klienta.',
    contactEmail: 'kontakt@np-manager.local',
    contactPhone: '600700800',
  }
}

function validateTemplateBodyOrThrow(params: {
  subjectTemplate: string
  bodyTemplate: string
}): void {
  const result = renderCommunicationTemplate(
    {
      subjectTemplate: params.subjectTemplate,
      bodyTemplate: params.bodyTemplate,
    },
    getMockTemplateContext(),
  )

  if (result.unknownPlaceholders.length > 0) {
    throw AppError.badRequest(
      `Szablon zawiera nieznane placeholdery: ${result.unknownPlaceholders.join(', ')}.`,
      'COMMUNICATION_TEMPLATE_UNKNOWN_PLACEHOLDERS',
    )
  }
}

async function ensureNoOtherActiveTemplate(params: {
  code: CommunicationTemplateCode
  channel: CreateCommunicationTemplateDto['channel']
  excludeId?: string
}): Promise<void> {
  const existing = await prisma.communicationTemplate.findFirst({
    where: {
      code: params.code,
      channel: params.channel,
      isActive: true,
      id: params.excludeId ? { not: params.excludeId } : undefined,
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (existing) {
    throw AppError.conflict(
      `Aktywny szablon dla kodu ${params.code} i kanalu ${params.channel} juz istnieje (${existing.name}).`,
      'COMMUNICATION_TEMPLATE_ACTIVE_ALREADY_EXISTS',
    )
  }
}

async function getNextTemplateVersion(
  code: CommunicationTemplateCode,
  channel: CreateCommunicationTemplateDto['channel'],
): Promise<number> {
  const latest = await prisma.communicationTemplate.findFirst({
    where: { code, channel },
    orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
    select: { version: true },
  })

  return (latest?.version ?? 0) + 1
}

async function getCommunicationTemplateOrThrow(id: string): Promise<CommunicationTemplateRow> {
  const template = await prisma.communicationTemplate.findUnique({
    where: { id },
    select: COMMUNICATION_TEMPLATE_SELECT,
  })

  if (!template) {
    throw AppError.notFound('Szablon komunikatu nie zostal znaleziony.', 'COMMUNICATION_TEMPLATE_NOT_FOUND')
  }

  return template
}

export async function listCommunicationTemplates(): Promise<CommunicationTemplateListResultDto> {
  const items = await prisma.communicationTemplate.findMany({
    select: COMMUNICATION_TEMPLATE_SELECT,
    orderBy: [{ code: 'asc' }, { updatedAt: 'desc' }],
  })

  return {
    items: items.map((item) => mapCommunicationTemplateToDto(item)),
  }
}

export async function getCommunicationTemplateById(id: string): Promise<CommunicationTemplateDto> {
  return mapCommunicationTemplateToDto(await getCommunicationTemplateOrThrow(id))
}

export async function createCommunicationTemplate(
  body: CreateCommunicationTemplateDto,
  actorUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<CommunicationTemplateDto> {
  validateTemplateBodyOrThrow(body)

  if (body.isActive ?? true) {
    await ensureNoOtherActiveTemplate({
      code: body.code,
      channel: body.channel,
    })
  }

  const template = await prisma.communicationTemplate.create({
    data: {
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      channel: body.channel,
      subjectTemplate: body.subjectTemplate,
      bodyTemplate: body.bodyTemplate,
      isActive: body.isActive ?? true,
      version: await getNextTemplateVersion(body.code, body.channel),
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
    select: COMMUNICATION_TEMPLATE_SELECT,
  })

  const result = mapCommunicationTemplateToDto(template)

  await logAuditEvent({
    action: 'CREATE',
    userId: actorUserId,
    entityType: 'communication_template',
    entityId: result.id,
    newValue: `${result.code}:${result.version}:${result.isActive ? 'ACTIVE' : 'INACTIVE'}`,
    ipAddress,
    userAgent,
  })

  return result
}

export async function updateCommunicationTemplate(
  id: string,
  body: UpdateCommunicationTemplateDto,
  actorUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<CommunicationTemplateDto> {
  const current = await getCommunicationTemplateOrThrow(id)

  const nextPayload = {
    code: body.code ?? current.code,
    name: body.name ?? current.name,
    description: body.description === undefined ? current.description : body.description,
    channel: body.channel ?? current.channel,
    subjectTemplate: body.subjectTemplate ?? current.subjectTemplate,
    bodyTemplate: body.bodyTemplate ?? current.bodyTemplate,
    isActive: body.isActive ?? current.isActive,
  }

  validateTemplateBodyOrThrow({
    subjectTemplate: nextPayload.subjectTemplate,
    bodyTemplate: nextPayload.bodyTemplate,
  })

  if (nextPayload.isActive) {
    await ensureNoOtherActiveTemplate({
      code: nextPayload.code,
      channel: nextPayload.channel,
      excludeId: id,
    })
  }

  const updated = await prisma.communicationTemplate.update({
    where: { id },
    data: {
      ...nextPayload,
      version: current.version + 1,
      updatedByUserId: actorUserId,
    },
    select: COMMUNICATION_TEMPLATE_SELECT,
  })

  const result = mapCommunicationTemplateToDto(updated)

  await logAuditEvent({
    action: 'UPDATE',
    userId: actorUserId,
    entityType: 'communication_template',
    entityId: result.id,
    oldValue: `${current.code}:${current.version}:${current.isActive ? 'ACTIVE' : 'INACTIVE'}`,
    newValue: `${result.code}:${result.version}:${result.isActive ? 'ACTIVE' : 'INACTIVE'}`,
    ipAddress,
    userAgent,
  })

  return result
}

async function setCommunicationTemplateActiveState(
  id: string,
  isActive: boolean,
  actorUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<CommunicationTemplateDto> {
  const current = await getCommunicationTemplateOrThrow(id)

  if (isActive) {
    await ensureNoOtherActiveTemplate({
      code: current.code,
      channel: current.channel,
      excludeId: id,
    })
  }

  const updated = await prisma.communicationTemplate.update({
    where: { id },
    data: {
      isActive,
      version: current.version + 1,
      updatedByUserId: actorUserId,
    },
    select: COMMUNICATION_TEMPLATE_SELECT,
  })

  const result = mapCommunicationTemplateToDto(updated)

  await logAuditEvent({
    action: 'UPDATE',
    userId: actorUserId,
    entityType: 'communication_template',
    entityId: result.id,
    oldValue: `${current.code}:${current.version}:${current.isActive ? 'ACTIVE' : 'INACTIVE'}`,
    newValue: `${result.code}:${result.version}:${result.isActive ? 'ACTIVE' : 'INACTIVE'}`,
    ipAddress,
    userAgent,
  })

  return result
}

export async function activateCommunicationTemplate(
  id: string,
  actorUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<CommunicationTemplateDto> {
  return setCommunicationTemplateActiveState(id, true, actorUserId, ipAddress, userAgent)
}

export async function deactivateCommunicationTemplate(
  id: string,
  actorUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<CommunicationTemplateDto> {
  return setCommunicationTemplateActiveState(id, false, actorUserId, ipAddress, userAgent)
}

export async function getActiveCommunicationTemplateOrThrow(
  code: CommunicationTemplateCode,
  channel: CreateCommunicationTemplateDto['channel'],
): Promise<CommunicationTemplateDto> {
  const template = await prisma.communicationTemplate.findFirst({
    where: {
      code,
      channel,
      isActive: true,
    },
    select: COMMUNICATION_TEMPLATE_SELECT,
    orderBy: [{ updatedAt: 'desc' }, { version: 'desc' }],
  })

  if (!template) {
    throw AppError.conflict(
      `Brak aktywnego szablonu dla komunikacji ${code} (${channel}).`,
      'COMMUNICATION_TEMPLATE_ACTIVE_NOT_FOUND',
    )
  }

  return mapCommunicationTemplateToDto(template)
}

export function resolveCommunicationTemplateCodeForAction(params: {
  actionType: PortingRequestCommunicationActionType
  triggerType: PortingCommunicationTriggerType
}): CommunicationTemplateCode {
  if (params.triggerType === 'PORT_DATE_SCHEDULED') {
    return 'PORT_DATE_RECEIVED'
  }

  if (params.triggerType === 'PORT_COMPLETED') {
    return 'PORTING_DAY'
  }

  if (params.triggerType === 'CASE_REJECTED' || params.triggerType === 'MANUAL') {
    return 'ISSUE_NOTICE'
  }

  if (params.actionType === 'COMPLETION_NOTICE') {
    return 'PORTING_DAY'
  }

  if (
    params.actionType === 'MISSING_DOCUMENTS' ||
    params.actionType === 'REJECTION_NOTICE' ||
    params.actionType === 'INTERNAL_NOTE_EMAIL'
  ) {
    return 'ISSUE_NOTICE'
  }

  return 'REQUEST_RECEIVED'
}
