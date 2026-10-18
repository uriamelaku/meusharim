import type { BudgetMonth } from './api'

const DISMISSED_PREFIX = 'meusharim-budget-copy-dismissed:'

/**
 * Offer to copy last month's budget when the current month has none yet and last
 * month had one, unless it was already declined for this month on this device.
 */
export function shouldOfferBudgetCopy(
  budget: Pick<BudgetMonth, 'effective_budget' | 'previous_month_has_budget'>,
  isCurrentMonth: boolean,
  dismissed: boolean,
): boolean {
  return (
    isCurrentMonth && !dismissed && budget.previous_month_has_budget && budget.effective_budget === null
  )
}

export function isBudgetCopyDismissed(month: string): boolean {
  try {
    return localStorage.getItem(DISMISSED_PREFIX + month) === '1'
  } catch {
    return false
  }
}

export function dismissBudgetCopy(month: string) {
  try {
    localStorage.setItem(DISMISSED_PREFIX + month, '1')
  } catch {
    // Not remembered on this device; the prompt may show again next visit.
  }
}
