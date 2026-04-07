import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { AppError } from '../../shared/errors/app-error'
import { logAuditEvent } from '../../shared/audit/audit.service'
import { renderCommunicationTemplate } from './communication-template-renderer'
import type {
  CommunicationTemplateCode,
  CommunicationTemplateDto,
  CommunicationTemplateListItemDto,
  CommunicationTemplateListResultDto,
  CommunicationTemplatePreviewRealCaseDto,
  CommunicationTemplatePreviewRealCaseRequestDto,
  CommunicationTemplateVersionDto,
  CommunicationTemplateVersionListResultDto,
  ContactChannel,
  CreateCommunicationTemplateDto,
  CreateCommunicationTemplateVersionDto,
  PortingCommunicationTemplateContextDto,
  PortingCommunicationTriggerType,
  PortingRequestCommunicationActionType,
  UpdateCommunicationTemplateVersionDto,
} from '@np-manager/shared'

const USER_DISPLAY_SELECT = Prisma.validator<Prisma.UserSelect>()({
  firstName: true,
  lastName: true,
})

const COMMUNICATION_TEMPLATE_VERSION_SELECT =
  Prisma.validator<Prisma.CommunicationTemplateVersionSelect>()({
  id: true,
  templateId: true,
  versionNumber: true,
  status: true,
  subjectTemplate: true,
  bodyTemplate: true,
  createdAt: true,
  updatedAt: true,
  createdByUserId: true,
  updatedByUserId: true,
  publishedAt: true,
  publishedByUserId: true,
  createdBy: {
    select: USER_DISPLAY_SELECT,
  },
  updatedBy: {
    select: USER_DISPLAY_SELECT,
  },
  publishedBy: {
    select: USER_DISPLAY_SELECT,
  },
})

const COMMUNICATION_TEMPLATE_SELECT = Prisma.validator<Prisma.CommunicationTemplateSelect>()({
  id: true,
  code: true,
  name: true,
  description: true,
  channel: true,
  createdAt: true,
  updatedAt: true,
  createdByUserId: true,
  updatedByUserId: true,
  createdBy: {
    select: USER_DISPLAY_SELECT,
  },
  updatedBy: {
    select: USER_DISPLAY_SELECT,
  },
  versions: {
    select: COMMUNICATION_TEMPLATE_VERSION_SELECT,
    orderBy: [{ versionNumber: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
  },
})

const PREVIEW_REAL_CASE_REQUEST_SELECT = Prisma.validator<Prisma.PortingRequestSelect>()({
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
})

type CommunicationTemplateVersionRow = Prisma.CommunicationTemplateVersionGetPayload<{
  select: typeof COMMUNICATION_TEMPLATE_VERSION_SELECT
}>

type CommunicationTemplateRow = Prisma.CommunicationTemplateGetPayload<{
  select: typeof COMMUNICATION_TEMPLATE_SELECT
}>

type PreviewRealCaseRequestRow = Prisma.PortingRequestGetPayload<{
  select: typeof PREVIEW_REAL_CASE_REQUEST_SELECT
}>

type PublishedCommunicationTemplateVersionResult = {
  templateId: string
  code: CommunicationTemplateCode
  channel: ContactChannel
  name: string
  description: string | null
  versionId: string
  versionNumber: number
  subjectTemplate: string
  bodyTemplate: string
}

function getDisplayName(user: { firstName: string; lastName: string } | null): string | null {
  if (!user) {
    return null
  }

  const value = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return value.length > 0 ? value : null
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

function formatDateForTemplate(value: Date | null): string | null {
  if (!value) {
    return null
  }

  return value.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Warsaw',
  })
}

function getClientDisplayName(snapshot: PreviewRealCaseRequestRow['client']): string {
  if (snapshot.clientType === 'BUSINESS') {
    return snapshot.companyName?.trim() || 'Klient biznesowy'
  }

  const parts = [snapshot.firstName, snapshot.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Klient'
}

function getPhoneNumberDisplay(snapshot: PreviewRealCaseRequestRow): string {
  if (snapshot.numberRangeKind === 'DDI_RANGE') {
    return `${snapshot.rangeStart ?? '-'} - ${snapshot.rangeEnd ?? '-'}`
  }

  return snapshot.primaryNumber ?? '-'
}

function buildRealCaseTemplateContext(
  snapshot: PreviewRealCaseRequestRow,
  issueDescription: string | null,
): PortingCommunicationTemplateContextDto {
  return {
    clientName: getClientDisplayName(snapshot.client),
    caseNumber: snapshot.caseNumber,
    portedNumber: getPhoneNumberDisplay(snapshot),
    donorOperatorName: snapshot.donorOperator.name,
    recipientOperatorName: snapshot.recipientOperator.name,
    plannedPortDate: formatDateForTemplate(
      snapshot.donorAssignedPortDate ?? snapshot.confirmedPortDate ?? snapshot.requestedPortDate,
    ),
    issueDescription:
      issueDescription?.trim() ||
      snapshot.rejectionReason?.trim() ||
      null,
    contactEmail: snapshot.client.email?.trim() || null,
    contactPhone: snapshot.client.phoneContact?.trim() || null,
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

function ensureVersionReadyForPublishOrThrow(version: {
  subjectTemplate: string
  bodyTemplate: string
}): void {
  const result = renderCommunicationTemplate(version, getMockTemplateContext())

  if (result.unknownPlaceholders.length > 0) {
    throw AppError.badRequest(
      `Nie mozna opublikowac wersji. Wykryto nieznane placeholdery: ${result.unknownPlaceholders.join(', ')}.`,
      'COMMUNICATION_TEMPLATE_UNKNOWN_PLACEHOLDERS',
    )
  }

  if (!result.isRenderable) {
    throw AppError.badRequest(
      'Nie mozna opublikowac nierenderowalnej wersji szablonu.',
      'COMMUNICATION_TEMPLATE_VERSION_NOT_RENDERABLE',
    )
  }
}

function mapCommunicationTemplateVersionToDto(
  row: CommunicationTemplateVersionRow,
): CommunicationTemplateVersionDto {
  return {
    id: row.id,
    templateId: row.templateId,
    versionNumber: row.versionNumber,
    status: row.status,
    subjectTemplate: row.subjectTemplate,
    bodyTemplate: row.bodyTemplate,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdByDisplayName: getDisplayName(row.createdBy),
    updatedByDisplayName: getDisplayName(row.updatedBy),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    publishedByUserId: row.publishedByUserId,
    publishedByDisplayName: getDisplayName(row.publishedBy),
  }
}

function getPublishedVersion(
  versions: CommunicationTemplateVersionDto[],
): CommunicationTemplateVersionDto | null {
  return versions.find((version) => version.status === 'PUBLISHED') ?? null
}

function mapCommunicationTemplateToDto(row: CommunicationTemplateRow): CommunicationTemplateDto {
  const versions = row.versions.map(mapCommunicationTemplateVersionToDto)
  const publishedVersion = getPublishedVersion(versions)

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    channel: row.channel,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdByDisplayName: getDisplayName(row.createdBy),
    updatedByDisplayName: getDisplayName(row.updatedBy),
    publishedVersionId: publishedVersion?.id ?? null,
    publishedVersionNumber: publishedVersion?.versionNumber ?? null,
    publishedAt: publishedVersion?.publishedAt ?? null,
    publishedByDisplayName: publishedVersion?.publishedByDisplayName ?? null,
    versions,
  }
}

function mapCommunicationTemplateToSummaryDto(
  row: CommunicationTemplateRow,
): CommunicationTemplateListItemDto {
  const dto = mapCommunicationTemplateToDto(row)
  const lastVersion = dto.versions
    .slice()
    .sort((left, right) => {
      return (
        new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime() ||
        right.versionNumber - left.versionNumber
      )
    })[0]

  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    description: dto.description,
    channel: dto.channel,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    createdByUserId: dto.createdByUserId,
    updatedByUserId: dto.updatedByUserId,
    createdByDisplayName: dto.createdByDisplayName,
    updatedByDisplayName: dto.updatedByDisplayName,
    publishedVersionId: dto.publishedVersionId,
    publishedVersionNumber: dto.publishedVersionNumber,
    publishedAt: dto.publishedAt,
    publishedByDisplayName: dto.publishedByDisplayName,
    lastVersionUpdatedAt: lastVersion?.updatedAt ?? null,
    lastVersionUpdatedByDisplayName: lastVersion?.updatedByDisplayName ?? null,
    versionCounts: {
      total: dto.versions.length,
      draft: dto.versions.filter((version) => version.status === 'DRAFT').length,
      published: dto.versions.filter((version) => version.status === 'PUBLISHED').length,
      archived: dto.versions.filter((version) => version.status === 'ARCHIVED').length,
    },
  }
}

async function getCommunicationTemplateFamilyOrThrow(
  code: CommunicationTemplateCode,
  channel: ContactChannel = 'EMAIL',
): Promise<CommunicationTemplateRow> {
  const template = await prisma.communicationTemplate.findUnique({
    where: {
      code_channel: {
        code,
        channel,
      },
    },
    select: COMMUNICATION_TEMPLATE_SELECT,
  })

  if (!template) {
    throw AppError.notFound('Szablon komunikatu nie zostal znaleziony.', 'COMMUNICATION_TEMPLATE_NOT_FOUND')
  }

  return template
}

async function getCommunicationTemplateVersionOrThrow(
  versionId: string,
): Promise<CommunicationTemplateVersionRow> {
  const version = await prisma.communicationTemplateVersion.findUnique({
    where: { id: versionId },
    select: COMMUNICATION_TEMPLATE_VERSION_SELECT,
  })

  if (!version) {
    throw AppError.notFound(
      'Wersja szablonu komunikatu nie zostala znaleziona.',
      'COMMUNICATION_TEMPLATE_VERSION_NOT_FOUND',
    )
  }

  return version
}

async function getCommunicationTemplateVersionWithTemplateOrThrow(versionId: string) {
  const version = await prisma.communicationTemplateVersion.findUnique({
    where: { id: versionId },
    select: {
      ...COMMUNICATION_TEMPLATE_VERSION_SELECT,
      template: {
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          channel: true,
        },
      },
    },
  })

  if (!version) {
    throw AppError.notFound(
      'Wersja szablonu komunikatu nie zostala znaleziona.',
      'COMMUNICATION_TEMPLATE_VERSION_NOT_FOUND',
    )
  }

  return version
}

async function getNextVersionNumber(
  templateId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<number> {
  const latest = await tx.communicationTemplateVersion.findFirst({
    where: { templateId },
    orderBy: [{ versionNumber: 'desc' }, { updatedAt: 'desc' }],
    select: { versionNumber: true },
  })

  return (latest?.versionNumber ?? 0) + 1
}

async function ensureTemplateFamilyMissing(params: {
  code: CommunicationTemplateCode
  channel: ContactChannel
}): Promise<void> {
  const existing = await prisma.communicationTemplate.findUnique({
    where: {
      code_channel: {
        code: params.code,
        channel: params.channel,
      },
    },
    select: {
      id: true,
    },
  })

  if (existing) {
    throw AppError.conflict(
      `Szablon dla kodu ${params.code} i kanalu ${params.channel} juz istnieje.`,
      'COMMUNICATION_TEMPLATE_ALREADY_EXISTS',
    )
  }
}

async function resolvePreviewRealCaseRequestOrThrow(
  body: CommunicationTemplatePreviewRealCaseRequestDto,
): Promise<PreviewRealCaseRequestRow> {
  const trimmedRequestId = body.portingRequestId?.trim()
  const trimmedCaseNumber = body.caseNumber?.trim()

  if (!trimmedRequestId && !trimmedCaseNumber) {
    throw AppError.badRequest(
      'Podaj identyfikator sprawy albo numer sprawy do preview na realnej sprawie.',
      'COMMUNICATION_TEMPLATE_PREVIEW_CASE_REQUIRED',
    )
  }

  const request = await prisma.portingRequest.findFirst({
    where: trimmedRequestId
      ? { id: trimmedRequestId }
      : { caseNumber: trimmedCaseNumber },
    select: PREVIEW_REAL_CASE_REQUEST_SELECT,
  })

  if (!request) {
    throw AppError.notFound(
      'Nie znaleziono wskazanej sprawy do preview szablonu.',
      'COMMUNICATION_TEMPLATE_PREVIEW_CASE_NOT_FOUND',
    )
  }

  return request
}

export async function listCommunicationTemplates(): Promise<CommunicationTemplateListResultDto> {
  const items = await prisma.communicationTemplate.findMany({
    select: COMMUNICATION_TEMPLATE_SELECT,
    orderBy: [{ code: 'asc' }, { updatedAt: 'desc' }],
  })

  return {
    items: items.map(mapCommunicationTemplateToSummaryDto),
  }
}

export async function getCommunicationTemplateByCode(
  code: CommunicationTemplateCode,
  channel: ContactChannel = 'EMAIL',
): Promise<CommunicationTemplateDto> {
  return mapCommunicationTemplateToDto(await getCommunicationTemplateFamilyOrThrow(code, channel))
}

export async function getCommunicationTemplateVersions(
  code: CommunicationTemplateCode,
  channel: ContactChannel = 'EMAIL',
): Promise<CommunicationTemplateVersionListResultDto> {
  const template = await getCommunicationTemplateFamilyOrThrow(code, channel)

  return {
    items: template.versions.map(mapCommunicationTemplateVersionToDto),
  }
}

export async function createCommunicationTemplate(
  body: CreateCommunicationTemplateDto,
  actorUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<CommunicationTemplateDto> {
  validateTemplateBodyOrThrow(body)
  await ensureTemplateFamilyMissing({
    code: body.code,
    channel: body.channel,
  })

  const template = await prisma.$transaction(async (tx) => {
    const createdTemplate = await tx.communicationTemplate.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        channel: body.channel,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      select: {
        id: true,
      },
    })

    await tx.communicationTemplateVersion.create({
      data: {
        templateId: createdTemplate.id,
        versionNumber: 1,
        status: 'DRAFT',
        subjectTemplate: body.subjectTemplate,
        bodyTemplate: body.bodyTemplate,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
    })

    return tx.communicationTemplate.findUniqueOrThrow({
      where: { id: createdTemplate.id },
      select: COMMUNICATION_TEMPLATE_SELECT,
    })
  })

  const result = mapCommunicationTemplateToDto(template)

  await logAuditEvent({
    action: 'CREATE',
    userId: actorUserId,
    entityType: 'communication_template',
    entityId: result.id,
    newValue: `${result.code}:DRAFT:v1`,
    ipAddress,
    userAgent,
  })

  return result
}

export async function createCommunicationTemplateVersion(
  code: CommunicationTemplateCode,
  body: CreateCommunicationTemplateVersionDto,
  actorUserId: string,
  ipAddress?: string,
  userAgent?: string,
  channel: ContactChannel = 'EMAIL',
): Promise<CommunicationTemplateVersionDto> {
  validateTemplateBodyOrThrow(body)
  const template = await getCommunicationTemplateFamilyOrThrow(code, channel)

  const version = await prisma.$transaction(async (tx) => {
    if (body.name !== undefined || body.description !== undefined) {
      await tx.communicationTemplate.update({
        where: { id: template.id },
        data: {
          name: body.name ?? template.name,
          description: body.description === undefined ? template.description : body.description,
          updatedByUserId: actorUserId,
        },
      })
    }

    return tx.communicationTemplateVersion.create({
      data: {
        templateId: template.id,
        versionNumber: await getNextVersionNumber(template.id, tx),
        status: 'DRAFT',
        subjectTemplate: body.subjectTemplate,
        bodyTemplate: body.bodyTemplate,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      select: COMMUNICATION_TEMPLATE_VERSION_SELECT,
    })
  })

  const result = mapCommunicationTemplateVersionToDto(version)

  await logAuditEvent({
    action: 'CREATE',
    userId: actorUserId,
    entityType: 'communication_template_version',
    entityId: result.id,
    newValue: `${code}:DRAFT:v${result.versionNumber}`,
    ipAddress,
    userAgent,
  })

  return result
}

export async function updateCommunicationTemplateVersion(
  versionId: string,
  body: UpdateCommunicationTemplateVersionDto,
  actorUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<CommunicationTemplateVersionDto> {
  const versionWithTemplate = await getCommunicationTemplateVersionWithTemplateOrThrow(versionId)

  if (versionWithTemplate.status !== 'DRAFT') {
    throw AppError.conflict(
      'Mozna edytowac tylko wersje robocze szablonow komunikatow.',
      'COMMUNICATION_TEMPLATE_VERSION_NOT_EDITABLE',
    )
  }

  const nextPayload = {
    subjectTemplate: body.subjectTemplate ?? versionWithTemplate.subjectTemplate,
    bodyTemplate: body.bodyTemplate ?? versionWithTemplate.bodyTemplate,
  }

  validateTemplateBodyOrThrow(nextPayload)

  const updated = await prisma.$transaction(async (tx) => {
    if (body.name !== undefined || body.description !== undefined) {
      await tx.communicationTemplate.update({
        where: { id: versionWithTemplate.template.id },
        data: {
          name: body.name ?? versionWithTemplate.template.name,
          description:
            body.description === undefined
              ? versionWithTemplate.template.description
              : body.description,
          updatedByUserId: actorUserId,
        },
      })
    }

    return tx.communicationTemplateVersion.update({
      where: { id: versionId },
      data: {
        subjectTemplate: nextPayload.subjectTemplate,
        bodyTemplate: nextPayload.bodyTemplate,
        updatedByUserId: actorUserId,
      },
      select: COMMUNICATION_TEMPLATE_VERSION_SELECT,
    })
  })

  const result = mapCommunicationTemplateVersionToDto(updated)

  await logAuditEvent({
    action: 'UPDATE',
    userId: actorUserId,
    entityType: 'communication_template_version',
    entityId: result.id,
    oldValue: `${versionWithTemplate.template.code}:${versionWithTemplate.status}:v${versionWithTemplate.versionNumber}`,
    newValue: `${versionWithTemplate.template.code}:${result.status}:v${result.versionNumber}`,
    ipAddress,
    userAgent,
  })

  return result
}

export async function publishCommunicationTemplateVersion(
  versionId: string,
  actorUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<CommunicationTemplateVersionDto> {
  const versionWithTemplate = await getCommunicationTemplateVersionWithTemplateOrThrow(versionId)

  if (versionWithTemplate.status !== 'DRAFT') {
    throw AppError.conflict(
      'Publikowac mozna tylko wersje robocze.',
      'COMMUNICATION_TEMPLATE_VERSION_NOT_DRAFT',
    )
  }

  ensureVersionReadyForPublishOrThrow({
    subjectTemplate: versionWithTemplate.subjectTemplate,
    bodyTemplate: versionWithTemplate.bodyTemplate,
  })

  const published = await prisma.$transaction(async (tx) => {
    await tx.communicationTemplateVersion.updateMany({
      where: {
        templateId: versionWithTemplate.template.id,
        status: 'PUBLISHED',
        id: { not: versionId },
      },
      data: {
        status: 'ARCHIVED',
        updatedByUserId: actorUserId,
      },
    })

    return tx.communicationTemplateVersion.update({
      where: { id: versionId },
      data: {
        status: 'PUBLISHED',
        updatedByUserId: actorUserId,
        publishedAt: new Date(),
        publishedByUserId: actorUserId,
      },
      select: COMMUNICATION_TEMPLATE_VERSION_SELECT,
    })
  })

  const result = mapCommunicationTemplateVersionToDto(published)

  await logAuditEvent({
    action: 'UPDATE',
    userId: actorUserId,
    entityType: 'communication_template_version',
    entityId: result.id,
    oldValue: `${versionWithTemplate.template.code}:DRAFT:v${versionWithTemplate.versionNumber}`,
    newValue: `${versionWithTemplate.template.code}:PUBLISHED:v${result.versionNumber}`,
    ipAddress,
    userAgent,
  })

  return result
}

export async function archiveCommunicationTemplateVersion(
  versionId: string,
  actorUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<CommunicationTemplateVersionDto> {
  const versionWithTemplate = await getCommunicationTemplateVersionWithTemplateOrThrow(versionId)

  if (versionWithTemplate.status === 'PUBLISHED') {
    throw AppError.conflict(
      'Nie mozna archiwizowac opublikowanej wersji bez publikacji innej wersji.',
      'COMMUNICATION_TEMPLATE_VERSION_PUBLISHED_ARCHIVE_BLOCKED',
    )
  }

  if (versionWithTemplate.status === 'ARCHIVED') {
    return mapCommunicationTemplateVersionToDto(versionWithTemplate)
  }

  const archived = await prisma.communicationTemplateVersion.update({
    where: { id: versionId },
    data: {
      status: 'ARCHIVED',
      updatedByUserId: actorUserId,
    },
    select: COMMUNICATION_TEMPLATE_VERSION_SELECT,
  })

  const result = mapCommunicationTemplateVersionToDto(archived)

  await logAuditEvent({
    action: 'UPDATE',
    userId: actorUserId,
    entityType: 'communication_template_version',
    entityId: result.id,
    oldValue: `${versionWithTemplate.template.code}:${versionWithTemplate.status}:v${versionWithTemplate.versionNumber}`,
    newValue: `${versionWithTemplate.template.code}:ARCHIVED:v${result.versionNumber}`,
    ipAddress,
    userAgent,
  })

  return result
}

export async function cloneCommunicationTemplateVersion(
  versionId: string,
  actorUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<CommunicationTemplateVersionDto> {
  const versionWithTemplate = await getCommunicationTemplateVersionWithTemplateOrThrow(versionId)

  const cloned = await prisma.communicationTemplateVersion.create({
    data: {
      templateId: versionWithTemplate.template.id,
      versionNumber: await getNextVersionNumber(versionWithTemplate.template.id),
      status: 'DRAFT',
      subjectTemplate: versionWithTemplate.subjectTemplate,
      bodyTemplate: versionWithTemplate.bodyTemplate,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
    select: COMMUNICATION_TEMPLATE_VERSION_SELECT,
  })

  const result = mapCommunicationTemplateVersionToDto(cloned)

  await logAuditEvent({
    action: 'CREATE',
    userId: actorUserId,
    entityType: 'communication_template_version',
    entityId: result.id,
    newValue: `${versionWithTemplate.template.code}:DRAFT:v${result.versionNumber}:cloned-from:${versionWithTemplate.id}`,
    ipAddress,
    userAgent,
  })

  return result
}

export async function previewCommunicationTemplateVersionForRealCase(
  versionId: string,
  body: CommunicationTemplatePreviewRealCaseRequestDto,
): Promise<CommunicationTemplatePreviewRealCaseDto> {
  const version = await getCommunicationTemplateVersionOrThrow(versionId)
  const request = await resolvePreviewRealCaseRequestOrThrow(body)
  const context = buildRealCaseTemplateContext(request, body.issueDescription ?? null)
  const renderResult = renderCommunicationTemplate(
    {
      subjectTemplate: version.subjectTemplate,
      bodyTemplate: version.bodyTemplate,
    },
    context,
  )

  const warnings: string[] = []

  if (renderResult.missingPlaceholders.length > 0) {
    warnings.push(
      `Brakuje danych sprawy dla placeholderow: ${renderResult.missingPlaceholders.join(', ')}.`,
    )
  }

  if (renderResult.unknownPlaceholders.length > 0) {
    warnings.push(
      `Szablon zawiera nieznane placeholdery: ${renderResult.unknownPlaceholders.join(', ')}.`,
    )
  }

  return {
    ...renderResult,
    previewContextSummary: {
      portingRequestId: request.id,
      caseNumber: request.caseNumber,
      clientName: context.clientName,
      donorOperatorName: context.donorOperatorName,
      recipientOperatorName: context.recipientOperatorName,
      plannedPortDate: context.plannedPortDate,
      statusInternal: request.statusInternal,
    },
    warnings,
  }
}

export async function getPublishedCommunicationTemplateVersionOrThrow(
  code: CommunicationTemplateCode,
  channel: ContactChannel,
): Promise<PublishedCommunicationTemplateVersionResult> {
  const template = await prisma.communicationTemplate.findUnique({
    where: {
      code_channel: {
        code,
        channel,
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      channel: true,
      versions: {
        where: {
          status: 'PUBLISHED',
        },
        orderBy: [{ publishedAt: 'desc' }, { versionNumber: 'desc' }],
        select: {
          id: true,
          versionNumber: true,
          subjectTemplate: true,
          bodyTemplate: true,
        },
      },
    },
  })

  const publishedVersion = template?.versions[0]

  if (!template || !publishedVersion) {
    throw AppError.conflict(
      `Brak opublikowanej wersji szablonu dla komunikacji ${code} (${channel}).`,
      'COMMUNICATION_TEMPLATE_PUBLISHED_NOT_FOUND',
    )
  }

  return {
    templateId: template.id,
    code: template.code,
    channel: template.channel,
    name: template.name,
    description: template.description,
    versionId: publishedVersion.id,
    versionNumber: publishedVersion.versionNumber,
    subjectTemplate: publishedVersion.subjectTemplate,
    bodyTemplate: publishedVersion.bodyTemplate,
  }
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
