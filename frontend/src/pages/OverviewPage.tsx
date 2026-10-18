import { ArrowLeft, CalendarCheck, CalendarClock, PieChart, Receipt } from 'lucide-react'
import { Link } from 'react-router'
import { useBudget } from '@/budgets/api'
import { toneOf } from '@/budgets/usage'
import { useCategories } from '@/categories/api'
import { PeriodPicker } from '@/components/PeriodPicker'
import { ProgressBar } from '@/components/ProgressBar'
import { useShellContext } from '@/components/shellContext'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useSelectedPeriod } from '@/hooks/useSelectedPeriod'
import { formatMoney } from '@/lib/money'
import { formatPeriod, monthName, toPeriodParam } from '@/lib/period'
import { cn } from '@/lib/utils'
import { type MonthSummary, useMonthSummary } from '@/summary/api'
import { CategoryRing } from '@/summary/CategoryRing'
import { ringItems } from '@/summary/ringItems'
import { UpcomingRow } from '@/summary/UpcomingRow'
import { PendingConfirmations } from '@/transactions/PendingConfirmations'
import { useQuickAdd } from '@/transactions/quickAdd'
import { TransactionRow } from '@/transactions/TransactionRow'

export function OverviewPage() {
  const { household } = useShellContext()
  const { period, today, setPeriod, isCurrent } = useSelectedPeriod()
  const month = toPeriodParam(period)
  const summary = useMonthSummary(month)
  const budget = useBudget(month)
  const categories = useCategories()
  const { edit } = useQuickAdd()

  return (
    <>
      <header className="mb-5 lg:mb-8">
        <div className="flex min-h-9 items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold text-muted-foreground">{household.name}</p>
          {!isCurrent && (
            <Button
              variant="ghost"
              className="h-9 shrink-0 px-2.5 text-sm text-brass-strong"
              onClick={() => setPeriod(today)}
            >
              <CalendarCheck aria-hidden />
              לחודש הנוכחי
            </Button>
          )}
        </div>
        <div className="-ms-3 mt-1">
          <PeriodPicker period={period} today={today} onChange={setPeriod} />
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <PendingConfirmations members={household.members} />

        {summary.isPending || budget.isPending || categories.isPending ? (
          <LoadingState />
        ) : summary.isError || budget.isError || categories.isError ? (
          <ErrorState
            title="לא הצלחנו לטעון את המסך הראשי"
            description="בדקו את החיבור ונסו שוב."
            onRetry={() => {
              void summary.refetch()
              void budget.refetch()
              void categories.refetch()
            }}
          />
        ) : (
          <>
            <BalanceCard summary={summary.data} monthLabel={monthName(period.month)} />
            <SpendingRing
              summary={summary.data}
              items={ringItems(categories.data, budget.data.categories)}
              emptyTitle={`אין הוצאות ב${formatPeriod(period)}`}
            />
            <BudgetCard summary={summary.data} />

            {summary.data.upcoming.length > 0 && (
              <section aria-labelledby="upcoming-title">
                <h2
                  id="upcoming-title"
                  className="mb-2 flex items-center gap-2 font-heading text-xl font-semibold"
                >
                  <CalendarClock className="size-5 text-brass-strong" aria-hidden />
                  צפוי בהמשך החודש
                </h2>
                <ul className="divide-y">
                  {summary.data.upcoming.map((item) => (
                    <li key={`${item.transaction_id ?? item.schedule_id}-${item.sequence_no}`}>
                      <UpcomingRow item={item} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="recent-title">
              <div className="mb-2 flex items-center justify-between">
                <h2 id="recent-title" className="font-heading text-xl font-semibold">
                  תנועות אחרונות
                </h2>
                <Button asChild variant="ghost" size="sm" className="h-9">
                  <Link to={`/transactions?month=${month}`}>
                    לכל התנועות
                    <ArrowLeft aria-hidden />
                  </Link>
                </Button>
              </div>
              {summary.data.recent.length ? (
                <ul>
                  {summary.data.recent.map((transaction) => (
                    <li key={transaction.id}>
                      <TransactionRow
                        transaction={transaction}
                        members={household.members}
                        onSelect={edit}
                        showDate
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={Receipt}
                  title={`אין תנועות ב${formatPeriod(period)}`}
                  description="הוסיפו הכנסה או הוצאה, והיא תופיע כאן אצל שניכם."
                />
              )}
            </section>
          </>
        )}
      </div>
    </>
  )
}

function SpendingRing({
  summary,
  items,
  emptyTitle,
}: {
  summary: MonthSummary
  items: ReturnType<typeof ringItems>
  emptyTitle: string
}) {
  if (!items.length) {
    return (
      <EmptyState
        icon={PieChart}
        title={emptyTitle}
        description="כשתוסיפו הוצאות לחודש הזה, תראו כאן לאן הכסף הולך."
      />
    )
  }
  return (
    <CategoryRing
      items={items}
      total={summary.expense.actual}
      remaining={summary.budget?.remaining ?? null}
      budgetLink={`/budget?month=${summary.month}`}
    />
  )
}

function BalanceCard({ summary, monthLabel }: { summary: MonthSummary; monthLabel: string }) {
  const { balance, projected_balance, income, expense } = summary
  const hasPlanned = income.planned !== '0.00' || expense.planned !== '0.00'
  return (
    <section
      aria-labelledby="balance-title"
      className="rounded-[1.75rem] bg-primary px-5 py-5 text-primary-foreground lg:px-8 lg:py-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p id="balance-title" className="text-sm font-semibold text-primary-foreground/80">
            מאזן {monthLabel} · בפועל
          </p>
          <p className="mt-0.5 font-heading text-4xl font-semibold tabular-nums sm:text-5xl">
            {formatMoney(balance)}
          </p>
        </div>
        <dl className="flex gap-6">
          <FlowStat label="הכנסות" actual={income.actual} planned={income.planned} />
          <FlowStat label="הוצאות" actual={expense.actual} planned={expense.planned} />
        </dl>
      </div>
      {hasPlanned && (
        <p className="mt-4 inline-flex rounded-full bg-primary-foreground/12 px-3 py-1 text-sm text-primary-foreground/90">
          אם כל המתוכנן יבוצע: {formatMoney(projected_balance)}
        </p>
      )}
    </section>
  )
}

function FlowStat({ label, actual, planned }: { label: string; actual: string; planned: string }) {
  return (
    <div>
      <dt className="text-sm text-primary-foreground/80">{label}</dt>
      <dd className="font-heading text-lg font-semibold tabular-nums">{formatMoney(actual)}</dd>
      {planned !== '0.00' && (
        <dd className="text-xs text-primary-foreground/80">+ {formatMoney(planned)} מתוכנן</dd>
      )}
    </div>
  )
}

function BudgetCard({ summary }: { summary: MonthSummary }) {
  const { budget } = summary
  return (
    <Link
      to={`/budget?month=${summary.month}`}
      className="flex flex-col gap-3 rounded-[1.75rem] bg-card p-5 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium">נשאר בתקציב</span>
        {budget ? (
          <span
            className={cn(
              'font-semibold tabular-nums',
              budget.status === 'over' && 'text-destructive',
            )}
          >
            {formatMoney(budget.remaining)}
          </span>
        ) : (
          <span className="text-sm text-brass-strong">הגדרת תקציב</span>
        )}
      </span>
      {budget ? (
        <>
          <ProgressBar
            percent={budget.percent}
            tone={toneOf(budget.status)}
            label={`נוצלו ${budget.percent}% מהתקציב`}
          />
          <span className="text-sm text-muted-foreground">
            נוצלו {budget.percent}% מתוך {formatMoney(budget.budget)}
          </span>
        </>
      ) : (
        <span className="text-sm text-muted-foreground">עדיין לא הוגדר תקציב לחודש הזה.</span>
      )}
    </Link>
  )
}
