import { describe, expect, it } from 'vitest'
import {
  COMMUNICATION_TEMPLATE_SEED_DATA,
  QA_FAILED_COMMUNICATION_SEED_FIXTURE,
} from '../seed'

describe('QA communication seed fixtures', () => {
  it('contains a retry-ready failed communication case for QA', () => {
    expect(QA_FAILED_COMMUNICATION_SEED_FIXTURE.caseNumber).toBe('FNP-SEED-COMM-FAILED-001')
    expect(QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.status).toBe('FAILED')
    expect(QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.errorMessage).toContain(
      'serwer odbiorcy odrzucil wiadomosc',
    )
    expect(QA_FAILED_COMMUNICATION_SEED_FIXTURE.deliveryAttempt.outcome).toBe('FAILED')
    expect(QA_FAILED_COMMUNICATION_SEED_FIXTURE.deliveryAttempt.errorCode).toBe(
      'SMTP_550_RECIPIENT_REJECTED',
    )
    expect(QA_FAILED_COMMUNICATION_SEED_FIXTURE.deliveryAttempt.errorMessage).toContain(
      '550 5.1.1',
    )
  })

  it('binds the failed QA communication to a published runtime template version', () => {
    const runtimeTemplate = COMMUNICATION_TEMPLATE_SEED_DATA.find(
      (template) => template.code === QA_FAILED_COMMUNICATION_SEED_FIXTURE.communication.templateCode,
    )

    expect(runtimeTemplate).toBeDefined()
    expect(runtimeTemplate?.status).toBe('PUBLISHED')
    expect(runtimeTemplate?.channel).toBe('EMAIL')
  })
})
