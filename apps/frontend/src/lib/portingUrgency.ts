import type { BadgeTone } from '@/components/ui'
import {
  calculatePortingDaysDiff,
  getPortingUrgencyLevel,
  getPortingWorkPriorityBucket,
  type PortingUrgencyLevel,
  type PortingWorkPriorityBucket,
} from '@np-manager/shared'

export type { PortingUrgencyLevel, PortingWorkPriorityBucket }

export interface PortingUrgency {
  level: PortingUrgencyLevel
  label: string
  tone: BadgeTone
  emphasized: boolean
  daysDiff: number | null
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

  if (bucket === 'OVERDUE') {
    const daysDiff = calculatePortingDaysDiff(portDateIso, now)
    const days = Math.abs(daysDiff ?? 0)
    const suffix = days === 1 ? 'dzien' : 'dni'
    return { bucket, label: `Po terminie (${days} ${suffix})`, tone: 'red', emphasized: true }
  }

  const config: Record<
    Exclude<PortingWorkPriorityBucket, 'OVERDUE' | 'LATER'>,
    WorkPriorityBadge
  > = {
    TODAY: { bucket: 'TODAY', label: 'Dzis', tone: 'red', emphasized: true },
    TOMORROW: { bucket: 'TOMORROW', label: 'Jutro', tone: 'amber', emphasized: false },
    THIS_WEEK: { bucket: 'THIS_WEEK', label: 'W tym tygodniu', tone: 'amber', emphasized: false },
    NO_DATE: { bucket: 'NO_DATE', label: 'Bez daty', tone: 'neutral', emphasized: false },
  }

  return config[bucket]
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
