import {
  COMMUNICATION_TEMPLATE_CODE_LABELS,
  COMMUNICATION_TEMPLATE_PLACEHOLDER_LABELS,
  type CommunicationTemplateCode,
  type CommunicationTemplateDto,
  type CommunicationTemplateListItemDto,
  type CommunicationTemplatePlaceholder,
  type CommunicationTemplatePreviewContextSummaryDto,
  type CommunicationTemplatePreviewRealCaseDto,
  type CommunicationTemplateVersionDto,
  type CommunicationTemplateVersionStatus,
  type ContactChannel,
} from '@np-manager/shared'

export type CommunicationTemplateUiStatus = CommunicationTemplateVersionStatus
export type CommunicationTemplateListFilterStatus = 'ALL' | CommunicationTemplateUiStatus

export interface CommunicationTemplateVersionView extends CommunicationTemplateVersionDto {
  code: CommunicationTemplateCode
  channel: ContactChannel
  name: string
  description: string | null
  excerpt: string
  uiStatus: CommunicationTemplateUiStatus
}

export interface CommunicationTemplateGroupView {
  key: string
  id: string
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

export interface CommunicationTemplateListItemView extends CommunicationTemplateListItemDto {
  key: string
  primaryStatus: CommunicationTemplateUiStatus
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
  warnings: string[]
  previewContextSummary: CommunicationTemplatePreviewContextSummaryDto | null
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

function getExcerpt(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 120) {
    return normalized
  }

  return `${normalized.slice(0, 117)}...`
}

function mapVersionToView(
  version: CommunicationTemplateVersionDto,
  template: Pick<CommunicationTemplateDto, 'code' | 'channel' | 'name' | 'description'>,
): CommunicationTemplateVersionView {
  return {
    ...version,
    code: template.code,
    channel: template.channel,
    name: template.name,
    description: template.description,
    excerpt: getExcerpt(version.bodyTemplate),
    uiStatus: version.status,
  }
}

export function buildCommunicationTemplateDetailView(
  template: CommunicationTemplateDto | null,
): CommunicationTemplateGroupView | null {
  if (!template) {
    return null
  }

  const versions = template.versions
    .slice()
    .sort((left, right) => {
      return (
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime() ||
        right.versionNumber - left.versionNumber
      )
    })
    .map((version) => mapVersionToView(version, template))

  const publishedVersion = versions.find((version) => version.status === 'PUBLISHED') ?? null
  const draftVersions = versions.filter((version) => version.status === 'DRAFT')
  const archivedVersions = versions.filter((version) => version.status === 'ARCHIVED')
  const primaryStatus: CommunicationTemplateUiStatus =
    draftVersions.length > 0
      ? 'DRAFT'
      : publishedVersion
        ? 'PUBLISHED'
        : 'ARCHIVED'
  const lastVersion = versions[0] ?? null

  return {
    key: `${template.code}::${template.channel}`,
    id: template.id,
    code: template.code,
    channel: template.channel,
    name: template.name || COMMUNICATION_TEMPLATE_CODE_LABELS[template.code],
    description: template.description,
    publishedVersion,
    draftVersions,
    archivedVersions,
    versions,
    activeVersionNumber: publishedVersion?.versionNumber ?? null,
    primaryStatus,
    lastUpdatedAt: lastVersion?.updatedAt ?? template.updatedAt,
    lastUpdatedByDisplayName: lastVersion?.updatedByDisplayName ?? template.updatedByDisplayName,
    statusSummary:
      publishedVersion && draftVersions.length > 0
        ? `Opublikowana v${publishedVersion.versionNumber} i ${draftVersions.length} robocza`
        : publishedVersion
          ? `Opublikowana v${publishedVersion.versionNumber}`
          : draftVersions.length > 0
            ? `${draftVersions.length} wersja robocza`
            : 'Brak opublikowanej wersji',
  }
}

export function buildCommunicationTemplateListView(
  items: CommunicationTemplateListItemDto[],
): CommunicationTemplateListItemView[] {
  return items
    .map((item) => {
      const primaryStatus: CommunicationTemplateUiStatus =
        item.versionCounts.draft > 0
          ? 'DRAFT'
          : item.versionCounts.published > 0
            ? 'PUBLISHED'
            : 'ARCHIVED'

      return {
        ...item,
        key: `${item.code}::${item.channel}`,
        primaryStatus,
        statusSummary:
          item.versionCounts.published > 0 && item.versionCounts.draft > 0
            ? `Opublikowana v${item.publishedVersionNumber} i ${item.versionCounts.draft} robocza`
            : item.versionCounts.published > 0
              ? `Opublikowana v${item.publishedVersionNumber}`
              : item.versionCounts.draft > 0
                ? `${item.versionCounts.draft} wersja robocza`
                : 'Brak opublikowanej wersji',
      }
    })
    .sort((left, right) => {
      return (
        new Date(right.lastVersionUpdatedAt ?? right.updatedAt).getTime() -
        new Date(left.lastVersionUpdatedAt ?? left.updatedAt).getTime()
      )
    })
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

export function getTemplateGroupName(group: Pick<CommunicationTemplateGroupView, 'code' | 'name'>) {
  return group.name || COMMUNICATION_TEMPLATE_CODE_LABELS[group.code]
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
    warnings: [],
    previewContextSummary: null,
  }
}

export function mapRealCasePreviewToPreviewResult(
  preview: CommunicationTemplatePreviewRealCaseDto,
): CommunicationTemplatePreviewResult {
  const knownPlaceholders = preview.usedPlaceholders.filter((item): item is CommunicationTemplatePlaceholder =>
    KNOWN_PLACEHOLDER_SET.has(item),
  )

  return {
    renderedSubject: preview.renderedSubject,
    renderedBody: preview.renderedBody,
    usedPlaceholders: preview.usedPlaceholders,
    knownPlaceholders,
    unknownPlaceholders: preview.unknownPlaceholders,
    missingPlaceholders: preview.missingPlaceholders,
    isRenderable: preview.isRenderable,
    warnings: preview.warnings,
    previewContextSummary: preview.previewContextSummary,
  }
}
