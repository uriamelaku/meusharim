import { describe, expect, it } from 'vitest'
import { formatRelativeDay, isInPeriod, periodRange, todayIso } from './dates'

describe('todayIso', () => {
  it('uses the Israeli calendar day', () => {
    // 22:30 UTC on Dec 31 is already Jan 1 in Israel (UTC+2).
    expect(todayIso(new Date('2026-12-31T22:30:00Z'))).toBe('2027-01-01')
    expect(todayIso(new Date('2026-10-14T09:00:00Z'))).toBe('2026-10-14')
  })
})

describe('periodRange', () => {
  it.each([
    [{ year: 2026, month: 2 }, '2026-02-01', '2026-02-28'],
    [{ year: 2028, month: 2 }, '2028-02-01', '2028-02-29'],
    [{ year: 2026, month: 12 }, '2026-12-01', '2026-12-31'],
    [{ year: 2026, month: 4 }, '2026-04-01', '2026-04-30'],
  ])('%o → %s..%s', (period, from, to) => {
    expect(periodRange(period)).toEqual({ from, to })
  })
})

describe('isInPeriod', () => {
  it('matches only the same year and month', () => {
    expect(isInPeriod('2026-10-31', { year: 2026, month: 10 })).toBe(true)
    expect(isInPeriod('2026-11-01', { year: 2026, month: 10 })).toBe(false)
    expect(isInPeriod('2025-10-15', { year: 2026, month: 10 })).toBe(false)
  })
})

describe('formatRelativeDay', () => {
  const today = '2026-10-18' // a Sunday
  it('names today, yesterday and tomorrow', () => {
    expect(formatRelativeDay('2026-10-18', today)).toBe('היום')
    expect(formatRelativeDay('2026-10-17', today)).toBe('אתמול')
    expect(formatRelativeDay('2026-10-19', today)).toBe('מחר')
  })

  it('shows the weekday and date, with the year only for other years', () => {
    expect(formatRelativeDay('2026-10-15', today)).toBe('יום ה׳ 15.10')
    expect(formatRelativeDay('2025-12-31', today)).toBe('יום ד׳ 31.12.2025')
  })

  it('crosses month and year boundaries', () => {
    expect(formatRelativeDay('2026-12-31', '2027-01-01')).toBe('אתמול')
  })
})
