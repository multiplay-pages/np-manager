import type { PortingCaseStatus } from './constants'

export type PortingUrgencyLevel =
  | 'NONE'
  | 'OVERDUE'
  | 'TODAY'
  | 'TOMORROW'
  | 'THIS_WEEK'
  | 'LATER'

export interface PortingUrgencyDateBoundaries {
  todayYmd: string
  tomorrowYmd: string
  weekEndYmd: string
  nextIsoWeekStartYmd: string
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
    const check = new Date(Date.UTC(y, m - 1, d))

    if (
      check.getUTCFullYear() !== y ||
      check.getUTCMonth() + 1 !== m ||
      check.getUTCDate() !== d
    ) {
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

function utcDayToYmd(dayMs: number): string {
  return new Date(dayMs).toISOString().slice(0, 10)
}

function startOfIsoWeekMs(dayMs: number): number {
  const dow = new Date(dayMs).getUTCDay()
  const offsetToMonday = dow === 0 ? 6 : dow - 1
  return dayMs - offsetToMonday * DAY_MS
}

export function getPortingUrgencyDateBoundaries(
  now: Date = new Date(),
): PortingUrgencyDateBoundaries {
  const todayMs = ymdToUtcDay(toWarsawYmd(now))
  const weekStartMs = startOfIsoWeekMs(todayMs)

  return {
    todayYmd: utcDayToYmd(todayMs),
    tomorrowYmd: utcDayToYmd(todayMs + DAY_MS),
    weekEndYmd: utcDayToYmd(weekStartMs + 6 * DAY_MS),
    nextIsoWeekStartYmd: utcDayToYmd(weekStartMs + 7 * DAY_MS),
  }
}

export function calculatePortingDaysDiff(
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

export function getPortingUrgencyLevel(
  portDateIso: string | null | undefined,
  now: Date = new Date(),
): PortingUrgencyLevel {
  const daysDiff = calculatePortingDaysDiff(portDateIso, now)

  if (daysDiff === null) {
    return 'NONE'
  }

  if (daysDiff < 0) {
    return 'OVERDUE'
  }

  if (daysDiff === 0) {
    return 'TODAY'
  }

  if (daysDiff === 1) {
    return 'TOMORROW'
  }

  const { weekEndYmd } = getPortingUrgencyDateBoundaries(now)
  const target = parseIsoToWarsawYmd(portDateIso ?? '')

  if (target && ymdToUtcDay(target) <= ymdToUtcDay(weekEndYmd)) {
    return 'THIS_WEEK'
  }

  return 'LATER'
}

// ============================================================
// WORK PRIORITY (PR50B)
// ============================================================
// Kolejnosc, w jakiej operator powinien pracowac nad sprawami.
// Reuzywa shared semantyki urgency; NO_DATE jest miedzy THIS_WEEK
// a pozniejszymi sprawami LATER.

export type PortingWorkPriorityBucket =
  | 'ERROR'
  | 'OVERDUE'
  | 'TODAY'
  | 'TOMORROW'
  | 'THIS_WEEK'
  | 'NO_DATE'
  | 'LATER'

export const PORTING_WORK_PRIORITY_ORDER: Record<PortingWorkPriorityBucket, number> = {
  ERROR: 1,
  OVERDUE: 2,
  TODAY: 3,
  TOMORROW: 4,
  THIS_WEEK: 5,
  NO_DATE: 6,
  LATER: 7,
}

export function getPortingWorkPriorityBucket(
  portDateIso: string | null | undefined,
  now: Date = new Date(),
  statusInternal?: PortingCaseStatus | null,
): PortingWorkPriorityBucket {
  if (statusInternal === 'ERROR') return 'ERROR'

  const level = getPortingUrgencyLevel(portDateIso, now)
  if (level === 'NONE') return 'NO_DATE'
  if (level === 'LATER') return 'LATER'
  return level
}

export function getPortingWorkPriorityRank(
  portDateIso: string | null | undefined,
  now: Date = new Date(),
  statusInternal?: PortingCaseStatus | null,
): number {
  return PORTING_WORK_PRIORITY_ORDER[getPortingWorkPriorityBucket(portDateIso, now, statusInternal)]
}
