import { toast } from 'sonner'
import { useSession } from '@/auth/useAuth'
import { apiRequest } from '@/lib/api'
import { tr } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import type { BudgetMonth, CategoryBudget } from './api'

const SHOWN_PREFIX = 'meusharim-budget-alert:'

export type BudgetAlert = { key: string; level: 'near' | 'over'; message: string }

/**
 * The alert for a category after a new expense: near (80%+) or over its budget, each
 * at most once per category and month, so it informs without nagging.
 */
export function budgetAlertFor(
  month: string,
  row: CategoryBudget | undefined,
  alreadyShown: (key: string) => boolean,
): BudgetAlert | null {
  if (!row?.status || row.status === 'ok' || row.remaining === null) return null
  const key = `${month}:${row.category.id}:${row.status}`
  if (alreadyShown(key)) return null
  const name = row.category.name
  return row.status === 'over'
    ? {
        key,
        level: 'over',
        message: tr({
          he: `חרגתם מהתקציב של ${name} ב-${formatMoney(row.remaining.replace('-', ''))}`,
          en: `You're ${formatMoney(row.remaining.replace('-', ''))} over the ${name} budget`,
        }),
      }
    : {
        key,
        level: 'near',
        message: tr({
          he: `נוצלו ${row.percent}% מהתקציב של ${name}. נשארו ${formatMoney(row.remaining)}`,
          en: `${row.percent}% of the ${name} budget used. ${formatMoney(row.remaining)} left`,
        }),
      }
}

function wasShown(key: string): boolean {
  try {
    return localStorage.getItem(SHOWN_PREFIX + key) === '1'
  } catch {
    return false
  }
}

function markShown(key: string) {
  try {
    localStorage.setItem(SHOWN_PREFIX + key, '1')
  } catch {
    // Not remembered; the alert may show again, which is harmless.
  }
}

/** Checks a category's budget after an expense was saved and shows an alert if needed. */
export function useBudgetAlert() {
  const session = useSession()
  return async (occurredOn: string, categoryId: string) => {
    const month = occurredOn.slice(0, 7)
    try {
      const budget = await apiRequest<BudgetMonth>(
        `/api/budgets?month=${month}`,
        session.access_token,
      )
      const row = budget.categories.find((c) => c.category.id === categoryId)
      const alert = budgetAlertFor(month, row, wasShown)
      if (!alert) return
      markShown(alert.key)
      if (alert.level === 'over') toast.error(alert.message)
      else toast.warning(alert.message)
    } catch (error) {
      // The expense is saved; a missing alert is not worth an error message.
      console.error('Budget check failed', error)
    }
  }
}
