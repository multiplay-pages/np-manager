import type {
  PortingRequestAssigneeSummaryDto,
  PortingRequestAssignmentHistoryItemDto,
  UserRole,
} from '@np-manager/shared'

export type OwnershipSignal =
  | { label: 'Moja'; tone: 'emerald' }
  | { label: 'Nieprzypisana'; tone: 'amber' }

export function getOwnershipSignal(
  assignedUserSummary: PortingRequestAssigneeSummaryDto | null,
  currentUserId: string | null,
): OwnershipSignal | null {
  if (!assignedUserSummary) {
    return { label: 'Nieprzypisana', tone: 'amber' }
  }

  if (currentUserId && assignedUserSummary.id === currentUserId) {
    return { label: 'Moja', tone: 'emerald' }
  }

  return null
}

export type OwnershipFilter = 'ALL' | 'MINE' | 'UNASSIGNED'

export function parseOwnershipFilter(value: string | null): OwnershipFilter {
  if (value === 'MINE' || value === 'UNASSIGNED') {
    return value
  }

  return 'ALL'
}

export function formatAssigneeLabel(assignee: PortingRequestAssigneeSummaryDto | null): string {
  if (!assignee) {
    return 'Nieprzypisana'
  }

  return `${assignee.displayName} (${assignee.email})`
}

export function canManagePortingOwnership(role: UserRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'BOK_CONSULTANT'
}

export function canSelectAnyAssignee(role: UserRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'BOK_CONSULTANT'
}

export function formatAssignmentHistoryHeadline(
  item: PortingRequestAssignmentHistoryItemDto,
): string {
  const previous = item.previousAssignedUser
  const next = item.nextAssignedUser

  if (!previous && next) {
    return `Przypisano do ${next.displayName}.`
  }

  if (previous && !next) {
    return `Zdjeto przypisanie z ${previous.displayName}.`
  }

  if (previous && next) {
    return `Zmieniono przypisanie z ${previous.displayName} na ${next.displayName}.`
  }

  return 'Zaktualizowano przypisanie sprawy.'
}
