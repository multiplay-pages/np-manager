import { describe, expect, it } from 'vitest'
import { COMMUNICATION_TEMPLATE_SEED_DATA } from '../seed'

describe('communication template seed data', () => {
  it('contains the four admin communication templates expected by runtime', () => {
    expect(COMMUNICATION_TEMPLATE_SEED_DATA).toHaveLength(4)
    expect(COMMUNICATION_TEMPLATE_SEED_DATA.map((template) => template.code)).toEqual([
      'REQUEST_RECEIVED',
      'PORT_DATE_RECEIVED',
      'PORTING_DAY',
      'ISSUE_NOTICE',
    ])
  })

  it('seeds published EMAIL template versions with subject and body content', () => {
    COMMUNICATION_TEMPLATE_SEED_DATA.forEach((template) => {
      expect(template.templateId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
      expect(template.versionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
      expect(template.channel).toBe('EMAIL')
      expect(template.status).toBe('PUBLISHED')
      expect(template.versionNumber).toBe(1)
      expect(template.subjectTemplate.length).toBeGreaterThan(0)
      expect(template.bodyTemplate.length).toBeGreaterThan(0)
    })
  })

  it('uses unique family and version identifiers for versioned template runtime fixtures', () => {
    expect(new Set(COMMUNICATION_TEMPLATE_SEED_DATA.map((template) => template.templateId)).size).toBe(
      COMMUNICATION_TEMPLATE_SEED_DATA.length,
    )
    expect(new Set(COMMUNICATION_TEMPLATE_SEED_DATA.map((template) => template.versionId)).size).toBe(
      COMMUNICATION_TEMPLATE_SEED_DATA.length,
    )
  })
})
