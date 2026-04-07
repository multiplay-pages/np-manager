import { describe, expect, it } from 'vitest'
import { resolveSuggestedCommunicationTriggerType } from '../porting-request-communication.templates'

describe('porting-request-communication.templates', () => {
  it('suggests SENT_TO_EXTERNAL_SYSTEM when request is already handed over', () => {
    expect(
      resolveSuggestedCommunicationTriggerType({
        statusInternal: 'PENDING_DONOR',
        donorAssignedPortDate: null,
        confirmedPortDate: null,
        sentToExternalSystemAt: new Date('2026-04-06T09:00:00.000Z'),
      }),
    ).toBe('SENT_TO_EXTERNAL_SYSTEM')
  })

  it('suggests PORT_DATE_SCHEDULED when request already has a planned port date', () => {
    expect(
      resolveSuggestedCommunicationTriggerType({
        statusInternal: 'CONFIRMED',
        donorAssignedPortDate: new Date('2026-04-15T00:00:00.000Z'),
        confirmedPortDate: null,
        sentToExternalSystemAt: new Date('2026-04-06T09:00:00.000Z'),
      }),
    ).toBe('PORT_DATE_SCHEDULED')
  })
})
