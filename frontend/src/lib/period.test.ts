import { describe, expect, it } from 'vitest'
import {
  currentPeriod,
  formatPeriod,
  monthName,
  parsePeriodParam,
  shiftMonths,
  toPeriodParam,
  yearPageStart,
} from './period'

describe('currentPeriod', () => {
  it('uses the Israel time zone, not UTC', () => {
    // 22:30 UTC on Oct 31 is already Nov 1 in Israel (UTC+2 in winter).
    expect(currentPeriod(new Date('2026-10-31T22:30:00Z'))).toEqual({ year: 2026, month: 11 })
    // 21:30 UTC on Dec 31 is 23:30 in Israel: still December.
    expect(currentPeriod(new Date('2026-12-31T21:30:00Z'))).toEqual({ year: 2026, month: 12 })
    expect(currentPeriod(new Date('2026-12-31T22:30:00Z'))).toEqual({ year: 2027, month: 1 })
  })
})

describe('shiftMonths', () => {
  it.each([
    [{ year: 2026, month: 10 }, 1, { year: 2026, month: 11 }],
    [{ year: 2026, month: 12 }, 1, { year: 2027, month: 1 }],
    [{ year: 2026, month: 1 }, -1, { year: 2025, month: 12 }],
    [{ year: 2026, month: 5 }, -17, { year: 2024, month: 12 }],
    [{ year: 2026, month: 5 }, 24, { year: 2028, month: 5 }],
  ])('%o shifted by %i is %o', (period, delta, expected) => {
    expect(shiftMonths(period, delta)).toEqual(expected)
  })
})

describe('period URL parameter', () => {
  it('round-trips', () => {
    expect(toPeriodParam({ year: 2026, month: 3 })).toBe('2026-03')
    expect(parsePeriodParam('2026-03')).toEqual({ year: 2026, month: 3 })
    expect(parsePeriodParam('1999-12')).toEqual({ year: 1999, month: 12 })
  })

  it.each([null, '', '2026-13', '2026-00', '2026-1', '26-01', 'abc', '1800-01', '2026-03x'])(
    'rejects %o',
    (value) => {
      expect(parsePeriodParam(value)).toBeNull()
    },
  )
})

describe('yearPageStart', () => {
  it('groups years into pages of 12', () => {
    expect(yearPageStart(2026)).toBe(2016)
    expect(yearPageStart(2016)).toBe(2016)
    expect(yearPageStart(2027)).toBe(2016)
    expect(yearPageStart(2028)).toBe(2028)
  })
})

describe('Hebrew formatting', () => {
  it('formats month and year', () => {
    expect(formatPeriod({ year: 2026, month: 10 })).toBe('אוקטובר 2026')
    expect(monthName(1)).toBe('ינואר')
    expect(monthName(12)).toBe('דצמבר')
  })
})
