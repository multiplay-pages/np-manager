import { describe, expect, it } from 'vitest'
import { renderCommunicationTemplate } from '../communication-template-renderer'

const FULL_CONTEXT = {
  clientName: 'Jan Kowalski',
  caseNumber: 'FNP-TEST-001',
  portedNumber: '221234567',
  donorOperatorName: 'Orange Polska',
  recipientOperatorName: 'G-NET',
  plannedPortDate: '2026-04-20',
  issueDescription: 'Brakuje pelnomocnictwa.',
  contactEmail: 'kontakt@np-manager.local',
  contactPhone: '600700800',
} as const

describe('communication-template-renderer', () => {
  it('renders known placeholders in subject and body', () => {
    const result = renderCommunicationTemplate(
      {
        subjectTemplate: 'Sprawa {{caseNumber}} dla {{clientName}}',
        bodyTemplate:
          'Numer: {{portedNumber}}, dawca: {{donorOperatorName}}, kontakt: {{contactEmail}}',
      },
      FULL_CONTEXT,
    )

    expect(result.isRenderable).toBe(true)
    expect(result.renderedSubject).toBe('Sprawa FNP-TEST-001 dla Jan Kowalski')
    expect(result.renderedBody).toContain('221234567')
    expect(result.missingPlaceholders).toEqual([])
    expect(result.unknownPlaceholders).toEqual([])
  })

  it('reports missing placeholders when context data is unavailable', () => {
    const result = renderCommunicationTemplate(
      {
        subjectTemplate: 'Termin {{plannedPortDate}}',
        bodyTemplate: 'Telefon kontaktowy: {{contactPhone}}, problem: {{issueDescription}}',
      },
      {
        ...FULL_CONTEXT,
        plannedPortDate: null,
        contactPhone: null,
      },
    )

    expect(result.isRenderable).toBe(false)
    expect(result.missingPlaceholders).toEqual(['contactPhone', 'plannedPortDate'])
    expect(result.unknownPlaceholders).toEqual([])
  })

  it('reports unknown placeholders without pretending the template is renderable', () => {
    const result = renderCommunicationTemplate(
      {
        subjectTemplate: 'Sprawa {{caseNumber}}',
        bodyTemplate: 'Nieznany token: {{unsupportedField}}',
      },
      FULL_CONTEXT,
    )

    expect(result.isRenderable).toBe(false)
    expect(result.unknownPlaceholders).toEqual(['unsupportedField'])
    expect(result.renderedBody).toContain('{{unsupportedField}}')
  })
})
