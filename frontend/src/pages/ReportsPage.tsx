import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { BarList } from '@/components/BarList'
import { PageHeader } from '@/components/PageHeader'
import { Segmented } from '@/components/Segmented'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/money'
import { currentPeriod, formatPeriod, parsePeriodParam } from '@/lib/period'
import { cn } from '@/lib/utils'
import { type Report, useReport } from '@/reports/api'
import { IncomeExpenseChart } from '@/reports/IncomeExpenseChart'
import { MonthInsightsSection } from '@/reports/MonthInsightsSection'
import {
  MAX_RANGE_MONTHS,
  type MonthRange,
  parseRange,
  presetOf,
  presetRange,
  type RangePreset,
  rangeParams,
} from '@/reports/range'

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: '6m', label: '6 חודשים' },
  { value: '12m', label: '12 חודשים' },
  { value: 'year', label: 'השנה' },
  { value: 'custom', label: 'טווח' },
]

const TOP_CATEGORIES = 5

function periodOf(month: string) {
  return parsePeriodParam(month)!
}

export function ReportsPage() {
  const today = currentPeriod()
  const [searchParams, setSearchParams] = useSearchParams()
  const range =
    parseRange(searchParams.get('from'), searchParams.get('to')) ?? presetRange('12m', today)
  const [customOpen, setCustomOpen] = useState(false)
  const preset = customOpen ? 'custom' : presetOf(range, today)
  const params = rangeParams(range)
  const report = useReport(params.from, params.to)

  function applyRange(next: MonthRange) {
    setSearchParams((previous) => {
      const search = new URLSearchParams(previous)
      const { from, to } = rangeParams(next)
      search.set('from', from)
      search.set('to', to)
      return search
    })
  }

  function choosePreset(value: RangePreset) {
    if (value === 'custom') return setCustomOpen(true)
    setCustomOpen(false)
    applyRange(presetRange(value, today))
  }

  return (
    <>
      <PageHeader title="דוחות" />
      <MonthInsightsSection />
      <h2 className="mb-3 font-heading text-xl font-semibold">לאורך זמן</h2>
      <div className="mb-6 flex flex-col gap-3">
        <Segmented label="טווח הדוח" options={PRESETS} value={preset} onChange={choosePreset} />
        {preset === 'custom' && <CustomRange range={range} onApply={applyRange} />}
        <p className="text-sm text-muted-foreground">
          {formatPeriod(range.from)} – {formatPeriod(range.to)}
        </p>
      </div>

      {report.isPending ? (
        <LoadingState />
      ) : report.isError ? (
        <ErrorState
          title="לא הצלחנו לטעון את הדוח"
          description="בדקו את החיבור ונסו שוב."
          onRetry={() => void report.refetch()}
        />
      ) : (
        <ReportContent report={report.data} />
      )}
    </>
  )
}

function CustomRange({
  range,
  onApply,
}: {
  range: MonthRange
  onApply: (range: MonthRange) => void
}) {
  const [from, setFrom] = useState(rangeParams(range).from)
  const [to, setTo] = useState(rangeParams(range).to)
  const parsed = parseRange(from, to)
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-muted/60 p-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        מחודש
        <input
          type="month"
          value={from}
          min="1900-01"
          max="2100-12"
          onChange={(event) => setFrom(event.target.value)}
          className="h-11 rounded-xl border border-input bg-card px-3 text-base"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        עד חודש
        <input
          type="month"
          value={to}
          min="1900-01"
          max="2100-12"
          onChange={(event) => setTo(event.target.value)}
          className="h-11 rounded-xl border border-input bg-card px-3 text-base"
        />
      </label>
      <Button disabled={!parsed} onClick={() => parsed && onApply(parsed)}>
        הצגה
      </Button>
      {!parsed && (
        <p role="alert" className="w-full text-sm text-destructive">
          הטווח צריך להיות בין חודש אחד ל-{MAX_RANGE_MONTHS} חודשים, וחודש ההתחלה לא אחרי חודש הסיום.
        </p>
      )}
    </div>
  )
}

function ReportContent({ report }: { report: Report }) {
  const [showAll, setShowAll] = useState(false)
  const hasData =
    report.income !== '0.00' ||
    report.expense !== '0.00' ||
    report.income_planned !== '0.00' ||
    report.expense_planned !== '0.00'
  if (!hasData) {
    return (
      <EmptyState
        icon={BarChart3}
        title="אין נתונים בטווח הזה"
        description="אפשר לבחור טווח אחר. כשיירשמו הכנסות והוצאות, יופיעו כאן מגמות."
      />
    )
  }
  const categories = showAll ? report.categories : report.categories.slice(0, TOP_CATEGORIES)

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="הכנסות שהתקבלו" value={report.income} planned={report.income_planned} kind="income" />
        <Stat label="הוצאות ששולמו" value={report.expense} planned={report.expense_planned} kind="expense" />
        <Stat label="יתרה" value={report.balance} />
        <Stat label="ממוצע הוצאות לחודש" value={report.average_monthly_expense} />
      </dl>

      <section aria-labelledby="trend-title" className="rounded-3xl border bg-card p-4 sm:p-6">
        <h2 id="trend-title" className="mb-4 font-heading text-xl font-semibold">
          הכנסות מול הוצאות
        </h2>
        <IncomeExpenseChart months={report.months} />
      </section>

      <section aria-labelledby="top-title">
        <h2 id="top-title" className="mb-4 font-heading text-xl font-semibold">
          {showAll ? 'הוצאות לפי קטגוריה' : 'הקטגוריות עם ההוצאה הגבוהה ביותר'}
        </h2>
        {report.categories.length ? (
          <>
            <BarList items={categories} label="הוצאות לפי קטגוריה" />
            {report.categories.length > TOP_CATEGORIES && (
              <Button variant="ghost" className="mt-2" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'הצגת המובילות בלבד' : `הצגת כל ${report.categories.length} הקטגוריות`}
              </Button>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">אין הוצאות בטווח הזה.</p>
        )}
      </section>

      <section aria-labelledby="monthly-title">
        <h2 id="monthly-title" className="mb-3 font-heading text-xl font-semibold">
          השוואה חודשית
        </h2>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[30rem] text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  חודש
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  הכנסות
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  הוצאות
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  יתרה
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  שינוי בהוצאות
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...report.months].reverse().map((month) => (
                <tr key={month.month}>
                  <th scope="row" className="px-3 py-2 text-start font-medium whitespace-nowrap">
                    {formatPeriod(periodOf(month.month))}
                  </th>
                  <td className="px-3 py-2 tabular-nums">
                    {formatMoney(month.income)}
                    {month.income_planned !== '0.00' && (
                      <span className="block text-xs text-muted-foreground">
                        + {formatMoney(month.income_planned)} עוד לא התקבל
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatMoney(month.expense)}
                    {month.expense_planned !== '0.00' && (
                      <span className="block text-xs text-muted-foreground">
                        + {formatMoney(month.expense_planned)} עוד לא שולם
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2 tabular-nums',
                      month.balance.startsWith('-') && 'text-destructive',
                    )}
                  >
                    {formatMoney(month.balance)}
                  </td>
                  <td className="px-3 py-2">
                    <Change percent={month.expense_change_percent} higherIsWorse />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="yearly-title">
        <h2 id="yearly-title" className="mb-3 font-heading text-xl font-semibold">
          סיכום שנתי
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {report.years.map((year) => (
            <li key={year.year} className="rounded-2xl border bg-card p-4">
              <p className="font-heading text-2xl font-semibold">{year.year}</p>
              <p className="mb-3 text-xs text-muted-foreground">
                כל השנה (מה ששולם והתקבל), לעומת {year.year - 1}
              </p>
              <dl className="flex flex-col gap-2 text-sm">
                <YearLine label="הכנסות" value={year.income} change={year.income_change_percent} />
                <YearLine
                  label="הוצאות"
                  value={year.expense}
                  change={year.expense_change_percent}
                  higherIsWorse
                />
                <div className="flex justify-between gap-2 border-t pt-2">
                  <dt className="font-medium">יתרה</dt>
                  <dd className="font-semibold tabular-nums">{formatMoney(year.balance)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

type StatProps = { label: string; value: string; planned?: string; kind?: 'income' | 'expense' }

function Stat({ label, value, planned, kind = 'expense' }: StatProps) {
  return (
    <div className="rounded-2xl border bg-card p-3.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-heading text-xl font-semibold tabular-nums">{formatMoney(value)}</dd>
      {planned && planned !== '0.00' && (
        <dd className="text-xs text-muted-foreground">
          + {formatMoney(planned)} {kind === 'income' ? 'עוד לא התקבל' : 'עוד לא שולם'}
        </dd>
      )}
    </div>
  )
}

function YearLine(props: {
  label: string
  value: string
  change: number | null
  higherIsWorse?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt>{props.label}</dt>
      <dd className="flex items-center gap-2 tabular-nums">
        {formatMoney(props.value)}
        <Change percent={props.change} higherIsWorse={props.higherIsWorse} />
      </dd>
    </div>
  )
}

/** "▲ 12%" with a color that says whether the change is good or bad. */
function Change({
  percent,
  higherIsWorse = false,
}: {
  percent: number | null
  higherIsWorse?: boolean
}) {
  if (percent === null) return <span className="text-muted-foreground">—</span>
  if (percent === 0) return <span className="text-muted-foreground">ללא שינוי</span>
  const up = percent > 0
  const bad = up === higherIsWorse
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        bad ? 'text-destructive' : 'text-income',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span>
        {up ? 'עלייה' : 'ירידה'} של {Math.abs(percent)}%
      </span>
    </span>
  )
}
