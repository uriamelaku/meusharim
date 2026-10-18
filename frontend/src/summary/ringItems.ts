import type { CategoryBudget } from '@/budgets/api'
import type { Category } from '@/categories/api'

type RingCategory = Pick<Category, 'id' | 'name' | 'color' | 'icon'>

export type RingItem = {
  category: RingCategory
  /** Completed spending this month, from the server. */
  actual: string
  /** Share of the category's budget used, or null without a budget. */
  percent: number | null
  over: boolean
}

/**
 * Every active expense category, with this month's spending and budget use, biggest
 * spending first. Categories deleted since still appear while they have spending.
 */
export function ringItems(categories: Category[], budgetRows: CategoryBudget[]): RingItem[] {
  const rows = new Map(budgetRows.map((row) => [row.category.id, row]))
  const shown = new Map<string, RingCategory>()
  for (const category of categories) {
    if (category.kind === 'expense' && !category.archived) shown.set(category.id, category)
  }
  for (const row of budgetRows) {
    if (!shown.has(row.category.id) && row.actual !== '0.00') shown.set(row.category.id, row.category)
  }
  return [...shown.values()]
    .map((category) => {
      const row = rows.get(category.id)
      return {
        category,
        actual: row?.actual ?? '0.00',
        percent: row?.percent ?? null,
        over: row?.status === 'over',
      }
    })
    .sort((a, b) => Number(b.actual) - Number(a.actual) || a.category.name.localeCompare(b.category.name, 'he'))
}
