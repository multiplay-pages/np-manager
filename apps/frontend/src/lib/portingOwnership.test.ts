import { describe, expect, it } from 'vitest'
import type {
  PortingRequestAssignmentHistoryItemDto,
  PortingRequestListItemDto,
} from '@np-manager/shared'
import {
  canManagePortingOwnership,
  canSelectAnyAssignee,
  filterPortingRequestsByOwnership,
  formatAssigneeLabel,
  formatAssignmentHistoryHeadline,
  parseOwnershipFilter,
} from './portingOwnership'

function buildListItem(
  id: string,
  assignedUserId: string | null,
  assignedDisplayName = 'Jan Kowalski',
): PortingRequestListItemDto {
  return {
    id,
    caseNumber: `SPR-${id}`,
    clientId: 'client-1',
    clientDisplayName: 'Klient testowy',
    numberDisplay: '221234567',
    donorOperatorId: 'operator-1',
    donorOperatorName: 'Orange',
    portingMode: 'DAY',
    statusInternal: 'SUBMITTED',
    assignedUserSummary: assignedUserId
      ? {
          id: assignedUserId,
          email: `${assignedUserId}@np-manager.local`,
          displayName: assignedDisplayName,
          role: 'BOK_CONSULTANT',
        }
      : null,
    createdAt: '2026-04-09T10:00:00.000Z',
  }
}

describe('portingOwnership helpers', () => {
  it('formats assignee labels for assigned and unassigned cases', () => {
    expect(
      formatAssigneeLabel({
        id: 'user-1',
        email: 'user-1@np-manager.local',
        displayName: 'Jan Kowalski',
        role: 'BOK_CONSULTANT',
      }),
    ).toBe('Jan Kowalski (user-1@np-manager.local)')
    expect(formatAssigneeLabel(null)).toBe('Nieprzypisana')
  })

  it('filters list to my requests', () => {
    const items = [
      buildListItem('1', 'user-1'),
      buildListItem('2', 'user-2'),
      buildListItem('3', null),
    ]

    const result = filterPortingRequestsByOwnership(items, 'MINE', 'user-1')

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('1')
  })

  it('filters list to unassigned requests', () => {
    const items = [
      buildListItem('1', 'user-1'),
      buildListItem('2', null),
      buildListItem('3', null),
    ]

    const result = filterPortingRequestsByOwnership(items, 'UNASSIGNED', 'user-1')

    expect(result).toHaveLength(2)
    expect(result.map((item) => item.id)).toEqual(['2', '3'])
  })

  it('builds readable assignment history headline', () => {
    const historyItem: PortingRequestAssignmentHistoryItemDto = {
      id: 'history-1',
      portingRequestId: 'request-1',
      previousAssignedUser: {
        id: 'user-1',
        email: 'user-1@np-manager.local',
        displayName: 'Anna Admin',
        role: 'ADMIN',
      },
      nextAssignedUser: {
        id: 'user-2',
        email: 'user-2@np-manager.local',
        displayName: 'Jan Kowalski',
        role: 'BOK_CONSULTANT',
      },
      changedByUser: {
        id: 'user-3',
        email: 'user-3@np-manager.local',
        displayName: 'Ewa Kierownik',
        role: 'MANAGER',
      },
      createdAt: '2026-04-09T10:00:00.000Z',
    }

    expect(formatAssignmentHistoryHeadline(historyItem)).toBe(
      'Zmieniono przypisanie z Anna Admin na Jan Kowalski.',
    )
  })

  it('parses ownership filter values and RBAC helper flags', () => {
    expect(parseOwnershipFilter('MINE')).toBe('MINE')
    expect(parseOwnershipFilter('UNASSIGNED')).toBe('UNASSIGNED')
    expect(parseOwnershipFilter('something-else')).toBe('ALL')
    expect(parseOwnershipFilter(null)).toBe('ALL')

    expect(canManagePortingOwnership('ADMIN')).toBe(true)
    expect(canManagePortingOwnership('BOK_CONSULTANT')).toBe(true)
    expect(canManagePortingOwnership('MANAGER')).toBe(false)
    expect(canSelectAnyAssignee('ADMIN')).toBe(true)
    expect(canSelectAnyAssignee('BOK_CONSULTANT')).toBe(false)
  })
})
