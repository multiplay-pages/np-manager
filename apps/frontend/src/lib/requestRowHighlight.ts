import type { PortingRequestListItemDto } from '@np-manager/shared'
import { calculateDaysDiff } from './portingUrgency'

export type RowHighlight = 'ported' | 'overdue' | 'today' | 'upcoming' | 'closed' | 'none'

/**
 * Zwraca token podświetlenia wiersza na podstawie statusu i daty przeniesienia.
 *
 * Priorytet: PORTED > CANCELLED/REJECTED > overdue > dziś > jutro/pojutrze > brak stylu
 */
export function getRequestRowHighlight(
  request: Pick<PortingRequestListItemDto, 'statusInternal' | 'confirmedPortDate'>,
  now: Date = new Date(),
): RowHighlight {
  const { statusInternal, confirmedPortDate } = request

  if (statusInternal === 'PORTED') return 'ported'
  if (statusInternal === 'CANCELLED' || statusInternal === 'REJECTED') return 'closed'

  const daysDiff = calculateDaysDiff(confirmedPortDate, now)
  if (daysDiff === null) return 'none'
  if (daysDiff < 0) return 'overdue'
  if (daysDiff === 0) return 'today'
  if (daysDiff <= 2) return 'upcoming'

  return 'none'
}

export function rowHighlightClasses(highlight: RowHighlight): string {
  switch (highlight) {
    case 'ported':
      return 'bg-sky-50'
    case 'overdue':
      return 'bg-red-50'
    case 'today':
      return 'bg-green-50'
    case 'upcoming':
      return 'bg-emerald-50/70'
    case 'closed':
      return 'bg-gray-50/50'
    case 'none':
      return ''
  }
}
