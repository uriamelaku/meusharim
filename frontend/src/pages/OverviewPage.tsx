import {
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  Minus,
  PieChart,
  Plus,
  Receipt,
} from 'lucide-react'
import { Link } from 'react-router'
import { toneOf } from '@/budgets/usage'
import { BarList } from '@/components/BarList'
import { PeriodPicker } from '@/components/PeriodPicker'
import { ProgressBar } from '@/components/ProgressBar'
import { RingsMark } from '@/components/RingsMark'
import { useShellContext } from '@/components/shellContext'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useSelectedPeriod } from '@/hooks/useSelectedPeriod'
import { formatMoney } from '@/lib/money'
import { formatPeriod, monthName, toPeriodParam } from '@/lib/period'
import { cn } from '@/lib/utils'
import { type MonthSummary, useMonthSummary } from '@/summary/api'
import { UpcomingRow } from '@/summary/UpcomingRow'
import { PendingConfirmations } from '@/transactions/PendingConfirmations'
import { useQuickAdd } from '@/transactions/quickAdd'
import { TransactionRow } from '@/transactions/TransactionRow'

export function OverviewPage() {
  const { household } = useShellContext()
  const { period, today, setPeriod, isCurrent } = useSelectedPeriod()
  const summary = useMonthSummary(toPeriodParam(period))
  const { add, edit } = useQuickAdd()

  return (
    <>
      <header className="mb-6 lg:mb-8">
        <div className="flex min-h-9 items-center justify-between gap-3">
          <p className="truncate text-sm font-medium text-brass-strong">{household.name}</p>
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

        {summary.isPending ? (
          <LoadingState />
        ) : summary.isError ? (
          <ErrorState
            title="לא הצלחנו לטעון את הסקירה"
            description="בדקו את החיבור ונסו שוב."
            onRetry={() => void summary.refetch()}
          />
        ) : (
          <>
            <BalanceCard summary={summary.data} monthLabel={monthName(period.month)} />

            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" variant="outline" onClick={() => add('expense')}>
                <Minus aria-hidden />
                הוצאה
              </Button>
              <Button size="lg" variant="outline" onClick={() => add('income')}>
                <Plus aria-hidden />
                הכנסה
              </Button>
            </div>

            <BudgetCard summary={summary.data} />

            <section aria-labelledby="categories-title">
              <h2 id="categories-title" className="mb-4 font-heading text-xl font-semibold">
                הוצאות לפי קטגוריה
              </h2>
              {summary.data.expense_by_category.length ? (
                <BarList items={summary.data.expense_by_category} label="הוצאות לפי קטגוריה" />
              ) : (
                <EmptyState
                  icon={PieChart}
                  title={`אין הוצאות ב${formatPeriod(period)}`}
                  description="כשתוסיפו הוצאות לחודש הזה, תראו כאן לאן הכסף הולך."
                />
              )}
            </section>

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
                  <Link to={`/transactions?month=${toPeriodParam(period)}`}>
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

function BalanceCard({ summary, monthLabel }: { summary: MonthSummary; monthLabel: string }) {
  const { balance, projected_balance, income, expense } = summary
  const hasPlanned = income.planned !== '0.00' || expense.planned !== '0.00'
  return (
    <section
      aria-labelledby="balance-title"
      className="relative overflow-hidden rounded-3xl bg-primary px-6 py-7 text-primary-foreground shadow-lg shadow-primary/20 lg:px-8"
    >
      <RingsMark
        className="pointer-events-none absolute -end-14 -top-14 h-32 opacity-20 sm:-end-10 sm:-top-14 sm:h-52"
        firstRing="#ffffff"
        secondRing="var(--brass)"
      />
      <p id="balance-title" className="text-sm font-medium text-primary-foreground/75">
        מאזן {monthLabel} · בפועל
      </p>
      <p className="relative mt-2 font-heading text-4xl font-semibold tabular-nums sm:text-5xl">
        {formatMoney(balance)}
      </p>
      {hasPlanned && (
        <p className="relative mt-3 inline-flex rounded-full border border-dashed border-primary-foreground/40 px-3 py-1 text-sm text-primary-foreground/85">
          אם כל המתוכנן יבוצע: {formatMoney(projected_balance)}
        </p>
      )}

      <dl className="relative mt-6 grid grid-cols-2 gap-4 border-t border-primary-foreground/20 pt-5">
        <FlowStat label="הכנסות" actual={income.actual} planned={income.planned} />
        <FlowStat label="הוצאות" actual={expense.actual} planned={expense.planned} />
      </dl>
    </section>
  )
}

function FlowStat({ label, actual, planned }: { label: string; actual: string; planned: string }) {
  return (
    <div>
      <dt className="text-sm text-primary-foreground/75">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums">{formatMoney(actual)}</dd>
      {planned !== '0.00' && (
        <dd className="text-xs text-primary-foreground/70">+ {formatMoney(planned)} מתוכנן</dd>
      )}
    </div>
  )
}

function BudgetCard({ summary }: { summary: MonthSummary }) {
  const { budget } = summary
  return (
    <Link
      to={`/budget?month=${summary.month}`}
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
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
