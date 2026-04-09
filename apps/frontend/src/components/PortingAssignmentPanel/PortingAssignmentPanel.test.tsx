import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { PortingRequestAssignmentHistoryItemDto } from '@np-manager/shared'
import { PortingAssignmentPanel } from './PortingAssignmentPanel'

function collectElements(node: ReactNode): ReactElement[] {
  const elements: ReactElement[] = []

  const visit = (value: ReactNode) => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }

    if (!isValidElement(value)) {
      return
    }

    elements.push(value)
    visit((value.props as { children?: ReactNode }).children)
  }

  visit(node)
  return elements
}

function getTextContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map((item) => getTextContent(item)).join('')
  }

  if (!isValidElement(node)) {
    return ''
  }

  return getTextContent((node.props as { children?: ReactNode }).children)
}

function findButtonByText(tree: ReactNode, label: string): ReactElement | undefined {
  return collectElements(tree).find(
    (element) =>
      element.type === 'button' &&
      getTextContent((element.props as { children?: ReactNode }).children).includes(label),
  )
}

const HISTORY_ITEMS: PortingRequestAssignmentHistoryItemDto[] = [
  {
    id: 'history-1',
    portingRequestId: 'request-1',
    previousAssignedUser: {
      id: 'user-1',
      email: 'anna@np-manager.local',
      displayName: 'Anna Admin',
      role: 'ADMIN',
    },
    nextAssignedUser: {
      id: 'user-2',
      email: 'jan@np-manager.local',
      displayName: 'Jan Kowalski',
      role: 'BOK_CONSULTANT',
    },
    changedByUser: {
      id: 'user-3',
      email: 'ewa@np-manager.local',
      displayName: 'Ewa Kierownik',
      role: 'MANAGER',
    },
    createdAt: '2026-04-09T11:00:00.000Z',
  },
]

describe('PortingAssignmentPanel', () => {
  it('renders assignment section with owner and history entries', () => {
    const html = renderToStaticMarkup(
      <PortingAssignmentPanel
        assignedUser={{
          id: 'user-2',
          email: 'jan@np-manager.local',
          displayName: 'Jan Kowalski',
          role: 'BOK_CONSULTANT',
        }}
        assignedAt="2026-04-09T10:00:00.000Z"
        assignedByDisplayName="Anna Admin (anna@np-manager.local)"
        historyItems={HISTORY_ITEMS}
        isHistoryLoading={false}
        canManageAssignment
        canSelectAssignee
        isLoadingAssigneeOptions={false}
        assigneeOptions={[
          { id: 'user-2', label: 'Jan Kowalski (jan@np-manager.local)' },
          { id: 'user-4', label: 'Marek Nowak (marek@np-manager.local)' },
        ]}
        selectedAssigneeId="user-4"
        currentUserId="user-2"
        isAssigningToMe={false}
        isUpdatingAssignment={false}
        isUnassigning={false}
        feedbackError={null}
        feedbackSuccess={null}
        onSelectedAssigneeIdChange={vi.fn()}
        onAssignToMe={vi.fn()}
        onUpdateAssignment={vi.fn()}
        onUnassign={vi.fn()}
      />,
    )

    expect(html).toContain('Przypisanie')
    expect(html).toContain('Jan Kowalski (jan@np-manager.local)')
    expect(html).toContain('Historia przypisan')
    expect(html).toContain('Zmieniono przypisanie z Anna Admin na Jan Kowalski.')
  })

  it('triggers assign-to-me action callback', () => {
    const onAssignToMe = vi.fn()

    const tree = PortingAssignmentPanel({
      assignedUser: null,
      assignedAt: null,
      assignedByDisplayName: null,
      historyItems: [],
      isHistoryLoading: false,
      canManageAssignment: true,
      canSelectAssignee: false,
      isLoadingAssigneeOptions: false,
      assigneeOptions: [],
      selectedAssigneeId: '',
      currentUserId: 'user-2',
      isAssigningToMe: false,
      isUpdatingAssignment: false,
      isUnassigning: false,
      feedbackError: null,
      feedbackSuccess: null,
      onSelectedAssigneeIdChange: vi.fn(),
      onAssignToMe,
      onUpdateAssignment: vi.fn(),
      onUnassign: vi.fn(),
    })

    const assignButton = findButtonByText(tree, 'Przypisz do mnie')
    expect(assignButton).toBeDefined()
    ;(assignButton?.props as { onClick?: () => void }).onClick?.()

    expect(onAssignToMe).toHaveBeenCalledTimes(1)
  })

  it('triggers unassign callback when request is assigned', () => {
    const onUnassign = vi.fn()

    const tree = PortingAssignmentPanel({
      assignedUser: {
        id: 'user-2',
        email: 'jan@np-manager.local',
        displayName: 'Jan Kowalski',
        role: 'BOK_CONSULTANT',
      },
      assignedAt: '2026-04-09T10:00:00.000Z',
      assignedByDisplayName: null,
      historyItems: [],
      isHistoryLoading: false,
      canManageAssignment: true,
      canSelectAssignee: false,
      isLoadingAssigneeOptions: false,
      assigneeOptions: [],
      selectedAssigneeId: '',
      currentUserId: 'user-1',
      isAssigningToMe: false,
      isUpdatingAssignment: false,
      isUnassigning: false,
      feedbackError: null,
      feedbackSuccess: null,
      onSelectedAssigneeIdChange: vi.fn(),
      onAssignToMe: vi.fn(),
      onUpdateAssignment: vi.fn(),
      onUnassign,
    })

    const unassignButton = findButtonByText(tree, 'Zdejmij przypisanie')
    expect(unassignButton).toBeDefined()
    ;(unassignButton?.props as { onClick?: () => void }).onClick?.()

    expect(onUnassign).toHaveBeenCalledTimes(1)
  })

  it('does not show ownership actions for read-only roles', () => {
    const html = renderToStaticMarkup(
      <PortingAssignmentPanel
        assignedUser={null}
        assignedAt={null}
        assignedByDisplayName={null}
        historyItems={[]}
        isHistoryLoading={false}
        canManageAssignment={false}
        canSelectAssignee={false}
        isLoadingAssigneeOptions={false}
        assigneeOptions={[]}
        selectedAssigneeId=""
        currentUserId="user-5"
        isAssigningToMe={false}
        isUpdatingAssignment={false}
        isUnassigning={false}
        feedbackError={null}
        feedbackSuccess={null}
        onSelectedAssigneeIdChange={vi.fn()}
        onAssignToMe={vi.fn()}
        onUpdateAssignment={vi.fn()}
        onUnassign={vi.fn()}
      />,
    )

    expect(html).toContain('Twoja rola ma dostep tylko do podgladu przypisania.')
    expect(html).not.toContain('Przypisz do mnie')
    expect(html).not.toContain('Zdejmij przypisanie')
  })
})
