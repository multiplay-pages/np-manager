import type { PortingRequestListItemDto } from '@np-manager/shared'
import { calculateDaysDiff } from './portingUrgency'

export type RowHighlight = 'ported' | 'error' | 'overdue' | 'today' | 'tomorrow' | 'closed' | 'none'

/**
 * Zwraca token podswietlenia wiersza na podstawie statusu i daty przeniesienia.
 *
 * Priorytet: PORTED > ERROR > CANCELLED/REJECTED > overdue > dzis > jutro > brak stylu.
 */
export function getRequestRowHighlight(
  request: Pick<PortingRequestListItemDto, 'statusInternal' | 'confirmedPortDate'>,
  now: Date = new Date(),
): RowHighlight {
  const { statusInternal, confirmedPortDate } = request

  if (statusInternal === 'PORTED') return 'ported'
  if (statusInternal === 'ERROR') return 'error'
  if (statusInternal === 'CANCELLED' || statusInternal === 'REJECTED') return 'closed'

  const daysDiff = calculateDaysDiff(confirmedPortDate, now)
  if (daysDiff === null) return 'none'
  if (daysDiff < 0) return 'overdue'
  if (daysDiff === 0) return 'today'
  if (daysDiff === 1) return 'tomorrow'

  return 'none'
}

export function rowHighlightClasses(highlight: RowHighlight): string {
  switch (highlight) {
    case 'ported':
      return 'bg-sky-50'
    case 'error':
      return 'bg-red-100'
    case 'overdue':
      return 'bg-red-50'
    case 'today':
      return 'bg-blue-50'
    case 'tomorrow':
      return 'bg-yellow-50'
    case 'closed':
      return 'bg-gray-50/50'
    case 'none':
      return ''
  }
}
