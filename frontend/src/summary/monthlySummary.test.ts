import { describe, expect, it } from 'vitest'
import { shouldShowMonthlySummary } from './monthlySummary'

describe('shouldShowMonthlySummary', () => {
  it('shows during the first week of the current month', () => {
    expect(shouldShowMonthlySummary(1, true, false)).toBe(true)
    expect(shouldShowMonthlySummary(7, true, false)).toBe(true)
  })

  it('hides later in the month, for other months, or once dismissed', () => {
    expect(shouldShowMonthlySummary(8, true, false)).toBe(false)
    expect(shouldShowMonthlySummary(3, false, false)).toBe(false)
    expect(shouldShowMonthlySummary(3, true, true)).toBe(false)
  })
})
