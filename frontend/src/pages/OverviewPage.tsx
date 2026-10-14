import { CalendarCheck, PieChart } from 'lucide-react'
import { PeriodPicker } from '@/components/PeriodPicker'
import { RingsMark } from '@/components/RingsMark'
import { useShellContext } from '@/components/shellContext'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useSelectedPeriod } from '@/hooks/useSelectedPeriod'
import { formatPeriod, monthName } from '@/lib/period'

const SUMMARY_LABELS = ['הכנסות', 'הוצאות', 'נשאר בתקציב']

export function OverviewPage() {
  const { household } = useShellContext()
  // Financial queries will be keyed by `period` once transactions exist.
  const { period, today, setPeriod, isCurrent } = useSelectedPeriod()

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

      <section
        aria-labelledby="balance-title"
        aria-live="polite"
        className="relative overflow-hidden rounded-3xl bg-primary px-6 py-8 text-primary-foreground shadow-lg shadow-primary/20 lg:px-8"
      >
        <RingsMark
          className="pointer-events-none absolute -end-14 -top-14 h-32 opacity-20 sm:-end-10 sm:-top-14 sm:h-52"
          firstRing="#ffffff"
          secondRing="var(--brass)"
        />
        <p id="balance-title" className="text-sm font-medium text-primary-foreground/75">
          מאזן {monthName(period.month)}
        </p>
        <p className="relative mt-3 max-w-xs font-heading text-2xl leading-snug font-semibold">
          אין תנועות ב{formatPeriod(period)}
        </p>
        <p className="relative mt-2 max-w-64 text-sm leading-relaxed text-primary-foreground/75 sm:max-w-sm">
          כשתוסיפו הכנסות והוצאות לחודש הזה, כאן יופיע המאזן המשותף שלכם.
        </p>
      </section>

      <dl className="mt-4 grid grid-cols-3 divide-x rounded-2xl border bg-card">
        {SUMMARY_LABELS.map((label) => (
          <div key={label} className="px-3 py-4 text-center">
            <dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt>
            <dd className="mt-1 font-heading text-xl text-muted-foreground tabular-nums">
              <span aria-hidden>—</span>
              <span className="sr-only">אין נתונים</span>
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="categories-title" className="mt-10">
        <h2 id="categories-title" className="mb-4 font-heading text-xl font-semibold">
          תקציב לפי קטגוריות
        </h2>
        <EmptyState
          icon={PieChart}
          title="אין עדיין קטגוריות"
          description="אחרי שתגדירו קטגוריות ותקציב חודשי, תראו כאן כמה נוצל מכל אחת."
        />
      </section>
    </>
  )
}
