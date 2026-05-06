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

  it('describes CANCEL actions as cancellation with reason for mistake flow', () => {
    const draftCancel = getAvailableStatusActions('DRAFT', 'BOK_CONSULTANT').find(
      (action) => action.actionId === 'CANCEL',
    )
    const submittedCancel = getAvailableStatusActions('SUBMITTED', 'BOK_CONSULTANT').find(
      (action) => action.actionId === 'CANCEL',
    )

    expect(draftCancel).toMatchObject({
      label: 'Anuluj',
      requiresReason: true,
      reasonLabel: 'Powód anulowania',
      description: 'Anuluj roboczą sprawę, jeśli dane zostały wprowadzone błędnie.',
    })
    expect(submittedCancel).toMatchObject({
      label: 'Anuluj',
      requiresReason: true,
      reasonLabel: 'Powód anulowania',
      description: 'Anuluj sprawę z powodem i zatrzymaj dalszą obsługę.',
    })
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
    ).toThrowError(/Nie można zmienić statusu/)
  })

  it('rejects role not allowed for transition', () => {
    expect(() =>
      resolveWorkflowTransition('SUBMITTED', { targetStatus: 'CONFIRMED' }, 'BOK_CONSULTANT'),
    ).toThrowError(/Twoja rola nie może wykonać tej zmiany statusu/)
  })

  it('requires reason when configured', () => {
    expect(() =>
      resolveWorkflowTransition('SUBMITTED', { targetStatus: 'REJECTED' }, 'ADMIN'),
    ).toThrowError(/Powód odrzucenia jest wymagany/)
  })

  it('requires comment when configured', () => {
    expect(() =>
      resolveWorkflowTransition(
        'CONFIRMED',
        { targetStatus: 'ERROR', reason: 'Bledne dane', comment: '   ' },
        'ADMIN',
      ),
    ).toThrowError(/Szczegóły błędu jest wymagany/)
  })

  it('MARK_PORTED is available from CONFIRMED for REVIEW_ROLES', () => {
    for (const role of ['ADMIN', 'BACK_OFFICE', 'MANAGER'] as const) {
      const actions = getAvailableStatusActions('CONFIRMED', role)
      expect(actions.map((a) => a.actionId)).toContain('MARK_PORTED')
    }
  })

  it('MARK_PORTED is not available from CONFIRMED for BOK_CONSULTANT', () => {
    const actions = getAvailableStatusActions('CONFIRMED', 'BOK_CONSULTANT')
    expect(actions.map((a) => a.actionId)).not.toContain('MARK_PORTED')
  })

  it('MARK_PORTED is not available from terminal statuses', () => {
    for (const status of ['PORTED', 'CANCELLED', 'REJECTED'] as const) {
      const actions = getAvailableStatusActions(status, 'ADMIN')
      expect(actions.map((a) => a.actionId)).not.toContain('MARK_PORTED')
    }
  })

  it('resolves CONFIRMED to PORTED transition for ADMIN', () => {
    const result = resolveWorkflowTransition(
      'CONFIRMED',
      { targetStatus: 'PORTED' },
      'ADMIN',
    )
    expect(result.config.actionId).toBe('MARK_PORTED')
    expect(result.config.targetStatus).toBe('PORTED')
    expect(result.reason).toBeNull()
    expect(result.comment).toBeNull()
  })

  it('blocks CONFIRMED to PORTED for BOK_CONSULTANT', () => {
    expect(() =>
      resolveWorkflowTransition('CONFIRMED', { targetStatus: 'PORTED' }, 'BOK_CONSULTANT'),
    ).toThrowError(/Twoja rola nie może wykonać tej zmiany statusu/)
  })

  it('blocks already-PORTED request from being ported again', () => {
    expect(() =>
      resolveWorkflowTransition('PORTED', { targetStatus: 'PORTED' }, 'ADMIN'),
    ).toThrowError(/Sprawa ma już wskazany status/)
  })

  describe('CANCEL_FROM_ERROR', () => {
    it('available for ADMIN/BACK_OFFICE/MANAGER from ERROR', () => {
      for (const role of ['ADMIN', 'BACK_OFFICE', 'MANAGER'] as const) {
        const actions = getAvailableStatusActions('ERROR', role)
        expect(actions.map((a) => a.actionId)).toContain('CANCEL_FROM_ERROR')
      }
    })

    it('not available for BOK_CONSULTANT from ERROR', () => {
      const actions = getAvailableStatusActions('ERROR', 'BOK_CONSULTANT')
      expect(actions.map((a) => a.actionId)).not.toContain('CANCEL_FROM_ERROR')
    })

    it('ERROR → CANCELLED succeeds with reason', () => {
      const result = resolveWorkflowTransition(
        'ERROR',
        { targetStatus: 'CANCELLED', reason: 'Decyzja operacyjna' },
        'ADMIN',
      )
      expect(result.config.actionId).toBe('CANCEL_FROM_ERROR')
      expect(result.config.targetStatus).toBe('CANCELLED')
      expect(result.reason).toBe('Decyzja operacyjna')
    })

    it('requires reason', () => {
      expect(() =>
        resolveWorkflowTransition('ERROR', { targetStatus: 'CANCELLED' }, 'ADMIN'),
      ).toThrowError(/Powód anulowania z błędu jest wymagany/)
    })

    it('blocks BOK_CONSULTANT from ERROR → CANCELLED', () => {
      expect(() =>
        resolveWorkflowTransition(
          'ERROR',
          { targetStatus: 'CANCELLED', reason: 'x' },
          'BOK_CONSULTANT',
        ),
      ).toThrowError(/Twoja rola nie może wykonać tej zmiany statusu/)
    })
  })

  describe('RESUME_FROM_ERROR', () => {
    it('available for ADMIN/BACK_OFFICE/MANAGER from ERROR', () => {
      for (const role of ['ADMIN', 'BACK_OFFICE', 'MANAGER'] as const) {
        const actions = getAvailableStatusActions('ERROR', role)
        expect(actions.map((a) => a.actionId)).toContain('RESUME_FROM_ERROR')
      }
    })

    it('not available for BOK_CONSULTANT from ERROR', () => {
      const actions = getAvailableStatusActions('ERROR', 'BOK_CONSULTANT')
      expect(actions.map((a) => a.actionId)).not.toContain('RESUME_FROM_ERROR')
    })

    it('requires comment (targetStatus ERROR as placeholder is same as current, so resolveWorkflowTransition is bypassed in service)', () => {
      // RESUME_FROM_ERROR uses actionId-based path in service, not resolveWorkflowTransition.
      // This test confirms the action is present in getAvailableStatusActions with correct requiresComment.
      const actions = getAvailableStatusActions('ERROR', 'ADMIN')
      const action = actions.find((a) => a.actionId === 'RESUME_FROM_ERROR')
      expect(action).toBeDefined()
      expect(action?.requiresComment).toBe(true)
      expect(action?.requiresReason).toBe(false)
    })
  })
})
