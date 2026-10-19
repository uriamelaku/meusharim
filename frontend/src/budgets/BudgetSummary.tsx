import { AlertTriangle } from 'lucide-react'
import { ProgressBar } from '@/components/ProgressBar'
import { tr } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { BudgetMonth } from './api'
import { remainingText, STATUS_TEXT, toneOf } from './usage'

/** The month's overall budget: spent, left, a bar, and planned spending kept apart. */
export function BudgetSummary({ budget }: { budget: BudgetMonth }) {
  const { effective_budget, actual, planned, remaining, percent, status } = budget
  const { total_budget, allocated, unallocated } = budget
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <p className="text-sm text-muted-foreground">
            {tr({ he: 'שולם עד עכשיו', en: 'Paid so far' })}
          </p>
          <p className="font-heading text-3xl font-semibold tabular-nums">{formatMoney(actual)}</p>
        </div>
        {effective_budget && (
          <p className="text-sm text-muted-foreground">
            {tr({ he: 'מתוך', en: 'of' })}{' '}
            <span className="font-medium text-foreground">{formatMoney(effective_budget)}</span>
          </p>
        )}
      </div>
      {effective_budget && percent !== null && (
        <>
          <ProgressBar
            percent={percent}
            tone={toneOf(status)}
            label={tr({
              he: `נוצלו ${percent}% מהתקציב החודשי`,
              en: `${percent}% of the monthly budget used`,
            })}
            className="h-3"
          />
          <div className="flex items-center justify-between gap-2 text-sm">
            <span
              className={cn(
                'flex items-center gap-1.5',
                status === 'over' ? 'font-medium text-destructive' : 'text-muted-foreground',
                status === 'near' && 'text-accent-foreground',
              )}
            >
              {status && status !== 'ok' && <AlertTriangle className="size-4" aria-hidden />}
              {status && status !== 'ok' && `${STATUS_TEXT[status]} · `}
              {remaining && remainingText(remaining)}
            </span>
            <span className="text-muted-foreground tabular-nums">{percent}%</span>
          </div>
        </>
      )}
      {total_budget && unallocated && (
        <p className="text-sm text-muted-foreground">
          {tr({ he: 'מתוך התקציב הכולל: ', en: 'Of the total budget: ' })}
          <span className="tabular-nums">{formatMoney(allocated)}</span>
          {tr({ he: ' מתוכנן לפי קטגוריות · ', en: ' planned by category · ' })}
          <span className="tabular-nums">{formatMoney(unallocated)}</span>
          {tr({ he: ' שארית', en: ' unallocated' })}
        </p>
      )}
      {planned !== '0.00' && (
        <p className="rounded-xl border border-dashed border-brass/60 px-3 py-2 text-sm text-accent-foreground">
          {tr({
            he: `ועוד ${formatMoney(planned)} החודש שעוד לא שולמו`,
            en: `Plus ${formatMoney(planned)} this month not paid yet`,
          })}
        </p>
      )}
    </div>
  )
}
