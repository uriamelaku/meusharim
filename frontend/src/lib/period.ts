import { locale } from './i18n'

/** A calendar month in the household's time zone. `month` is 1–12. */
export type Period = { year: number; month: number }

const TIME_ZONE = 'Asia/Jerusalem'

// Sanity bounds for values coming from the URL; navigation is free inside them.
export const MIN_YEAR = 1900
export const MAX_YEAR = 2100

const MONTHS_IN_YEAR = 12
export const YEARS_PER_PAGE = 12

export function currentPeriod(now: Date = new Date()): Period {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now)
  const part = (type: 'year' | 'month') => Number(parts.find((p) => p.type === type)?.value)
  return { year: part('year'), month: part('month') }
}

export function shiftMonths(period: Period, delta: number): Period {
  const index = period.year * MONTHS_IN_YEAR + (period.month - 1) + delta
  return { year: Math.floor(index / MONTHS_IN_YEAR), month: (index % MONTHS_IN_YEAR) + 1 }
}

export function isSamePeriod(a: Period, b: Period): boolean {
  return a.year === b.year && a.month === b.month
}

export function isWithinBounds(period: Period): boolean {
  return period.year >= MIN_YEAR && period.year <= MAX_YEAR
}

/** "2026-10": the format used in the URL (?month=2026-10). */
export function toPeriodParam(period: Period): string {
  return `${period.year}-${String(period.month).padStart(2, '0')}`
}

export function parsePeriodParam(value: string | null): Period | null {
  const match = value?.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null
  const period = { year: Number(match[1]), month: Number(match[2]) }
  if (period.month < 1 || period.month > MONTHS_IN_YEAR || !isWithinBounds(period)) return null
  return period
}

/** First year of the 12-year page that contains `year` (e.g. 2026 → 2016). */
export function yearPageStart(year: number): number {
  return year - (year % YEARS_PER_PAGE)
}

// Formatting a fixed UTC date avoids any time zone shift of the month itself.
function monthDate(period: Period): Date {
  return new Date(Date.UTC(period.year, period.month - 1, 1))
}

export function formatPeriod(period: Period): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(monthDate(period))
}

export function monthName(month: number): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
    monthDate({ year: 2000, month }),
  )
}
