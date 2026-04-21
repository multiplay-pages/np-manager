import type { BadgeTone } from '@/components/ui'

export type PortingUrgencyLevel =
  | 'NONE'
  | 'OVERDUE'
  | 'TODAY'
  | 'TOMORROW'
  | 'THIS_WEEK'
  | 'LATER'

export interface PortingUrgency {
  level: PortingUrgencyLevel
  label: string
  tone: BadgeTone
  emphasized: boolean
  daysDiff: number | null
}

const WARSAW_TZ = 'Europe/Warsaw'
const DAY_MS = 24 * 60 * 60 * 1000

function toWarsawYmd(value: Date): string {
  return value.toLocaleDateString('en-CA', {
    timeZone: WARSAW_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function parseIsoToWarsawYmd(iso: string): string | null {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null
  }
  return toWarsawYmd(parsed)
}

function ymdToUtcDay(ymd: string): number {
  const parts = ymd.split('-').map(Number)
  const y = parts[0] ?? 0
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  return Date.UTC(y, m - 1, d)
}

export function calculateDaysDiff(
  portDateIso: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!portDateIso) return null
  const target = parseIsoToWarsawYmd(portDateIso)
  if (!target) return null
  const today = toWarsawYmd(now)
  const diff = ymdToUtcDay(target) - ymdToUtcDay(today)
  return Math.round(diff / DAY_MS)
}

export function getPortingUrgency(
  portDateIso: string | null | undefined,
  now: Date = new Date(),
): PortingUrgency {
  const diff = calculateDaysDiff(portDateIso, now)

  if (diff === null) {
    return {
      level: 'NONE',
      label: 'Brak daty',
      tone: 'neutral',
      emphasized: false,
      daysDiff: null,
    }
  }

  if (diff < 0) {
    const absDays = Math.abs(diff)
    const suffix = absDays === 1 ? 'dzień' : 'dni'
    return {
      level: 'OVERDUE',
      label: `Po terminie (${absDays} ${suffix})`,
      tone: 'red',
      emphasized: true,
      daysDiff: diff,
    }
  }

  if (diff === 0) {
    return {
      level: 'TODAY',
      label: 'Dziś',
      tone: 'red',
      emphasized: true,
      daysDiff: diff,
    }
  }

  if (diff === 1) {
    return {
      level: 'TOMORROW',
      label: 'Jutro',
      tone: 'amber',
      emphasized: false,
      daysDiff: diff,
    }
  }

  if (diff <= 7) {
    return {
      level: 'THIS_WEEK',
      label: 'W tym tygodniu',
      tone: 'amber',
      emphasized: false,
      daysDiff: diff,
    }
  }

  return {
    level: 'LATER',
    label: 'Później',
    tone: 'neutral',
    emphasized: false,
    daysDiff: diff,
  }
}
