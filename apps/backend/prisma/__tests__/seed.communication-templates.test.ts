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

  it('seeds active EMAIL templates with subject and body content', () => {
    COMMUNICATION_TEMPLATE_SEED_DATA.forEach((template) => {
      expect(template.channel).toBe('EMAIL')
      expect(template.isActive).toBe(true)
      expect(template.subjectTemplate.length).toBeGreaterThan(0)
      expect(template.bodyTemplate.length).toBeGreaterThan(0)
    })
  })
})
