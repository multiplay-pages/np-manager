import { describe, expect, it } from 'vitest'
import {
  buildCommunicationSummary,
  getAvailableCommunicationActionsForRequest,
  resolveCommunicationActionTypeForRecord,
} from '../porting-request-communication-policy'

const BASE_REQUEST = {
  statusInternal: 'SUBMITTED' as const,
  sentToExternalSystemAt: null,
  confirmedPortDate: null,
  donorAssignedPortDate: null,
}

const BASE_COMMUNICATION = {
  id: 'comm-1',
  portingRequestId: 'req-1',
  actionType: 'CLIENT_CONFIRMATION' as const,
  type: 'EMAIL' as const,
  status: 'DRAFT' as const,
  triggerType: 'CASE_RECEIVED' as const,
  recipient: 'jan@example.com',
  subject: 'Aktualizacja sprawy',
  body: 'body',
  templateKey: 'client_confirmation' as const,
  createdByUserId: 'user-1',
  createdByDisplayName: 'Anna Nowak',
  createdByRole: 'ADMIN' as const,
  sentAt: null,
  errorMessage: null,
  metadata: {
    actionType: 'CLIENT_CONFIRMATION',
  },
  createdAt: '2026-04-06T10:00:00.000Z',
  updatedAt: '2026-04-06T10:00:00.000Z',
}

describe('porting-request-communication-policy', () => {
  it('returns backend-owned communication actions filtered by role', () => {
    const actions = getAvailableCommunicationActionsForRequest(BASE_REQUEST, 'BOK_CONSULTANT', [])

    expect(actions.map((action) => action.type)).toEqual([
      'MISSING_DOCUMENTS',
      'CLIENT_CONFIRMATION',
    ])
  })

  it('marks actions as disabled when current status is outside policy', () => {
    const actions = getAvailableCommunicationActionsForRequest(
      {
        ...BASE_REQUEST,
        statusInternal: 'PORTED',
      },
      'ADMIN',
      [],
    )

    const missingDocumentsAction = actions.find((action) => action.type === 'MISSING_DOCUMENTS')
    const completionAction = actions.find((action) => action.type === 'COMPLETION_NOTICE')

    expect(missingDocumentsAction?.disabled).toBe(true)
    expect(missingDocumentsAction?.disabledReason).toContain('Aktualny status')
    expect(completionAction?.canCreateDraft).toBe(true)
  })

  it('blocks duplicate draft creation when policy forbids multiple drafts', () => {
    const actions = getAvailableCommunicationActionsForRequest(BASE_REQUEST, 'ADMIN', [
      BASE_COMMUNICATION,
    ])

    const confirmationAction = actions.find((action) => action.type === 'CLIENT_CONFIRMATION')

    expect(confirmationAction?.canCreateDraft).toBe(false)
    expect(confirmationAction?.existingDraftId).toBe('comm-1')
    expect(confirmationAction?.disabledReason).toContain('Istnieje juz aktywny draft')
  })

  it('builds operational communication summary from history', () => {
    const summary = buildCommunicationSummary([
      {
        ...BASE_COMMUNICATION,
        id: 'comm-2',
        status: 'FAILED',
        errorMessage: 'SMTP timeout',
        createdAt: '2026-04-07T08:00:00.000Z',
        updatedAt: '2026-04-07T08:00:00.000Z',
      },
      {
        ...BASE_COMMUNICATION,
        id: 'comm-3',
        status: 'SENT',
        sentAt: '2026-04-06T11:00:00.000Z',
      },
      BASE_COMMUNICATION,
    ])

    expect(summary.totalCount).toBe(3)
    expect(summary.draftCount).toBe(1)
    expect(summary.sentCount).toBe(1)
    expect(summary.errorCount).toBe(1)
    expect(summary.lastCommunicationType).toBe('CLIENT_CONFIRMATION')
    expect(summary.lastCommunicationAt).toBe('2026-04-07T08:00:00.000Z')
  })

  it('resolves action type from stored metadata and legacy trigger fallback', () => {
    expect(
      resolveCommunicationActionTypeForRecord({
        metadata: { actionType: 'INTERNAL_NOTE_EMAIL' },
        templateKey: 'case_received',
        triggerType: 'CASE_RECEIVED',
      }),
    ).toBe('INTERNAL_NOTE_EMAIL')

    expect(
      resolveCommunicationActionTypeForRecord({
        metadata: null,
        templateKey: 'case_rejected',
        triggerType: 'CASE_REJECTED',
      }),
    ).toBe('REJECTION_NOTICE')
  })
})
