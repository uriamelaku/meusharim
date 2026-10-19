import { ArrowLeft, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { todayIso } from '@/lib/dates'
import { tr } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { monthName, type Period, shiftMonths, toPeriodParam } from '@/lib/period'
import { useInsights } from '@/reports/api'
import { dismissSummary, isSummaryDismissed, shouldShowMonthlySummary } from './monthlySummary'

/** In the first days of a month: how the previous month ended. */
export function MonthlySummaryCard({ today, isCurrent }: { today: Period; isCurrent: boolean }) {
  const previous = shiftMonths(today, -1)
  const month = toPeriodParam(previous)
  const [dismissed, setDismissed] = useState(() => isSummaryDismissed(month))
  const [dayOfMonth] = useState(() => Number(todayIso().slice(8, 10)))
  const show = shouldShowMonthlySummary(dayOfMonth, isCurrent, dismissed)
  const insights = useInsights(month, show)
  if (!show || !insights.data) return null

  const { balance, expense_change_percent: change, categories } = insights.data
  const biggestRise = categories.find((c) => !c.difference.startsWith('-') && c.difference !== '0.00')
  const name = monthName(previous.month)

  return (
    <section
      aria-labelledby="month-summary-title"
      className="relative flex flex-col gap-2 rounded-3xl bg-card p-4"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label={tr({ he: 'סגירת הסיכום', en: 'Close summary' })}
        className="absolute end-2 top-2"
        onClick={() => {
          dismissSummary(month)
          setDismissed(true)
        }}
      >
        <X className="size-4" aria-hidden />
      </Button>
      <h2 id="month-summary-title" className="font-heading text-lg font-semibold">
        {tr({ he: `סיכום ${name}`, en: `${name} summary` })}
      </h2>
      <ul className="flex flex-col gap-1 text-sm">
        <li>
          {balance.startsWith('-')
            ? tr({ he: 'הוצאתם יותר משהכנסתם: ', en: 'You spent more than you earned: ' })
            : tr({ he: 'נשארו לכם ', en: 'You have left: ' })}
          <b className="tabular-nums">{formatMoney(balance.replace('-', ''))}</b>
        </li>
        {change !== null && (
          <li>
            {tr({
              he: `ההוצאות ${change > 0 ? 'עלו' : change < 0 ? 'ירדו' : 'נשארו כמו'} `,
              en: `Expenses ${change > 0 ? 'rose' : change < 0 ? 'fell' : 'stayed the same as'} `,
            })}
            {change !== 0 && <b className="tabular-nums">{Math.abs(change)}%</b>}
            {tr({
              he: ' לעומת החודש שלפני',
              en: change !== 0 ? ' compared with the month before' : ' the month before',
            })}
          </li>
        )}
        {biggestRise && (
          <li>
            {tr({ he: 'העלייה הגדולה: ', en: 'Biggest rise: ' })}
            <b>{biggestRise.category.name}</b> (+{formatMoney(biggestRise.difference)})
          </li>
        )}
      </ul>
      <Link
        to={`/reports?month=${month}`}
        className="flex items-center gap-1 self-start text-sm font-semibold text-primary"
      >
        {tr({ he: 'לדוח המלא', en: 'Full report' })}
        <ArrowLeft className="size-4 ltr:-scale-x-100" aria-hidden />
      </Link>
    </section>
  )
}
