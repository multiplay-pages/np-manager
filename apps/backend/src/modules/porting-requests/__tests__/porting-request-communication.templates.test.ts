import { describe, expect, it } from 'vitest'
import {
  buildCommunicationPreview,
  renderTemplateText,
  resolveSuggestedCommunicationTriggerType,
  resolveTemplateKeyForAction,
  resolveTemplateKeyForTrigger,
} from '../porting-request-communication.templates'

describe('porting-request-communication.templates', () => {
  it('renders placeholders in subject and body', () => {
    const result = buildCommunicationPreview({
      actionType: 'CLIENT_CONFIRMATION',
      type: 'EMAIL',
      triggerType: 'PORT_DATE_SCHEDULED',
      templateKey: 'port_date_scheduled',
      recipient: 'jan@example.com',
      context: {
        clientName: 'Jan Kowalski',
        caseNumber: 'FNP-20260406-ABC123',
        phoneNumber: '221234567',
        scheduledPortDate: '15.04.2026',
        rejectionReason: null,
      },
    })

    expect(result.subject).toContain('FNP-20260406-ABC123')
    expect(result.body).toContain('Jan Kowalski')
    expect(result.body).toContain('15.04.2026')
  })

  it('uses safe fallback values for missing optional placeholders', () => {
    const result = renderTemplateText('Powod: {{rejectionReason}}, termin: {{scheduledPortDate}}', {
      clientName: 'Jan Kowalski',
      caseNumber: 'FNP-1',
      phoneNumber: '221234567',
      scheduledPortDate: null,
      rejectionReason: null,
    })

    expect(result).toBe('Powod: brak szczegolow, termin: do potwierdzenia')
  })

  it('suggests trigger type based on current request state', () => {
    expect(
      resolveSuggestedCommunicationTriggerType({
        statusInternal: 'PENDING_DONOR',
        donorAssignedPortDate: null,
        confirmedPortDate: null,
        rejectionReason: null,
        sentToExternalSystemAt: new Date('2026-04-06T09:00:00.000Z'),
      }),
    ).toBe('SENT_TO_EXTERNAL_SYSTEM')

    expect(resolveTemplateKeyForTrigger('CASE_REJECTED')).toBe('case_rejected')
    expect(resolveTemplateKeyForAction('MISSING_DOCUMENTS')).toBe('missing_documents')
  })
})
