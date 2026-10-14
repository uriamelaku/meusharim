import type { Period } from './period'

const TIME_ZONE = 'Asia/Jerusalem'

/** Today's date in Israel as "YYYY-MM-DD". */
export function todayIso(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** First and last day of a month, as ISO dates. */
export function periodRange(period: Period): { from: string; to: string } {
  const prefix = `${period.year}-${pad(period.month)}`
  return { from: `${prefix}-01`, to: `${prefix}-${pad(daysInMonth(period.year, period.month))}` }
}

/** Whether an ISO date falls inside the month. */
export function isInPeriod(iso: string, period: Period): boolean {
  return iso.startsWith(`${period.year}-${pad(period.month)}-`)
}

// ISO dates are calendar days; format them at UTC noon so no time zone can shift the day.
function isoToDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`)
}

const dayFormatter = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const shortFormatter = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const fullFormatter = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "יום שני, 12 באוקטובר" */
export function formatDayHeading(iso: string): string {
  return dayFormatter.format(isoToDate(iso))
}

/** "12 באוק׳" */
export function formatShortDate(iso: string): string {
  return shortFormatter.format(isoToDate(iso))
}

/** "12 באוקטובר 2026" */
export function formatFullDate(iso: string): string {
  return fullFormatter.format(isoToDate(iso))
}
