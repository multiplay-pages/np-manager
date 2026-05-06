import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type {
  NotificationHealthDiagnosticsDto,
  PortingCaseStatus,
  PortingRequestAssigneeSummaryDto,
  PortingRequestCommunicationActionDto,
  PortingRequestStatusActionDto,
} from '@np-manager/shared'
import { WhatsNextPanel, type WhatsNextPanelProps } from './WhatsNextPanel'

function collectElements(node: ReactNode): ReactElement[] {
  const elements: ReactElement[] = []
  const visit = (value: ReactNode) => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (!isValidElement(value)) return
    elements.push(value)
    visit((value.props as { children?: ReactNode }).children)
  }
  visit(node)
  return elements
}

function getTextContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getTextContent).join('')
  if (!isValidElement(node)) return ''
  return getTextContent((node.props as { children?: ReactNode }).children)
}

function findAllButtons(tree: ReactNode): ReactElement[] {
  return collectElements(tree).filter((el) => el.type === 'button')
}

function findByTestId(tree: ReactNode, testId: string): ReactElement | undefined {
  return collectElements(tree).find(
    (el) => (el.props as { 'data-testid'?: string })['data-testid'] === testId,
  )
}

const HEALTHY_NOTIFICATIONS: NotificationHealthDiagnosticsDto = {
  status: 'OK',
  failureCount: 0,
  failedCount: 0,
  misconfiguredCount: 0,
  lastFailureAt: null,
  lastFailureOutcome: null,
}

const ASSIGNEE: PortingRequestAssigneeSummaryDto = {
  id: 'u1',
  email: 'a@x',
  displayName: 'Anna BOK',
  role: 'BOK_CONSULTANT',
}

const STATUS_ACTION: PortingRequestStatusActionDto = {
  actionId: 'CONFIRM',
  label: 'Potwierdź portowanie',
  targetStatus: 'CONFIRMED',
  requiresReason: false,
  requiresComment: false,
  reasonLabel: null,
  commentLabel: null,
  description: 'Potwierdza sprawę.',
}

const CANCEL_ACTION: PortingRequestStatusActionDto = {
  actionId: 'CANCEL',
  label: 'Anuluj',
  targetStatus: 'CANCELLED',
  requiresReason: true,
  requiresComment: false,
  reasonLabel: 'Powod anulowania',
  commentLabel: 'Komentarz operacyjny',
  description: 'Anuluje sprawe.',
}

const SUBMIT_ACTION: PortingRequestStatusActionDto = {
  actionId: 'SUBMIT',
  label: 'Zloz sprawe',
  targetStatus: 'SUBMITTED',
  requiresReason: false,
  requiresComment: false,
  reasonLabel: null,
  commentLabel: null,
  description: 'Przekazuje sprawe do dalszej obslugi.',
}

const COMM_ACTION: PortingRequestCommunicationActionDto = {
  type: 'CLIENT_CONFIRMATION',
  label: 'Wyślij notyfikację',
  description: 'Notyfikacja do klienta.',
  canPreview: true,
  canCreateDraft: true,
  canMarkSent: false,
  disabled: false,
  disabledReason: null,
  existingDraftId: null,
  existingDraftInfo: null,
  allowsMultipleDrafts: false,
}

function makeProps(overrides: Partial<WhatsNextPanelProps> = {}): WhatsNextPanelProps {
  return {
    status: 'SUBMITTED',
    availableStatusActions: [STATUS_ACTION],
    availableCommunicationActions: [],
    assignedUser: ASSIGNEE,
    notificationHealth: HEALTHY_NOTIFICATIONS,
    canManageStatus: true,
    canManageAssignment: true,
    onScrollToStatusActions: vi.fn(),
    onScrollToCommunication: vi.fn(),
    onScrollToAssignment: vi.fn(),
    onScrollToNotifications: vi.fn(),
    ...overrides,
  }
}

describe('WhatsNextPanel', () => {
  it('renders header, current state in plain language, and next step', () => {
    const tree = WhatsNextPanel(makeProps({ status: 'SUBMITTED' }))
    const text = getTextContent(tree)
    expect(text).toContain('Co dalej ze sprawą?')
    expect(text).toContain('Sprawa: Złożona')
    expect(text).toContain('Najbliższy krok')
    expect(text).toContain('potwierdź')
  })

  it('DRAFT with CANCEL and SUBMIT explains submit or cancel-and-create-new mistake flow', () => {
    const tree = WhatsNextPanel(
      makeProps({
        status: 'DRAFT' as PortingCaseStatus,
        availableStatusActions: [SUBMIT_ACTION, CANCEL_ACTION],
      }),
    )
    const text = getTextContent(tree)
    expect(text).toContain('To robocza sprawa')
    expect(text).toContain('Jeśli dane są poprawne, złóż sprawę')
    expect(text).toContain('Jeśli dane są błędne, anuluj ją z powodem i załóż nową')
    expect(text).not.toContain('Uzupełnij dane')
  })

  it('DRAFT without CANCEL does not suggest cancellation', () => {
    const tree = WhatsNextPanel(
      makeProps({
        status: 'DRAFT' as PortingCaseStatus,
        availableStatusActions: [SUBMIT_ACTION],
      }),
    )
    const text = getTextContent(tree)
    expect(text).toContain('Jeśli dane są poprawne, złóż sprawę')
    expect(text).not.toContain('anuluj ją z powodem')
    expect(text).not.toContain('załóż nową')
  })

  it('shows prioritized status action as primary button, wires scroll callback', () => {
    const onScrollToStatusActions = vi.fn()
    const tree = WhatsNextPanel(
      makeProps({ onScrollToStatusActions, availableCommunicationActions: [COMM_ACTION] }),
    )
    const buttons = findAllButtons(tree)
    const statusButton = buttons.find((b) =>
      getTextContent((b.props as { children?: ReactNode }).children).includes(
        'Potwierdź portowanie',
      ),
    )
    expect(statusButton).toBeDefined()
    expect((statusButton!.props as { className?: string }).className).toContain('btn-primary')
    ;(statusButton!.props as { onClick?: () => void }).onClick?.()
    expect(onScrollToStatusActions).toHaveBeenCalledTimes(1)
  })

  it('offers a communication action when status actions are absent', () => {
    const onScrollToCommunication = vi.fn()
    const tree = WhatsNextPanel(
      makeProps({
        availableStatusActions: [],
        availableCommunicationActions: [COMM_ACTION],
        onScrollToCommunication,
      }),
    )
    const buttons = findAllButtons(tree)
    const commButton = buttons.find((b) =>
      getTextContent((b.props as { children?: ReactNode }).children).includes(
        'Wyślij notyfikację',
      ),
    )
    expect(commButton).toBeDefined()
    ;(commButton!.props as { onClick?: () => void }).onClick?.()
    expect(onScrollToCommunication).toHaveBeenCalledTimes(1)
  })

  it('filters out disabled communication actions', () => {
    const tree = WhatsNextPanel(
      makeProps({
        availableStatusActions: [],
        availableCommunicationActions: [
          { ...COMM_ACTION, disabled: true, disabledReason: 'Brak uprawnień' },
        ],
      }),
    )
    const actionsBox = findByTestId(tree, 'whats-next-actions')
    expect(actionsBox).toBeUndefined()
  })

  it('shows assignment blocker when request is unassigned', () => {
    const onScrollToAssignment = vi.fn()
    const tree = WhatsNextPanel(
      makeProps({ assignedUser: null, onScrollToAssignment }),
    )
    const blocker = findByTestId(tree, 'whats-next-blocker')
    expect(blocker).toBeDefined()
    expect(getTextContent(blocker)).toContain('nie ma przypisanego operatora BOK')
    const blockerButton = findAllButtons(blocker).find((b) =>
      getTextContent((b.props as { children?: ReactNode }).children).includes(
        'Przypisz do siebie',
      ),
    )
    expect(blockerButton).toBeDefined()
    ;(blockerButton!.props as { onClick?: () => void }).onClick?.()
    expect(onScrollToAssignment).toHaveBeenCalledTimes(1)
  })

  it('shows notification blocker when health is degraded', () => {
    const tree = WhatsNextPanel(
      makeProps({
        notificationHealth: {
          status: 'FAILED',
          failureCount: 2,
          failedCount: 2,
          misconfiguredCount: 0,
          lastFailureAt: '2026-04-20T10:00:00Z',
          lastFailureOutcome: 'FAILED',
        },
      }),
    )
    const blocker = findByTestId(tree, 'whats-next-blocker')
    expect(blocker).toBeDefined()
    expect(getTextContent(blocker)).toContain('notyfikacji')
  })

  it('hides next step and actions for terminal statuses', () => {
    const tree = WhatsNextPanel(
      makeProps({ status: 'PORTED' as PortingCaseStatus, availableStatusActions: [] }),
    )
    const text = getTextContent(tree)
    expect(text).toContain('Numer został przeniesiony')
    expect(text).not.toContain('Najbliższy krok')
    expect(findByTestId(tree, 'whats-next-actions')).toBeUndefined()
    expect(findByTestId(tree, 'whats-next-blocker')).toBeUndefined()
  })

  it('shows view-only note when user cannot manage status', () => {
    const tree = WhatsNextPanel(
      makeProps({ canManageStatus: false, availableStatusActions: [] }),
    )
    const blocker = findByTestId(tree, 'whats-next-blocker')
    expect(blocker).toBeDefined()
    expect(getTextContent(blocker)).toContain('podgląd')
  })

  it('ERROR with no actions: shows role-gap blocker (REVIEW_ROLES have CANCEL_FROM_ERROR)', () => {
    // CANCEL_FROM_ERROR exists for REVIEW_ROLES — so a user with no actions for ERROR
    // genuinely lacks the required role. Panel should surface this as a role gap.
    const tree = WhatsNextPanel(
      makeProps({
        status: 'ERROR' as PortingCaseStatus,
        availableStatusActions: [],
        canManageStatus: true,
      }),
    )
    const blocker = findByTestId(tree, 'whats-next-blocker')
    expect(blocker).toBeDefined()
    expect(getTextContent(blocker)).toContain('dla Twojej roli')
  })

  it('does not show role-gap blocker while waiting on donor', () => {
    const tree = WhatsNextPanel(
      makeProps({
        status: 'PENDING_DONOR' as PortingCaseStatus,
        availableStatusActions: [],
        canManageStatus: true,
      }),
    )
    const blocker = findByTestId(tree, 'whats-next-blocker')
    expect(blocker).toBeUndefined()
  })

  it('CONFIRMED + MARK_PORTED available: mentions marking as ported', () => {
    const markPortedAction: PortingRequestStatusActionDto = {
      actionId: 'MARK_PORTED',
      label: 'Oznacz jako przeniesiona',
      targetStatus: 'PORTED',
      requiresReason: false,
      requiresComment: false,
      reasonLabel: null,
      commentLabel: null,
      description: 'Oznacza sprawę jako przeniesioną.',
    }
    const tree = WhatsNextPanel(
      makeProps({
        status: 'CONFIRMED' as PortingCaseStatus,
        availableStatusActions: [markPortedAction],
      }),
    )
    const text = getTextContent(tree)
    expect(text).toContain('Oznacz jako przeniesiona')
    expect(text).toContain('Akcje statusu')
  })

  it('CONFIRMED without MARK_PORTED: shows neutral role-based hint', () => {
    const tree = WhatsNextPanel(
      makeProps({
        status: 'CONFIRMED' as PortingCaseStatus,
        availableStatusActions: [],
      }),
    )
    const text = getTextContent(tree)
    expect(text).toContain('Dostępne akcje zależą od Twojej roli')
    expect(text).toContain('sekcję akcji statusu')
    expect(text.toLowerCase()).not.toContain('przeniesion')
    expect(text).not.toContain('Oznacz jako przeniesiona')
  })

  it('CONFIRMED with CANCEL but without MARK_PORTED: shows neutral role-based hint', () => {
    const tree = WhatsNextPanel(
      makeProps({
        status: 'CONFIRMED' as PortingCaseStatus,
        availableStatusActions: [CANCEL_ACTION],
      }),
    )
    const text = getTextContent(tree)
    expect(text).toContain('Dostępne akcje zależą od Twojej roli')
    expect(text).toContain('sekcję akcji statusu')
    expect(text.toLowerCase()).not.toContain('przeniesion')
    expect(text).not.toContain('Oznacz jako przeniesiona')
  })

  it('PORTED: calm completion message, no next step, no blocker', () => {
    const tree = WhatsNextPanel(
      makeProps({ status: 'PORTED' as PortingCaseStatus, availableStatusActions: [] }),
    )
    const text = getTextContent(tree)
    expect(text).toContain('Numer został przeniesiony')
    expect(text).toContain('zakończona pomyślnie')
    expect(text).not.toContain('Najbliższy krok')
    expect(findByTestId(tree, 'whats-next-actions')).toBeUndefined()
    expect(findByTestId(tree, 'whats-next-blocker')).toBeUndefined()
  })

  it('REJECTED: shows closed-case message, no next step', () => {
    const tree = WhatsNextPanel(
      makeProps({ status: 'REJECTED' as PortingCaseStatus, availableStatusActions: [] }),
    )
    const text = getTextContent(tree)
    expect(text).toContain('odrzucona')
    expect(text).not.toContain('Najbliższy krok')
    expect(findByTestId(tree, 'whats-next-actions')).toBeUndefined()
  })

  it('CANCELLED: shows closed-case message, no next step', () => {
    const tree = WhatsNextPanel(
      makeProps({ status: 'CANCELLED' as PortingCaseStatus, availableStatusActions: [] }),
    )
    const text = getTextContent(tree)
    expect(text).toContain('anulowana')
    expect(text).toContain('Jeśli sprawa była błędna, załóż nową poprawną sprawę')
    expect(text).toContain('podgląd historii')
    expect(text).not.toContain('Najbliższy krok')
    expect(findByTestId(tree, 'whats-next-actions')).toBeUndefined()
  })

  it('ERROR: shows intervention message', () => {
    const tree = WhatsNextPanel(
      makeProps({
        status: 'ERROR' as PortingCaseStatus,
        availableStatusActions: [],
        canManageStatus: true,
      }),
    )
    const text = getTextContent(tree)
    expect(text).toContain('błędu')
    expect(text).toContain('interwencji')
  })

  it('ERROR with CANCEL_FROM_ERROR action: shows action button, no dead-end blocker', () => {
    const cancelFromErrorAction: PortingRequestStatusActionDto = {
      actionId: 'CANCEL_FROM_ERROR',
      label: 'Anuluj z bledu',
      targetStatus: 'CANCELLED',
      requiresReason: true,
      requiresComment: false,
      reasonLabel: 'Powod anulowania z bledu',
      commentLabel: 'Komentarz operacyjny',
      description: 'Zamknij sprawe w stanie bledu jako anulowana.',
    }
    const tree = WhatsNextPanel(
      makeProps({
        status: 'ERROR' as PortingCaseStatus,
        availableStatusActions: [cancelFromErrorAction],
        canManageStatus: true,
      }),
    )
    const actions = findByTestId(tree, 'whats-next-actions')
    expect(actions).toBeDefined()
    expect(getTextContent(actions)).toContain('Anuluj z bledu')
    const blocker = findByTestId(tree, 'whats-next-blocker')
    expect(blocker).toBeUndefined()
  })
})
