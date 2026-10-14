import { describe, expect, it } from 'vitest'
import { monthsBetween, parseRange, presetOf, presetRange, rangeParams } from './range'

const today = { year: 2026, month: 3 }

describe('presetRange', () => {
  it('ends with the current month and crosses years', () => {
    expect(rangeParams(presetRange('6m', today))).toEqual({ from: '2025-10', to: '2026-03' })
    expect(rangeParams(presetRange('12m', today))).toEqual({ from: '2025-04', to: '2026-03' })
  })

  it('covers the calendar year', () => {
    expect(rangeParams(presetRange('year', today))).toEqual({ from: '2026-01', to: '2026-12' })
  })
})

describe('parseRange', () => {
  it('accepts ranges of 1 to 60 months', () => {
    expect(parseRange('2026-03', '2026-03')).not.toBeNull()
    expect(monthsBetween(parseRange('2021-04', '2026-03')!)).toBe(60)
  })

  it.each([
    ['2026-04', '2026-03'],
    ['2021-03', '2026-03'],
    ['2026-13', '2026-12'],
    [null, '2026-03'],
  ])('rejects %s..%s', (from, to) => {
    expect(parseRange(from, to)).toBeNull()
  })
})

describe('presetOf', () => {
  it('recognizes presets and custom ranges', () => {
    expect(presetOf(presetRange('12m', today), today)).toBe('12m')
    expect(presetOf(parseRange('2024-01', '2024-06')!, today)).toBe('custom')
  })
})
