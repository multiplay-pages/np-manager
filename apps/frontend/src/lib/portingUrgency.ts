import type { BadgeTone } from '@/components/ui'
import {
  calculatePortingDaysDiff,
  getPortingUrgencyLevel,
  getPortingWorkPriorityBucket,
  type PortingCaseStatus,
  type PortingUrgencyLevel,
  type PortingWorkPriorityBucket,
} from '@np-manager/shared'

export type { PortingUrgencyLevel, PortingWorkPriorityBucket }

const CLOSED_PORTING_STATUSES: PortingCaseStatus[] = ['PORTED', 'CANCELLED', 'REJECTED']

export interface PortingUrgency {
  level: PortingUrgencyLevel
  label: string
  tone: BadgeTone
  emphasized: boolean
  daysDiff: number | null
}

export function isClosedPortingStatus(status: PortingCaseStatus | null | undefined): boolean {
  return status ? CLOSED_PORTING_STATUSES.includes(status) : false
}

export function calculateDaysDiff(
  portDateIso: string | null | undefined,
  now: Date = new Date(),
): number | null {
  return calculatePortingDaysDiff(portDateIso, now)
}

export interface WorkPriorityBadge {
  bucket: PortingWorkPriorityBucket
  label: string
  tone: BadgeTone
  emphasized: boolean
}

export function getWorkPriorityBadge(
  portDateIso: string | null | undefined,
  now: Date = new Date(),
): WorkPriorityBadge | null {
  const bucket = getPortingWorkPriorityBucket(portDateIso, now)

  if (bucket === 'LATER') return null

  if (bucket === 'ERROR') {
    return { bucket, label: 'Wymaga interwencji', tone: 'red', emphasized: true }
  }

  if (bucket === 'OVERDUE') {
    const daysDiff = calculatePortingDaysDiff(portDateIso, now)
    const days = Math.abs(daysDiff ?? 0)
    const suffix = days === 1 ? 'dzien' : 'dni'
    return { bucket, label: `Po terminie (${days} ${suffix})`, tone: 'red', emphasized: true }
  }

  const config: Record<
    Exclude<PortingWorkPriorityBucket, 'ERROR' | 'OVERDUE' | 'LATER'>,
    WorkPriorityBadge
  > = {
    TODAY: { bucket: 'TODAY', label: 'Dzis', tone: 'red', emphasized: true },
    TOMORROW: { bucket: 'TOMORROW', label: 'Jutro', tone: 'amber', emphasized: false },
    THIS_WEEK: { bucket: 'THIS_WEEK', label: 'W tym tygodniu', tone: 'amber', emphasized: false },
    NO_DATE: { bucket: 'NO_DATE', label: 'Bez daty', tone: 'neutral', emphasized: false },
  }

  return config[bucket]
}

export function getStatusAwareWorkPriorityBadge(
  portDateIso: string | null | undefined,
  status: PortingCaseStatus | null | undefined,
  now: Date = new Date(),
): WorkPriorityBadge | null {
  if (isClosedPortingStatus(status)) {
    return null
  }

  return getWorkPriorityBadge(portDateIso, now)
}

export function getPortingUrgency(
  portDateIso: string | null | undefined,
  now: Date = new Date(),
): PortingUrgency {
  const level = getPortingUrgencyLevel(portDateIso, now)
  const daysDiff = calculatePortingDaysDiff(portDateIso, now)

  if (level === 'OVERDUE') {
    const overdueDays = Math.abs(daysDiff ?? 0)
    const suffix = overdueDays === 1 ? 'dzien' : 'dni'

    return {
      level,
      label: `Po terminie (${overdueDays} ${suffix})`,
      tone: 'red',
      emphasized: true,
      daysDiff,
    }
  }

  const configByLevel: Record<
    Exclude<PortingUrgencyLevel, 'OVERDUE'>,
    { label: string; tone: BadgeTone; emphasized: boolean }
  > = {
    NONE: { label: 'Brak daty', tone: 'neutral', emphasized: false },
    TODAY: { label: 'Dzis', tone: 'red', emphasized: true },
    TOMORROW: { label: 'Jutro', tone: 'amber', emphasized: false },
    THIS_WEEK: { label: 'W tym tygodniu', tone: 'amber', emphasized: false },
    LATER: { label: 'Pozniej', tone: 'neutral', emphasized: false },
  }

  const config = configByLevel[level]

  return {
    level,
    label: config.label,
    tone: config.tone,
    emphasized: config.emphasized,
    daysDiff,
  }
}

export function getStatusAwarePortingUrgency(
  portDateIso: string | null | undefined,
  status: PortingCaseStatus | null | undefined,
  now: Date = new Date(),
): PortingUrgency {
  const urgency = getPortingUrgency(portDateIso, now)

  if (isClosedPortingStatus(status) && urgency.level === 'OVERDUE') {
    return {
      ...urgency,
      level: 'LATER',
      label: 'Zakonczona',
      tone: 'emerald',
      emphasized: false,
    }
  }

  return urgency
}
