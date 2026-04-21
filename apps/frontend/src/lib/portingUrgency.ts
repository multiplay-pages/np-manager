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
    if (!match) return null
    const y = Number(match[1])
    const m = Number(match[2])
    const d = Number(match[3])
    // Round-trip: Date.UTC normalizes overflow (e.g. month 13, day 40, Feb 31)
    // so if the reconstructed date differs the input is invalid.
    const check = new Date(Date.UTC(y, m - 1, d))
    if (check.getUTCFullYear() !== y || check.getUTCMonth() + 1 !== m || check.getUTCDate() !== d) {
      return null
    }
    return `${match[1]}-${match[2]}-${match[3]}`
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

// Returns UTC ms for Monday of the ISO week containing the given day (Mon-Sun weeks).
function startOfIsoWeekMs(dayMs: number): number {
  const dow = new Date(dayMs).getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const offsetToMonday = dow === 0 ? 6 : dow - 1
  return dayMs - offsetToMonday * DAY_MS
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
  if (!portDateIso) {
    return { level: 'NONE', label: 'Brak daty', tone: 'neutral', emphasized: false, daysDiff: null }
  }

  const target = parseIsoToWarsawYmd(portDateIso)
  if (!target) {
    return { level: 'NONE', label: 'Brak daty', tone: 'neutral', emphasized: false, daysDiff: null }
  }

  const todayMs = ymdToUtcDay(toWarsawYmd(now))
  const targetMs = ymdToUtcDay(target)
  const diff = Math.round((targetMs - todayMs) / DAY_MS)

  if (diff < 0) {
    const absDays = Math.abs(diff)
    const suffix = absDays === 1 ? 'dzień' : 'dni'
    return { level: 'OVERDUE', label: `Po terminie (${absDays} ${suffix})`, tone: 'red', emphasized: true, daysDiff: diff }
  }

  if (diff === 0) {
    return { level: 'TODAY', label: 'Dziś', tone: 'red', emphasized: true, daysDiff: diff }
  }

  if (diff === 1) {
    return { level: 'TOMORROW', label: 'Jutro', tone: 'amber', emphasized: false, daysDiff: diff }
  }

  // THIS_WEEK: same ISO calendar week (Mon–Sun) as today, but after tomorrow
  const weekEnd = startOfIsoWeekMs(todayMs) + 6 * DAY_MS
  if (targetMs <= weekEnd) {
    return { level: 'THIS_WEEK', label: 'W tym tygodniu', tone: 'amber', emphasized: false, daysDiff: diff }
  }

  return { level: 'LATER', label: 'Później', tone: 'neutral', emphasized: false, daysDiff: diff }
}
