import type {
  CommunicationTemplatePlaceholder,
  PortingCommunicationTemplateContextDto,
  RenderCommunicationTemplateResultDto,
} from '@np-manager/shared'
import { COMMUNICATION_TEMPLATE_PLACEHOLDERS } from '@np-manager/shared'

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g

const KNOWN_PLACEHOLDERS = new Set<string>(Object.values(COMMUNICATION_TEMPLATE_PLACEHOLDERS))

function extractPlaceholders(value: string): string[] {
  return Array.from(value.matchAll(PLACEHOLDER_PATTERN), (match) => match[1] ?? '').filter(Boolean)
}

function getUniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right))
}

function getContextValue(
  context: PortingCommunicationTemplateContextDto,
  placeholder: CommunicationTemplatePlaceholder,
): string | null {
  const value = context[placeholder]

  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function renderCommunicationTemplate(
  template: Pick<{ subjectTemplate: string; bodyTemplate: string }, 'subjectTemplate' | 'bodyTemplate'>,
  context: PortingCommunicationTemplateContextDto,
): RenderCommunicationTemplateResultDto {
  const placeholders = getUniqueSorted([
    ...extractPlaceholders(template.subjectTemplate),
    ...extractPlaceholders(template.bodyTemplate),
  ])

  const missingPlaceholders = placeholders.filter((placeholder) => {
    if (!KNOWN_PLACEHOLDERS.has(placeholder)) {
      return false
    }

    return getContextValue(context, placeholder as CommunicationTemplatePlaceholder) === null
  }) as CommunicationTemplatePlaceholder[]

  const unknownPlaceholders = placeholders.filter((placeholder) => !KNOWN_PLACEHOLDERS.has(placeholder))

  const renderedSubject = template.subjectTemplate.replace(
    PLACEHOLDER_PATTERN,
    (_match, rawPlaceholder: string) => {
      if (!KNOWN_PLACEHOLDERS.has(rawPlaceholder)) {
        return `{{${rawPlaceholder}}}`
      }

      return getContextValue(context, rawPlaceholder as CommunicationTemplatePlaceholder) ?? ''
    },
  )

  const renderedBody = template.bodyTemplate.replace(
    PLACEHOLDER_PATTERN,
    (_match, rawPlaceholder: string) => {
      if (!KNOWN_PLACEHOLDERS.has(rawPlaceholder)) {
        return `{{${rawPlaceholder}}}`
      }

      return getContextValue(context, rawPlaceholder as CommunicationTemplatePlaceholder) ?? ''
    },
  )

  return {
    renderedSubject,
    renderedBody,
    missingPlaceholders,
    unknownPlaceholders,
    isRenderable: missingPlaceholders.length === 0 && unknownPlaceholders.length === 0,
  }
}
