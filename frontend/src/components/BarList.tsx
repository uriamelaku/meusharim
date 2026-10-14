import { CategoryIconBadge } from '@/categories/CategoryBadge'
import { categoryColor } from '@/categories/appearance'
import { formatMoney } from '@/lib/money'
import type { Transaction } from '@/transactions/api'

export type BarItem = {
  category: Transaction['category']
  /** Completed amount: the solid bar. */
  actual: string
  /** Planned amount: shown as a separate dashed extension, never merged into actual. */
  planned?: string
}

/**
 * Horizontal bars per category, scaled to the largest value. Bar widths are only a
 * visual ratio; every amount shown as text comes from the server unchanged.
 */
export function BarList({ items, label }: { items: BarItem[]; label: string }) {
  const max = Math.max(...items.map((item) => Number(item.actual) + Number(item.planned ?? 0)), 0)
  return (
    <ul aria-label={label} className="flex flex-col gap-3.5">
      {items.map(({ category, actual, planned }) => {
        const color = categoryColor(category.color)
        const actualWidth = max ? (Number(actual) / max) * 100 : 0
        const plannedWidth = max && planned ? (Number(planned) / max) * 100 : 0
        return (
          <li key={category.id} className="flex items-center gap-3">
            <CategoryIconBadge color={category.color} icon={category.icon} className="size-9" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{category.name}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-semibold">{formatMoney(actual)}</span>
                  {planned && planned !== '0.00' && (
                    <span className="text-muted-foreground"> + {formatMoney(planned)} מתוכנן</span>
                  )}
                </span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${actualWidth}%`, backgroundColor: color.solid }}
                />
                {plannedWidth > 0 && (
                  <div
                    className="h-full rounded-full border border-dashed"
                    style={{
                      width: `${plannedWidth}%`,
                      borderColor: color.solid,
                      backgroundColor: color.tint,
                    }}
                  />
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
