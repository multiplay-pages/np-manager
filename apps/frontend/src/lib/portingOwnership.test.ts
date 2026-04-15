import { describe, expect, it } from 'vitest'
import type { PortingRequestAssignmentHistoryItemDto } from '@np-manager/shared'
import {
  canManagePortingOwnership,
  canSelectAnyAssignee,
  formatAssigneeLabel,
  formatAssignmentHistoryHeadline,
  parseOwnershipFilter,
} from './portingOwnership'

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
    expect(canSelectAnyAssignee('BOK_CONSULTANT')).toBe(true)
    expect(canSelectAnyAssignee('MANAGER')).toBe(false)
  })
})
