import type {
  PortingRequestAssigneeSummaryDto,
  PortingRequestAssignmentHistoryItemDto,
  PortingRequestListItemDto,
  UserRole,
} from '@np-manager/shared'

export type OwnershipFilter = 'ALL' | 'MINE' | 'UNASSIGNED'

export function parseOwnershipFilter(value: string | null): OwnershipFilter {
  if (value === 'MINE' || value === 'UNASSIGNED') {
    return value
  }

  return 'ALL'
}

export function filterPortingRequestsByOwnership(
  items: PortingRequestListItemDto[],
  ownershipFilter: OwnershipFilter,
  currentUserId: string | null | undefined,
): PortingRequestListItemDto[] {
  if (ownershipFilter === 'MINE') {
    if (!currentUserId) {
      return []
    }

    return items.filter((item) => item.assignedUserSummary?.id === currentUserId)
  }

  if (ownershipFilter === 'UNASSIGNED') {
    return items.filter((item) => item.assignedUserSummary === null)
  }

  return items
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
