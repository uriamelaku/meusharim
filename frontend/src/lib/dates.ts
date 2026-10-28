import { locale, tr } from './i18n'
import type { Period } from './period'

const TIME_ZONE = 'Asia/Jerusalem'

/** The range of dates the server accepts (same as its LedgerDate). */
export const MIN_DATE = '1900-01-01'
export const MAX_DATE = '2100-12-31'

/**
 * Whether a date input's value is a real calendar day the server accepts. Browsers
 * report an empty string for a missing or half-typed date.
 */
export function isValidDate(iso: string): boolean {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match || iso < MIN_DATE || iso > MAX_DATE) return false
  const [year, month, day] = match.slice(1).map(Number)
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
}

/** Error text for a date field, or undefined when the value is fine. */
export function dateError(iso: string, { required }: { required: boolean }): string | undefined {
  if (iso === '') {
    return required ? tr({ he: 'צריך לבחור תאריך.', en: 'Please choose a date.' }) : undefined
  }
  if (!isValidDate(iso)) {
    return tr({
      he: 'התאריך לא תקין (בין 1900 ל-2100).',
      en: 'This date is invalid (between 1900 and 2100).',
    })
  }
  return undefined
}

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

const dayFormatter = new Intl.DateTimeFormat(locale, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const shortFormatter = new Intl.DateTimeFormat(locale, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const fullFormatter = new Intl.DateTimeFormat(locale, {
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

const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })

function addDays(iso: string, days: number): string {
  const date = isoToDate(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * A day the way people say it: "היום", "אתמול", "מחר", or "יום ה׳ 16.10"
 * (with the year when it is not this year: "יום ה׳ 16.10.2025"). In English:
 * "Today", "Yesterday", "Tomorrow", "Thu 16/10".
 */
export function formatRelativeDay(iso: string, today: string = todayIso()): string {
  if (iso === today) return tr({ he: 'היום', en: 'Today' })
  if (iso === addDays(today, -1)) return tr({ he: 'אתמול', en: 'Yesterday' })
  if (iso === addDays(today, 1)) return tr({ he: 'מחר', en: 'Tomorrow' })
  const [year, month, day] = iso.split('-')
  const separator = tr({ he: '.', en: '/' })
  const thisYear = year === today.slice(0, 4)
  const date = [Number(day), Number(month), ...(thisYear ? [] : [year])].join(separator)
  return `${weekdayFormatter.format(isoToDate(iso))} ${date}`
}
