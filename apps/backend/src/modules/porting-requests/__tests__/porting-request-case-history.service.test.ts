import { describe, expect, it } from 'vitest'
import {
  buildCaseHistoryCreateData,
  mapCaseHistoryToDto,
} from '../porting-request-case-history.service'

describe('porting-request-case-history.service', () => {
  it('builds create payload with statusBefore/statusAfter and metadata', () => {
    const result = buildCaseHistoryCreateData({
      requestId: 'req-1',
      eventType: 'STATUS_CHANGED',
      statusBefore: 'SUBMITTED',
      statusAfter: 'REJECTED',
      reason: 'Niekompletne dane',
      comment: 'Brak podpisu na formularzu',
      actorUserId: 'user-1',
      metadata: {
        actionId: 'REJECT',
      },
    })

    expect(result.statusBefore).toBe('SUBMITTED')
    expect(result.statusAfter).toBe('REJECTED')
    expect(result.reason).toBe('Niekompletne dane')
    expect(result.comment).toBe('Brak podpisu na formularzu')
    expect(result.metadata).toEqual({ actionId: 'REJECT' })
  })

  it('maps case history row to DTO with actor and safe metadata', () => {
    const dto = mapCaseHistoryToDto({
      id: 'hist-1',
      eventType: 'STATUS_CHANGED',
      statusBefore: 'CONFIRMED',
      statusAfter: 'ERROR',
      reason: 'Problem procesowy',
      comment: 'Brak mozliwosci finalizacji',
      metadata: {
        actionId: 'MARK_ERROR',
        retryCount: 2,
        nested: { shouldDrop: true },
      },
      occurredAt: new Date('2026-04-04T10:00:00.000Z'),
      actor: {
        firstName: 'Anna',
        lastName: 'Nowak',
        role: 'ADMIN',
      },
    })

    expect(dto.statusBefore).toBe('CONFIRMED')
    expect(dto.statusAfter).toBe('ERROR')
    expect(dto.actorDisplayName).toBe('Anna Nowak')
    expect(dto.actorRole).toBe('ADMIN')
    expect(dto.metadata).toEqual({
      actionId: 'MARK_ERROR',
      retryCount: 2,
    })
  })
})
