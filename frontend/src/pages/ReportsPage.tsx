import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { BarList } from '@/components/BarList'
import { PageHeader } from '@/components/PageHeader'
import { Segmented } from '@/components/Segmented'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { tr } from '@/lib/i18n'
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
  { value: '6m', label: tr({ he: '6 חודשים', en: '6 months' }) },
  { value: '12m', label: tr({ he: '12 חודשים', en: '12 months' }) },
  { value: 'year', label: tr({ he: 'השנה', en: 'This year' }) },
  { value: 'custom', label: tr({ he: 'טווח', en: 'Custom' }) },
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
      <PageHeader title={tr({ he: 'דוחות', en: 'Reports' })} />
      <MonthInsightsSection />
      <h2 className="mb-3 font-heading text-xl font-semibold">
        {tr({ he: 'לאורך זמן', en: 'Over time' })}
      </h2>
      <div className="mb-6 flex flex-col gap-3">
        <Segmented
          label={tr({ he: 'טווח הדוח', en: 'Report range' })}
          options={PRESETS}
          value={preset}
          onChange={choosePreset}
        />
        {preset === 'custom' && <CustomRange range={range} onApply={applyRange} />}
        <p className="text-sm text-muted-foreground">
          {formatPeriod(range.from)} – {formatPeriod(range.to)}
        </p>
      </div>

      {report.isPending ? (
        <LoadingState />
      ) : report.isError ? (
        <ErrorState
          title={tr({ he: 'לא הצלחנו לטעון את הדוח', en: "We couldn't load the report" })}
          description={tr({ he: 'בדקו את החיבור ונסו שוב.', en: 'Check your connection and try again.' })}
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
        {tr({ he: 'מחודש', en: 'From' })}
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
        {tr({ he: 'עד חודש', en: 'To' })}
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
        {tr({ he: 'הצגה', en: 'Show' })}
      </Button>
      {!parsed && (
        <p role="alert" className="w-full text-sm text-destructive">
          {tr({
            he: `הטווח צריך להיות בין חודש אחד ל-${MAX_RANGE_MONTHS} חודשים, וחודש ההתחלה לא אחרי חודש הסיום.`,
            en: `The range must be between 1 and ${MAX_RANGE_MONTHS} months, and the start month can't be after the end month.`,
          })}
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
        title={tr({ he: 'אין נתונים בטווח הזה', en: 'No data in this range' })}
        description={tr({
          he: 'אפשר לבחור טווח אחר. כשיירשמו הכנסות והוצאות, יופיעו כאן מגמות.',
          en: 'Try another range. Once income and expenses are recorded, trends will show up here.',
        })}
      />
    )
  }
  const categories = showAll ? report.categories : report.categories.slice(0, TOP_CATEGORIES)

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label={tr({ he: 'הכנסות שהתקבלו', en: 'Income received' })}
          value={report.income}
          planned={report.income_planned}
          kind="income"
        />
        <Stat
          label={tr({ he: 'הוצאות ששולמו', en: 'Expenses paid' })}
          value={report.expense}
          planned={report.expense_planned}
          kind="expense"
        />
        <Stat label={tr({ he: 'יתרה', en: 'Balance' })} value={report.balance} />
        <Stat
          label={tr({ he: 'ממוצע הוצאות לחודש', en: 'Average monthly expenses' })}
          value={report.average_monthly_expense}
        />
      </dl>

      <section aria-labelledby="trend-title" className="rounded-3xl border bg-card p-4 sm:p-6">
        <h2 id="trend-title" className="mb-4 font-heading text-xl font-semibold">
          {tr({ he: 'הכנסות מול הוצאות', en: 'Income vs. expenses' })}
        </h2>
        <IncomeExpenseChart months={report.months} />
      </section>

      <section aria-labelledby="top-title">
        <h2 id="top-title" className="mb-4 font-heading text-xl font-semibold">
          {showAll
            ? tr({ he: 'הוצאות לפי קטגוריה', en: 'Expenses by category' })
            : tr({ he: 'הקטגוריות עם ההוצאה הגבוהה ביותר', en: 'Top spending categories' })}
        </h2>
        {report.categories.length ? (
          <>
            <BarList
              items={categories}
              label={tr({ he: 'הוצאות לפי קטגוריה', en: 'Expenses by category' })}
            />
            {report.categories.length > TOP_CATEGORIES && (
              <Button variant="ghost" className="mt-2" onClick={() => setShowAll(!showAll)}>
                {showAll
                  ? tr({ he: 'הצגת המובילות בלבד', en: 'Show top categories only' })
                  : tr({
                      he: `הצגת כל ${report.categories.length} הקטגוריות`,
                      en: `Show all ${report.categories.length} categories`,
                    })}
              </Button>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">
            {tr({ he: 'אין הוצאות בטווח הזה.', en: 'No expenses in this range.' })}
          </p>
        )}
      </section>

      <section aria-labelledby="monthly-title">
        <h2 id="monthly-title" className="mb-3 font-heading text-xl font-semibold">
          {tr({ he: 'השוואה חודשית', en: 'Month by month' })}
        </h2>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[30rem] text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {tr({ he: 'חודש', en: 'Month' })}
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {tr({ he: 'הכנסות', en: 'Income' })}
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {tr({ he: 'הוצאות', en: 'Expenses' })}
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {tr({ he: 'יתרה', en: 'Balance' })}
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {tr({ he: 'שינוי בהוצאות', en: 'Change in expenses' })}
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
                        {tr({
                          he: `+ ${formatMoney(month.income_planned)} עוד לא התקבל`,
                          en: `+ ${formatMoney(month.income_planned)} not received yet`,
                        })}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatMoney(month.expense)}
                    {month.expense_planned !== '0.00' && (
                      <span className="block text-xs text-muted-foreground">
                        {tr({
                          he: `+ ${formatMoney(month.expense_planned)} עוד לא שולם`,
                          en: `+ ${formatMoney(month.expense_planned)} not paid yet`,
                        })}
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
          {tr({ he: 'סיכום שנתי', en: 'Yearly summary' })}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {report.years.map((year) => (
            <li key={year.year} className="rounded-2xl border bg-card p-4">
              <p className="font-heading text-2xl font-semibold">{year.year}</p>
              <p className="mb-3 text-xs text-muted-foreground">
                {tr({
                  he: `כל השנה (מה ששולם והתקבל), לעומת ${year.year - 1}`,
                  en: `The whole year (paid and received), compared with ${year.year - 1}`,
                })}
              </p>
              <dl className="flex flex-col gap-2 text-sm">
                <YearLine
                  label={tr({ he: 'הכנסות', en: 'Income' })}
                  value={year.income}
                  change={year.income_change_percent}
                />
                <YearLine
                  label={tr({ he: 'הוצאות', en: 'Expenses' })}
                  value={year.expense}
                  change={year.expense_change_percent}
                  higherIsWorse
                />
                <div className="flex justify-between gap-2 border-t pt-2">
                  <dt className="font-medium">{tr({ he: 'יתרה', en: 'Balance' })}</dt>
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
          + {formatMoney(planned)}{' '}
          {kind === 'income'
            ? tr({ he: 'עוד לא התקבל', en: 'not received yet' })
            : tr({ he: 'עוד לא שולם', en: 'not paid yet' })}
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
  if (percent === 0) {
    return <span className="text-muted-foreground">{tr({ he: 'ללא שינוי', en: 'No change' })}</span>
  }
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
        {up
          ? tr({ he: `עלייה של ${Math.abs(percent)}%`, en: `Up ${Math.abs(percent)}%` })
          : tr({ he: `ירידה של ${Math.abs(percent)}%`, en: `Down ${Math.abs(percent)}%` })}
      </span>
    </span>
  )
}
