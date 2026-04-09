import { describe, expect, it } from 'vitest'

import {
  PORTING_NOTIFICATION_EVENT,
  PORTING_NOTIFICATION_EVENT_LABELS,
} from '../porting-notification-events'

describe('PORTING_NOTIFICATION_EVENT catalog', () => {
  it('contains the PR13A foundation events', () => {
    expect(PORTING_NOTIFICATION_EVENT).toMatchObject({
      REQUEST_CREATED: 'REQUEST_CREATED',
      STATUS_CHANGED: 'STATUS_CHANGED',
      E03_SENT: 'E03_SENT',
      E06_RECEIVED: 'E06_RECEIVED',
      PORT_DATE_CONFIRMED: 'PORT_DATE_CONFIRMED',
      E12_SENT: 'E12_SENT',
      E13_RECEIVED: 'E13_RECEIVED',
      NUMBER_PORTED: 'NUMBER_PORTED',
      CASE_REJECTED: 'CASE_REJECTED',
      COMMERCIAL_OWNER_CHANGED: 'COMMERCIAL_OWNER_CHANGED',
    })
  })

  it('exposes labels for each event', () => {
    for (const event of Object.values(PORTING_NOTIFICATION_EVENT)) {
      expect(PORTING_NOTIFICATION_EVENT_LABELS[event]).toBeTruthy()
    }
  })
})
