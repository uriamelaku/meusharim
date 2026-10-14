import { type Period, parsePeriodParam, shiftMonths, toPeriodParam } from '@/lib/period'

export const MAX_RANGE_MONTHS = 60

export type RangePreset = '6m' | '12m' | 'year' | 'custom'

export type MonthRange = { from: Period; to: Period }

export function monthsBetween(range: MonthRange): number {
  return (range.to.year - range.from.year) * 12 + range.to.month - range.from.month + 1
}

/** A preset range that ends with the current month (or the current calendar year). */
export function presetRange(preset: Exclude<RangePreset, 'custom'>, today: Period): MonthRange {
  if (preset === 'year')
    return { from: { year: today.year, month: 1 }, to: { year: today.year, month: 12 } }
  const length = preset === '6m' ? 6 : 12
  return { from: shiftMonths(today, -(length - 1)), to: today }
}

/** Reads ?from=YYYY-MM&to=YYYY-MM, or null if missing or not a valid range. */
export function parseRange(from: string | null, to: string | null): MonthRange | null {
  const start = parsePeriodParam(from)
  const end = parsePeriodParam(to)
  if (!start || !end) return null
  const range = { from: start, to: end }
  const length = monthsBetween(range)
  return length >= 1 && length <= MAX_RANGE_MONTHS ? range : null
}

export function rangeParams(range: MonthRange): { from: string; to: string } {
  return { from: toPeriodParam(range.from), to: toPeriodParam(range.to) }
}

/** Which preset a range matches, for highlighting the preset buttons. */
export function presetOf(range: MonthRange, today: Period): RangePreset {
  for (const preset of ['6m', '12m', 'year'] as const) {
    const candidate = rangeParams(presetRange(preset, today))
    const current = rangeParams(range)
    if (candidate.from === current.from && candidate.to === current.to) return preset
  }
  return 'custom'
}
