import { AlertTriangle } from 'lucide-react'
import { CategoryIconBadge } from '@/categories/CategoryBadge'
import { ProgressBar } from '@/components/ProgressBar'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { CategoryBudget } from './api'
import { remainingText, toneOf } from './usage'

/** One category: spent vs budget, a bar, what is left, and planned spending apart. */
export function CategoryBudgetRow({ item }: { item: CategoryBudget }) {
  const { category, budget, actual, planned, remaining, percent, status } = item
  const hasPlanned = planned !== '0.00'
  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-3">
        <CategoryIconBadge color={category.color} icon={category.icon} className="size-9" />
        <span className="min-w-0 flex-1 truncate font-medium">{category.name}</span>
        <span className="shrink-0 text-sm tabular-nums">
          <span className="font-semibold">{formatMoney(actual)}</span>
          {budget && <span className="text-muted-foreground"> / {formatMoney(budget)}</span>}
        </span>
      </div>
      {budget && percent !== null && (
        <>
          <ProgressBar
            percent={percent}
            tone={toneOf(status)}
            label={`${category.name}: נוצלו ${percent}% מהתקציב`}
          />
          <div className="flex items-center justify-between gap-2 text-sm">
            <span
              className={cn(
                'flex items-center gap-1',
                status === 'over' && 'font-medium text-destructive',
                status === 'near' && 'text-accent-foreground',
                status === 'ok' && 'text-muted-foreground',
              )}
            >
              {status !== 'ok' && <AlertTriangle className="size-3.5" aria-hidden />}
              {remaining && remainingText(remaining)}
            </span>
            <span className="text-muted-foreground tabular-nums">{percent}%</span>
          </div>
        </>
      )}
      {hasPlanned && (
        <p className="text-sm text-muted-foreground">ועוד {formatMoney(planned)} שעוד לא שולם</p>
      )}
    </div>
  )
}
