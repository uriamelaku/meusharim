import { ArrowDown, ArrowUp, Minus, PiggyBank, Telescope } from 'lucide-react'
import { useState } from 'react'
import { CategoryIconBadge } from '@/categories/CategoryBadge'
import { PeriodPicker } from '@/components/PeriodPicker'
import { Segmented } from '@/components/Segmented'
import { ErrorState, LoadingState } from '@/components/states'
import { useSelectedPeriod } from '@/hooks/useSelectedPeriod'
import { formatMoney } from '@/lib/money'
import { formatPeriod, monthName, parsePeriodParam, toPeriodParam } from '@/lib/period'
import { cn } from '@/lib/utils'
import { type CategoryChange, type Comparison, type MonthInsights, useInsights } from './api'

const TOP_CHANGES = 6

/** One month in focus: month-end forecast, change against last month, year's savings. */
export function MonthInsightsSection() {
  const { period, today, setPeriod } = useSelectedPeriod()
  const insights = useInsights(toPeriodParam(period))

  return (
    <section aria-labelledby="insights-title" className="mb-8 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="insights-title" className="font-heading text-xl font-semibold">
          תמונת החודש
        </h2>
        <PeriodPicker period={period} today={today} onChange={setPeriod} compact />
      </div>
      {insights.isPending ? (
        <LoadingState />
      ) : insights.isError ? (
        <ErrorState
          title="לא הצלחנו לטעון את תמונת החודש"
          description="בדקו את החיבור ונסו שוב."
          onRetry={() => void insights.refetch()}
        />
      ) : (
        <>
          {insights.data.forecast && <ForecastCard forecast={insights.data.forecast} />}
          <CompareCard month={toPeriodParam(period)} previousMonth={insights.data} />
          <YearCard year={insights.data.year} />
        </>
      )}
    </section>
  )
}

function ForecastCard({ forecast }: { forecast: NonNullable<MonthInsights['forecast']> }) {
  return (
    <div className="rounded-2xl bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Telescope className="size-4" aria-hidden />
        צפי לסוף החודש, בקצב הנוכחי
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Stat label="הוצאות" value={formatMoney(forecast.expense)} />
        <Stat label="יתרה" value={formatMoney(forecast.balance)} />
      </div>
      {forecast.budget && (
        <p
          className={cn(
            'mt-3 rounded-xl px-3 py-2 text-sm',
            forecast.over_budget ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground',
          )}
        >
          {forecast.over_budget
            ? `בקצב הזה תעברו את התקציב (${formatMoney(forecast.budget)}).`
            : `בקצב הזה תישארו בתוך התקציב (${formatMoney(forecast.budget)}).`}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        איך חישבנו: מה שכבר שולם, ועוד מה שעוד לא שולם, ועוד אותו קצב הוצאות יומי עד סוף החודש (בלי הוראות קבע והפקדות לחיסכון).
      </p>
    </div>
  )
}

const COMPARISONS: { value: Comparison; label: string }[] = [
  { value: 'previous_month', label: 'לחודש הקודם' },
  { value: 'last_year', label: 'לשנה שעברה' },
]

/** Against last month (already loaded with the section) or the same month last year. */
function CompareCard({ month, previousMonth }: { month: string; previousMonth: MonthInsights }) {
  const [compare, setCompare] = useState<Comparison>('previous_month')
  const lastYear = useInsights(month, compare === 'last_year', 'last_year')
  const insights = compare === 'last_year' ? lastYear.data : previousMonth
  return (
    <div className="rounded-2xl bg-card p-4">
      <Segmented
        label="השוואה"
        options={COMPARISONS}
        value={compare}
        onChange={setCompare}
        className="mb-3"
      />
      {insights ? (
        <CompareBody insights={insights} />
      ) : lastYear.isError ? (
        <ErrorState
          title="לא הצלחנו לטעון את ההשוואה"
          description="בדקו את החיבור ונסו שוב."
          onRetry={() => void lastYear.refetch()}
        />
      ) : (
        <LoadingState />
      )}
    </div>
  )
}

function CompareBody({ insights }: { insights: MonthInsights }) {
  const compared = parsePeriodParam(insights.previous_month)!
  const sameYear = insights.previous_month.slice(0, 4) === insights.month.slice(0, 4)
  const comparedName = sameYear ? monthName(compared.month) : formatPeriod(compared)
  const changes = insights.categories.filter((c) => c.difference !== '0.00').slice(0, TOP_CHANGES)
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-muted-foreground">לעומת {comparedName}</p>
        <ChangeBadge percent={insights.expense_change_percent} />
      </div>
      <p className="mt-1 text-sm">
        הוצאות <b className="font-heading tabular-nums">{formatMoney(insights.expense)}</b>
        <span className="text-muted-foreground">
          {' '}
          · ב{comparedName} {formatMoney(insights.previous_expense)}
        </span>
      </p>
      {changes.length > 0 ? (
        <ul className="mt-3 flex flex-col divide-y">
          {changes.map((change) => (
            <ChangeRow key={change.category.id} change={change} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">אין שינויים בין החודשים.</p>
      )}
    </>
  )
}

function ChangeRow({ change }: { change: CategoryChange }) {
  const up = !change.difference.startsWith('-')
  return (
    <li className="flex items-center gap-3 py-2">
      <CategoryIconBadge color={change.category.color} icon={change.category.icon} className="size-8" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{change.category.name}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatMoney(change.actual)} · קודם {formatMoney(change.previous)}
        </span>
      </span>
      <span
        className={cn(
          'flex items-center gap-0.5 text-sm font-semibold tabular-nums',
          up ? 'text-expense' : 'text-income',
        )}
      >
        {up ? <ArrowUp className="size-4" aria-hidden /> : <ArrowDown className="size-4" aria-hidden />}
        <span className="sr-only">{up ? 'עלייה של' : 'ירידה של'}</span>
        {formatMoney(change.difference.replace('-', ''))}
      </span>
    </li>
  )
}

function ChangeBadge({ percent }: { percent: number | null }) {
  if (percent === null) return null
  const Icon = percent > 0 ? ArrowUp : percent < 0 ? ArrowDown : Minus
  return (
    <span
      className={cn(
        'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
        percent > 0 ? 'bg-destructive/10 text-expense' : 'bg-secondary text-income',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {Math.abs(percent)}% בהוצאות
    </span>
  )
}

function YearCard({ year }: { year: MonthInsights['year'] }) {
  const negative = year.total_saved.startsWith('-')
  return (
    <div className="rounded-2xl bg-hero p-4 text-hero-foreground">
      <p className="flex items-center gap-2 text-sm font-semibold text-hero-foreground/80">
        <PiggyBank className="size-4" aria-hidden />
        {negative ? `ב-${year.year} עד עכשיו הוצאתם יותר משהכנסתם` : `חסכתם ב-${year.year} עד עכשיו`}
      </p>
      <p
        className={cn(
          'font-heading text-3xl font-semibold tabular-nums',
          negative && 'text-hero-negative',
        )}
      >
        {formatMoney(year.total_saved)}
      </p>
      <p className="mt-1 text-sm text-hero-foreground/85 tabular-nums">
        נשאר מההכנסות {formatMoney(year.balance)} · הופקד ליעדים {formatMoney(year.saved_to_goals)}
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
