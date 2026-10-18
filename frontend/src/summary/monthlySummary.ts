const DISMISSED_PREFIX = 'meusharim-month-summary-dismissed:'

/** How long into a month the summary of the previous month stays on the main screen. */
export const SUMMARY_DAYS = 7

export function shouldShowMonthlySummary(
  dayOfMonth: number,
  isCurrentMonth: boolean,
  dismissed: boolean,
): boolean {
  return isCurrentMonth && dayOfMonth <= SUMMARY_DAYS && !dismissed
}

export function isSummaryDismissed(month: string): boolean {
  try {
    return localStorage.getItem(DISMISSED_PREFIX + month) === '1'
  } catch {
    return false
  }
}

export function dismissSummary(month: string) {
  try {
    localStorage.setItem(DISMISSED_PREFIX + month, '1')
  } catch {
    // Not remembered; it hides for now and may show again on the next visit.
  }
}
