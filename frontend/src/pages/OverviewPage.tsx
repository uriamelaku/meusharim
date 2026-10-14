import { PieChart } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { RingsMark } from '@/components/RingsMark'
import { EmptyState } from '@/components/states'

const SUMMARY_LABELS = ['הכנסות', 'הוצאות', 'נשאר בתקציב']

function currentMonthTitle(): string {
  return new Intl.DateTimeFormat('he-IL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date())
}

export function OverviewPage() {
  return (
    <>
      <PageHeader eyebrow="החודש שלנו" title={currentMonthTitle()} />

      <section
        aria-labelledby="balance-title"
        className="relative overflow-hidden rounded-3xl bg-primary px-6 py-8 text-primary-foreground shadow-lg shadow-primary/20 lg:px-8"
      >
        <RingsMark
          className="pointer-events-none absolute -end-16 -top-16 h-40 opacity-20 sm:-end-10 sm:-top-14 sm:h-52"
          firstRing="#ffffff"
          secondRing="var(--brass)"
        />
        <p id="balance-title" className="text-sm font-medium text-primary-foreground/75">
          מאזן החודש
        </p>
        <p className="relative mt-3 max-w-xs font-heading text-2xl leading-snug font-semibold">
          עוד אין תנועות החודש
        </p>
        <p className="relative mt-2 max-w-64 text-sm leading-relaxed text-primary-foreground/75 sm:max-w-sm">
          כשתוסיפו הכנסות והוצאות, כאן יופיע המאזן המשותף שלכם.
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
