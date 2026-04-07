import {
  COMMUNICATION_TEMPLATE_CODE_LABELS,
  COMMUNICATION_TEMPLATE_PLACEHOLDER_LABELS,
  type CommunicationTemplateCode,
  type CommunicationTemplateDto,
  type CommunicationTemplatePlaceholder,
  type ContactChannel,
} from '@np-manager/shared'

export type CommunicationTemplateUiStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'
export type CommunicationTemplateListFilterStatus = 'ALL' | CommunicationTemplateUiStatus

export interface CommunicationTemplateVersionView extends CommunicationTemplateDto {
  uiStatus: CommunicationTemplateUiStatus
  excerpt: string
}

export interface CommunicationTemplateGroupView {
  key: string
  code: CommunicationTemplateCode
  channel: ContactChannel
  name: string
  description: string | null
  publishedVersion: CommunicationTemplateVersionView | null
  draftVersions: CommunicationTemplateVersionView[]
  archivedVersions: CommunicationTemplateVersionView[]
  versions: CommunicationTemplateVersionView[]
  activeVersionNumber: number | null
  primaryStatus: CommunicationTemplateUiStatus
  lastUpdatedAt: string
  lastUpdatedByDisplayName: string | null
  statusSummary: string
}

export interface CommunicationTemplatePreviewResult {
  renderedSubject: string
  renderedBody: string
  usedPlaceholders: string[]
  knownPlaceholders: CommunicationTemplatePlaceholder[]
  unknownPlaceholders: string[]
  missingPlaceholders: CommunicationTemplatePlaceholder[]
  isRenderable: boolean
}

export const COMMUNICATION_TEMPLATE_TEST_CONTEXT: Record<CommunicationTemplatePlaceholder, string> = {
  clientName: 'Jan Kowalski',
  caseNumber: 'FNP-ADMIN-001',
  portedNumber: '221234567',
  donorOperatorName: 'Orange Polska',
  recipientOperatorName: 'G-NET',
  plannedPortDate: '20.04.2026',
  issueDescription: 'Brakuje podpisanego pelnomocnictwa.',
  contactEmail: 'kontakt@np-manager.local',
  contactPhone: '600700800',
}

const PLACEHOLDER_REGEX = /{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}/g
const KNOWN_PLACEHOLDERS = Object.keys(COMMUNICATION_TEMPLATE_PLACEHOLDER_LABELS) as CommunicationTemplatePlaceholder[]
const KNOWN_PLACEHOLDER_SET = new Set<string>(KNOWN_PLACEHOLDERS)

function toTimestamp(value: string): number {
  return new Date(value).getTime()
}

function byNewest(left: CommunicationTemplateDto, right: CommunicationTemplateDto): number {
  return toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt) || right.version - left.version
}

function getExcerpt(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 120) {
    return normalized
  }

  return `${normalized.slice(0, 117)}...`
}

function getGroupKey(code: CommunicationTemplateCode, channel: ContactChannel): string {
  return `${code}::${channel}`
}

export function getCommunicationTemplateStatusLabel(status: CommunicationTemplateUiStatus): string {
  switch (status) {
    case 'PUBLISHED':
      return 'Opublikowana'
    case 'DRAFT':
      return 'Robocza'
    case 'ARCHIVED':
      return 'Archiwalna'
  }
}

export function getCommunicationTemplateStatusClasses(status: CommunicationTemplateUiStatus): string {
  switch (status) {
    case 'PUBLISHED':
      return 'border-green-200 bg-green-50 text-green-700'
    case 'DRAFT':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    case 'ARCHIVED':
      return 'border-gray-200 bg-gray-100 text-gray-600'
  }
}

export function getCommunicationTemplatePlaceholderItems() {
  return KNOWN_PLACEHOLDERS.map((placeholder) => ({
    placeholder,
    label: COMMUNICATION_TEMPLATE_PLACEHOLDER_LABELS[placeholder],
  }))
}

export function getTemplateGroupName(group: CommunicationTemplateGroupView): string {
  return group.name || COMMUNICATION_TEMPLATE_CODE_LABELS[group.code]
}

export function buildCommunicationTemplateGroups(
  templates: CommunicationTemplateDto[],
): CommunicationTemplateGroupView[] {
  const grouped = new Map<string, CommunicationTemplateDto[]>()

  templates.forEach((template) => {
    const key = getGroupKey(template.code, template.channel)
    const current = grouped.get(key) ?? []
    current.push(template)
    grouped.set(key, current)
  })

  return [...grouped.entries()]
    .map(([key, versions]) => {
      const sorted = [...versions].sort(byNewest)
      const publishedVersionBase = sorted.find((template) => template.isActive) ?? null
      const inactiveVersions = sorted.filter((template) => !template.isActive)
      const publishedCreatedAt = publishedVersionBase ? toTimestamp(publishedVersionBase.createdAt) : null

      const draftBases =
        publishedCreatedAt === null
          ? inactiveVersions.slice(0, 1)
          : inactiveVersions.filter((template) => toTimestamp(template.createdAt) > publishedCreatedAt)

      const draftIds = new Set(draftBases.map((template) => template.id))
      const archivedBases = inactiveVersions.filter((template) => !draftIds.has(template.id))

      const publishedVersion = publishedVersionBase
        ? {
            ...publishedVersionBase,
            uiStatus: 'PUBLISHED' as const,
            excerpt: getExcerpt(publishedVersionBase.bodyTemplate),
          }
        : null

      const draftVersions = draftBases.map((template) => ({
        ...template,
        uiStatus: 'DRAFT' as const,
        excerpt: getExcerpt(template.bodyTemplate),
      }))

      const archivedVersions = archivedBases.map((template) => ({
        ...template,
        uiStatus: 'ARCHIVED' as const,
        excerpt: getExcerpt(template.bodyTemplate),
      }))

      const versionsView = [publishedVersion, ...draftVersions, ...archivedVersions].filter(
        Boolean,
      ) as CommunicationTemplateVersionView[]

      const primaryStatus: CommunicationTemplateUiStatus =
        draftVersions.length > 0
          ? 'DRAFT'
          : publishedVersion
            ? 'PUBLISHED'
            : 'ARCHIVED'

      const representative =
        publishedVersion ?? draftVersions[0] ?? archivedVersions[0] ?? null

      const statusSummary =
        publishedVersion && draftVersions.length > 0
          ? `Opublikowana v${publishedVersion.version} i ${draftVersions.length} robocza`
          : publishedVersion
            ? `Opublikowana v${publishedVersion.version}`
            : draftVersions.length > 0
              ? `${draftVersions.length} wersja robocza`
              : 'Brak opublikowanej wersji'

      return {
        key,
        code: representative?.code ?? versions[0]!.code,
        channel: representative?.channel ?? versions[0]!.channel,
        name: representative?.name ?? COMMUNICATION_TEMPLATE_CODE_LABELS[versions[0]!.code],
        description: representative?.description ?? null,
        publishedVersion,
        draftVersions,
        archivedVersions,
        versions: versionsView.sort(byNewest),
        activeVersionNumber: publishedVersion?.version ?? null,
        primaryStatus,
        lastUpdatedAt: representative?.updatedAt ?? versions[0]!.updatedAt,
        lastUpdatedByDisplayName: representative?.updatedByDisplayName ?? null,
        statusSummary,
      }
    })
    .sort((left, right) => toTimestamp(right.lastUpdatedAt) - toTimestamp(left.lastUpdatedAt))
}

export function findTemplateGroupByCode(
  groups: CommunicationTemplateGroupView[],
  code: string | undefined,
  channel: ContactChannel = 'EMAIL',
): CommunicationTemplateGroupView | null {
  if (!code) return null

  return groups.find((group) => group.code === code && group.channel === channel) ?? null
}

export function renderCommunicationTemplatePreview(params: {
  subjectTemplate: string
  bodyTemplate: string
  context?: Partial<Record<CommunicationTemplatePlaceholder, string | null>>
}): CommunicationTemplatePreviewResult {
  const context = {
    ...COMMUNICATION_TEMPLATE_TEST_CONTEXT,
    ...params.context,
  }
  const usedPlaceholders = new Set<string>()
  const combined = `${params.subjectTemplate}\n${params.bodyTemplate}`
  let match: RegExpExecArray | null

  while ((match = PLACEHOLDER_REGEX.exec(combined)) !== null) {
    usedPlaceholders.add(match[1] ?? '')
  }

  PLACEHOLDER_REGEX.lastIndex = 0

  const used = [...usedPlaceholders].sort((left, right) => left.localeCompare(right))
  const knownPlaceholders = used.filter((item): item is CommunicationTemplatePlaceholder =>
    KNOWN_PLACEHOLDER_SET.has(item),
  )
  const unknownPlaceholders = used.filter((item) => !KNOWN_PLACEHOLDER_SET.has(item))
  const missingPlaceholders = knownPlaceholders.filter((placeholder) => {
    const value = context[placeholder]
    return typeof value !== 'string' || value.trim().length === 0
  })

  const replaceKnownPlaceholders = (template: string) =>
    template.replace(PLACEHOLDER_REGEX, (_match, rawPlaceholder: string) => {
      if (!KNOWN_PLACEHOLDER_SET.has(rawPlaceholder)) {
        return `{{${rawPlaceholder}}}`
      }

      return context[rawPlaceholder as CommunicationTemplatePlaceholder]?.trim() ?? ''
    })

  return {
    renderedSubject: replaceKnownPlaceholders(params.subjectTemplate),
    renderedBody: replaceKnownPlaceholders(params.bodyTemplate),
    usedPlaceholders: used,
    knownPlaceholders,
    unknownPlaceholders,
    missingPlaceholders,
    isRenderable: unknownPlaceholders.length === 0 && missingPlaceholders.length === 0,
  }
}
