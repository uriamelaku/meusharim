import { ArrowLeft, CalendarCheck, CalendarClock, PieChart, Receipt, Settings } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useBudget } from '@/budgets/api'
import { NewMonthBudgetPrompt } from '@/budgets/NewMonthBudgetPrompt'
import { GoalPaceNotice } from '@/goals/GoalPaceNotice'
import { useCategories } from '@/categories/api'
import { PeriodPicker } from '@/components/PeriodPicker'
import { useShellContext } from '@/components/shellContext'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useSelectedPeriod } from '@/hooks/useSelectedPeriod'
import { formatMoney } from '@/lib/money'
import { formatPeriod, monthName, toPeriodParam } from '@/lib/period'
import { cn } from '@/lib/utils'
import { type MonthSummary, useMonthSummary } from '@/summary/api'
import { CategoryRing } from '@/summary/CategoryRing'
import { MonthlySummaryCard } from '@/summary/MonthlySummaryCard'
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
  const { add, edit } = useQuickAdd()
  const navigate = useNavigate()

  return (
    <>
      <header className="mb-2.5 flex items-center justify-between gap-2 lg:mb-6">
        <div className="flex min-w-0 items-center gap-1">
          <PeriodPicker period={period} today={today} onChange={setPeriod} compact />
          {!isCurrent && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="לחודש הנוכחי"
              className="shrink-0 rounded-full text-brass-strong"
              onClick={() => setPeriod(today)}
            >
              <CalendarCheck className="size-5" aria-hidden />
            </Button>
          )}
        </div>
        <Link
          to="/settings"
          aria-label="הגדרות"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:hidden"
        >
          <Settings className="size-5" aria-hidden />
        </Link>
      </header>

      <div className="flex flex-col gap-2.5 lg:gap-4">
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
            <MonthlySummaryCard today={today} isCurrent={isCurrent} />
            <NewMonthBudgetPrompt budget={budget.data} period={period} isCurrent={isCurrent} />
            <BalanceCard summary={summary.data} monthLabel={monthName(period.month)} />
            <GoalPaceNotice />
            <SpendingRing
              total={summary.data.expense.actual}
              items={ringItems(categories.data, budget.data.categories)}
              emptyTitle={`אין הוצאות ב${formatPeriod(period)}`}
              onAdd={(categoryId) => add('expense', 'once', categoryId)}
              onOpen={(categoryId) => navigate(`/transactions?month=${month}&category=${categoryId}`)}
            />

            {summary.data.upcoming.length > 0 && (
              <section aria-labelledby="upcoming-title" className="mt-4">
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

            <section aria-labelledby="recent-title" className="mt-4">
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
  total,
  items,
  emptyTitle,
  onAdd,
  onOpen,
}: {
  total: string
  items: ReturnType<typeof ringItems>
  emptyTitle: string
  onAdd: (categoryId: string) => void
  onOpen: (categoryId: string) => void
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
    <>
      <CategoryRing items={items} total={total} onAdd={onAdd} onOpen={onOpen} />
      <p className="text-center text-xs text-muted-foreground">
        לחיצה על עיגול: הוצאה חדשה · לחיצה ארוכה: התנועות של הקטגוריה
      </p>
    </>
  )
}

/** The month at a glance: balance, income and expenses, and how much budget is left. */
function BalanceCard({ summary, monthLabel }: { summary: MonthSummary; monthLabel: string }) {
  const { balance, projected_balance, income, expense, budget } = summary
  const hasPlanned = income.planned !== '0.00' || expense.planned !== '0.00'
  return (
    <section
      aria-labelledby="balance-title"
      className="rounded-3xl bg-hero px-4.5 pt-3.5 pb-4 text-hero-foreground lg:px-7 lg:py-6"
    >
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p id="balance-title" className="text-[13px] font-semibold text-hero-foreground/80">
            מאזן {monthLabel}
          </p>
          <p className="font-heading text-[2rem] leading-tight font-semibold tabular-nums lg:text-5xl">
            {formatMoney(balance)}
          </p>
        </div>
        <dl className="flex shrink-0 flex-col gap-0.5 text-[13px] text-hero-foreground/85">
          <FlowStat label="הכנסות" actual={income.actual} />
          <FlowStat label="הוצאות" actual={expense.actual} />
        </dl>
      </div>
      {hasPlanned && (
        <p className="mt-1 text-xs text-hero-foreground/80">
          אם כל המתוכנן יבוצע: {formatMoney(projected_balance)}
        </p>
      )}
      <Link
        to={`/budget?month=${summary.month}`}
        className="mt-3 block border-t border-hero-foreground/20 pt-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {budget ? (
          <>
            <span className="flex items-center justify-between gap-2 text-[13px]">
              <span className="flex items-center gap-1.5">
                תקציב החודש
                <span
                  className={cn(
                    'rounded-full px-2 text-xs font-bold tabular-nums',
                    budget.status === 'over'
                      ? 'bg-destructive text-background'
                      : 'bg-brass text-foreground dark:text-background',
                  )}
                >
                  {budget.percent}%
                </span>
              </span>
              <span className="text-hero-foreground/85 tabular-nums">
                {budget.status === 'over' ? 'חריגה של ' : 'נשארו '}
                <b className="text-hero-foreground">
                  {formatMoney(budget.remaining.replace('-', ''))}
                </b>{' '}
                מ-{formatMoney(budget.budget)}
              </span>
            </span>
            <span
              className="mt-2 block h-2 overflow-hidden rounded-full bg-hero-foreground/20"
              role="progressbar"
              aria-label={`נוצלו ${budget.percent}% מהתקציב`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(budget.percent, 100)}
            >
              <span
                className={cn(
                  'block h-full rounded-full',
                  budget.status === 'over' ? 'bg-destructive' : 'bg-brass',
                )}
                style={{ width: `${Math.min(budget.percent, 100)}%` }}
              />
            </span>
          </>
        ) : (
          <span className="flex items-center justify-between text-[13px] text-hero-foreground/85">
            עדיין לא הוגדר תקציב לחודש הזה
            <b className="text-hero-foreground">הגדרת תקציב ←</b>
          </span>
        )}
      </Link>
    </section>
  )
}

function FlowStat({ label, actual }: { label: string; actual: string }) {
  return (
    <div className="flex items-baseline justify-end gap-1.5">
      <dt>{label}</dt>
      <dd className="font-heading font-semibold text-hero-foreground tabular-nums">
        {formatMoney(actual)}
      </dd>
    </div>
  )
}
