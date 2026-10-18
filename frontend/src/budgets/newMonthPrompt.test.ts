import { describe, expect, it } from 'vitest'
import { shouldOfferBudgetCopy } from './newMonthPrompt'

const empty = { effective_budget: null, previous_month_has_budget: true }

describe('shouldOfferBudgetCopy', () => {
  it('offers when the current month has no budget and last month had one', () => {
    expect(shouldOfferBudgetCopy(empty, true, false)).toBe(true)
  })

  it('does not offer once this month has a budget', () => {
    expect(shouldOfferBudgetCopy({ ...empty, effective_budget: '9000.00' }, true, false)).toBe(false)
  })

  it('does not offer without a budget last month, for other months, or after "not now"', () => {
    expect(shouldOfferBudgetCopy({ ...empty, previous_month_has_budget: false }, true, false)).toBe(
      false,
    )
    expect(shouldOfferBudgetCopy(empty, false, false)).toBe(false)
    expect(shouldOfferBudgetCopy(empty, true, true)).toBe(false)
  })
})
