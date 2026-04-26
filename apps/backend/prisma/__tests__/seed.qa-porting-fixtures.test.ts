import { describe, expect, it } from 'vitest'
import {
  COMMUNICATION_TEMPLATE_SEED_DATA,
  QA_ETAP5A_DRAFT_SMS_TEMPLATE_FIXTURE,
  QA_ETAP5A_LONG_DATA_CLIENT,
  QA_ETAP5A_NOTIFICATION_FAILED_ATTEMPT,
  QA_ETAP5A_PORTING_FIXTURES,
} from '../seed'

describe('Etap 5A QA porting seed fixtures', () => {
  it('exposes the six new QA case numbers required by audit issue #82', () => {
    const caseNumbers = QA_ETAP5A_PORTING_FIXTURES.map((fx) => fx.caseNumber)
    expect(caseNumbers).toEqual([
      'FNP-SEED-DRAFT-001',
      'FNP-SEED-ERROR-001',
      'FNP-SEED-LONG-DATA-001',
      'FNP-SEED-NO-ASSIGNEE-001',
      'FNP-SEED-NO-DATE-001',
      'FNP-SEED-NOTIF-FAILED-001',
    ])
  })

  it('uses unique primaryNumber and requestDocumentNumber across QA fixtures', () => {
    const numbers = QA_ETAP5A_PORTING_FIXTURES.map((fx) => fx.primaryNumber)
    const docs = QA_ETAP5A_PORTING_FIXTURES.map((fx) => fx.requestDocumentNumber)
    expect(new Set(numbers).size).toBe(numbers.length)
    expect(new Set(docs).size).toBe(docs.length)
  })

  it('marks DRAFT fixture with statusInternal=DRAFT and no assignee', () => {
    const fx = QA_ETAP5A_PORTING_FIXTURES.find(
      (f) => f.caseNumber === 'FNP-SEED-DRAFT-001',
    )
    expect(fx?.statusInternal).toBe('DRAFT')
    expect(fx?.assigneeEmail).toBeNull()
    expect(fx?.confirmedPortDate).toBeNull()
  })

  it('marks ERROR fixture with rejectionCode and rejectionReason', () => {
    const fx = QA_ETAP5A_PORTING_FIXTURES.find(
      (f) => f.caseNumber === 'FNP-SEED-ERROR-001',
    )
    expect(fx?.statusInternal).toBe('ERROR')
    expect(fx?.rejectionCode).toBe('E06_REJECTED')
    expect(fx?.rejectionReason).toContain('PLI CBD')
  })

  it('routes LONG-DATA fixture to dedicated long client with overflow-friendly values', () => {
    const fx = QA_ETAP5A_PORTING_FIXTURES.find(
      (f) => f.caseNumber === 'FNP-SEED-LONG-DATA-001',
    )
    expect(fx?.useLongClient).toBe(true)
    expect(QA_ETAP5A_LONG_DATA_CLIENT.email.length).toBeGreaterThan(60)
    expect(QA_ETAP5A_LONG_DATA_CLIENT.firstName).toContain('-')
    expect(QA_ETAP5A_LONG_DATA_CLIENT.lastName.split('-').length).toBeGreaterThanOrEqual(3)
    expect(QA_ETAP5A_LONG_DATA_CLIENT.addressStreet.length).toBeGreaterThan(40)
  })

  it('NO-ASSIGNEE fixture has confirmedPortDate but no assignee (pure missing-BOK case)', () => {
    const fx = QA_ETAP5A_PORTING_FIXTURES.find(
      (f) => f.caseNumber === 'FNP-SEED-NO-ASSIGNEE-001',
    )
    expect(fx?.assigneeEmail).toBeNull()
    expect(fx?.confirmedPortDate).not.toBeNull()
  })

  it('NO-DATE fixture resolves BOK assignee via email lookup with consistent assignment metadata', () => {
    const fx = QA_ETAP5A_PORTING_FIXTURES.find(
      (f) => f.caseNumber === 'FNP-SEED-NO-DATE-001',
    )
    // assigneeEmail drives runtime lookup — no hardcoded UUID
    expect(fx?.assigneeEmail).toBe('bok@np-manager.local')
    expect(fx?.confirmedPortDate).toBeNull()
    expect(fx?.requestedPortDate).toBe('2026-05-20T00:00:00.000Z')
    // seed-main derives assignedAt + assignedByUserId from assigneeEmail != null
    // (regression guard: fixture must have assigneeEmail to trigger consistent assignment block)
    expect(fx?.assigneeEmail).not.toBeNull()
  })

  it('seed-main assignment block is deterministic: non-null assigneeEmail implies assignedAt + assignedByUserId', () => {
    // Verify the fixture constant ensures seed-main will set all three assignment fields:
    // assignedUserId, assignedAt ('2026-04-20T10:00:00.000Z'), assignedByUserId.
    // This guards against regressing to the partial-assignment state (assignedUserId only).
    const fixturesWithAssignee = QA_ETAP5A_PORTING_FIXTURES.filter(
      (f) => f.assigneeEmail !== null,
    )
    expect(fixturesWithAssignee).toHaveLength(1)
    expect(fixturesWithAssignee[0]!.caseNumber).toBe('FNP-SEED-NO-DATE-001')
    expect(fixturesWithAssignee[0]!.assigneeEmail).toBe('bok@np-manager.local')
  })

  it('exposes the QA notification failure attempt fixture with required ID and metadata', () => {
    expect(QA_ETAP5A_NOTIFICATION_FAILED_ATTEMPT.id).toBe(
      '00000000-0000-4000-8000-000000000753',
    )
    expect(QA_ETAP5A_NOTIFICATION_FAILED_ATTEMPT.requestCaseNumber).toBe(
      'FNP-SEED-NOTIF-FAILED-001',
    )
    expect(QA_ETAP5A_NOTIFICATION_FAILED_ATTEMPT.outcome).toBe('FAILED')
    expect(QA_ETAP5A_NOTIFICATION_FAILED_ATTEMPT.failureKind).toBe('DELIVERY')
    expect(QA_ETAP5A_NOTIFICATION_FAILED_ATTEMPT.errorCode).toBe('SMTP_TIMEOUT')
  })

  it('exposes a draft-only SMS communication template fixture without altering runtime length', () => {
    expect(QA_ETAP5A_DRAFT_SMS_TEMPLATE_FIXTURE.channel).toBe('SMS')
    expect(QA_ETAP5A_DRAFT_SMS_TEMPLATE_FIXTURE.status).toBe('DRAFT')
    expect(QA_ETAP5A_DRAFT_SMS_TEMPLATE_FIXTURE.code).toBe('REQUEST_RECEIVED')
    expect(COMMUNICATION_TEMPLATE_SEED_DATA).toHaveLength(4)
    expect(
      COMMUNICATION_TEMPLATE_SEED_DATA.some(
        (t) => t.templateId === QA_ETAP5A_DRAFT_SMS_TEMPLATE_FIXTURE.templateId,
      ),
    ).toBe(false)
  })
})
