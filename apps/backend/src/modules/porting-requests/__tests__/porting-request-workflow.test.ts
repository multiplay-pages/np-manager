import { describe, expect, it } from 'vitest'
import {
  getAvailableStatusActions,
  resolveWorkflowTransition,
} from '../porting-request-workflow'

describe('porting-request-workflow', () => {
  it('returns backend-driven allowed actions for given status and role', () => {
    const actions = getAvailableStatusActions('SUBMITTED', 'BACK_OFFICE')

    expect(actions.map((action) => action.targetStatus)).toEqual([
      'PENDING_DONOR',
      'CONFIRMED',
      'REJECTED',
      'CANCELLED',
      'ERROR',
    ])
  })

  it('filters actions by role', () => {
    const actions = getAvailableStatusActions('SUBMITTED', 'BOK_CONSULTANT')

    expect(actions.map((action) => action.targetStatus)).toEqual(['CANCELLED'])
  })

  it('allows valid transition and normalizes reason/comment', () => {
    const result = resolveWorkflowTransition(
      'PENDING_DONOR',
      {
        targetStatus: 'ERROR',
        reason: '  Timeout dawcy  ',
        comment: '  Brak odpowiedzi od 48h  ',
      },
      'MANAGER',
    )

    expect(result.config.targetStatus).toBe('ERROR')
    expect(result.reason).toBe('Timeout dawcy')
    expect(result.comment).toBe('Brak odpowiedzi od 48h')
  })

  it('rejects transition not allowed from current status', () => {
    expect(() =>
      resolveWorkflowTransition('DRAFT', { targetStatus: 'PORTED' }, 'ADMIN'),
    ).toThrowError(/Nie mozna zmienic statusu/)
  })

  it('rejects role not allowed for transition', () => {
    expect(() =>
      resolveWorkflowTransition('SUBMITTED', { targetStatus: 'CONFIRMED' }, 'BOK_CONSULTANT'),
    ).toThrowError(/Twoja rola nie moze wykonac tej zmiany statusu/)
  })

  it('requires reason when configured', () => {
    expect(() =>
      resolveWorkflowTransition('SUBMITTED', { targetStatus: 'REJECTED' }, 'ADMIN'),
    ).toThrowError(/Powod odrzucenia jest wymagany/)
  })

  it('requires comment when configured', () => {
    expect(() =>
      resolveWorkflowTransition(
        'CONFIRMED',
        { targetStatus: 'ERROR', reason: 'Bledne dane', comment: '   ' },
        'ADMIN',
      ),
    ).toThrowError(/Szczegoly bledu jest wymagany/)
  })
})
