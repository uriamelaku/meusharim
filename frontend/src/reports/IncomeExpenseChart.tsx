import type { MonthRow } from './api'

const SHORT_MONTH = new Intl.DateTimeFormat('he-IL', { month: 'short', timeZone: 'UTC' })

function monthLabel(month: string): string {
  const [year, number] = month.split('-').map(Number)
  return SHORT_MONTH.format(new Date(Date.UTC(year, number - 1, 1)))
}

/** Bar height as a share of the tallest column; a visual ratio only. */
function height(amount: string, max: number): string {
  return `${max ? (Number(amount) / max) * 100 : 0}%`
}

type BarProps = { actual: string; planned: string; max: number; tone: 'income' | 'expense' }

function Bar({ actual, planned, max, tone }: BarProps) {
  const solid = tone === 'income' ? 'bg-income' : 'bg-expense'
  const dashed = tone === 'income' ? 'border-income' : 'border-expense'
  return (
    <div className="flex h-full w-full max-w-4 flex-col justify-end">
      {planned !== '0.00' && (
        <div
          className={`w-full rounded-t-sm border border-b-0 border-dashed ${dashed} bg-card`}
          style={{ height: height(planned, max) }}
        />
      )}
      <div
        className={`w-full ${solid} ${planned === '0.00' ? 'rounded-t-sm' : ''}`}
        style={{ height: height(actual, max) }}
      />
    </div>
  )
}

/**
 * Income next to expenses for each month (right to left, oldest first). Planned amounts
 * sit on top as dashed outlines. The table below the chart carries the same numbers
 * for screen readers.
 */
export function IncomeExpenseChart({ months }: { months: MonthRow[] }) {
  const max = Math.max(
    ...months.flatMap((m) => [
      Number(m.income) + Number(m.income_planned),
      Number(m.expense) + Number(m.expense_planned),
    ]),
    0,
  )
  const dense = months.length > 18

  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className={dense ? 'overflow-x-auto pb-2' : undefined}>
        <div
          className="flex h-48 items-end gap-1 border-b border-border sm:gap-2"
          style={dense ? { minWidth: `${months.length * 2}rem` } : undefined}
        >
          {months.map((month) => (
            <div
              key={month.month}
              className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5"
            >
              <Bar actual={month.income} planned={month.income_planned} max={max} tone="income" />
              <Bar
                actual={month.expense}
                planned={month.expense_planned}
                max={max}
                tone="expense"
              />
            </div>
          ))}
        </div>
        <div
          className="mt-1.5 flex gap-1 sm:gap-2"
          style={dense ? { minWidth: `${months.length * 2}rem` } : undefined}
        >
          {months.map((month) => (
            <span
              key={month.month}
              className="min-w-0 flex-1 truncate text-center text-[0.7rem] text-muted-foreground"
            >
              {monthLabel(month.month)}
              {month.month.endsWith('-01') && (
                <span className="block">{month.month.slice(0, 4)}</span>
              )}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-income" /> הכנסות
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-expense" /> הוצאות
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-dashed border-muted-foreground" />{' '}
          מתוכנן
        </span>
      </div>
    </div>
  )
}
