import { CalendarPlus, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { describeError } from '@/lib/errors'
import { monthName, shiftMonths, type Period } from '@/lib/period'
import { type BudgetMonth, useCopyPreviousBudget } from './api'
import { dismissBudgetCopy, isBudgetCopyDismissed, shouldOfferBudgetCopy } from './newMonthPrompt'

type NewMonthBudgetPromptProps = {
  budget: BudgetMonth
  period: Period
  isCurrent: boolean
}

/** At the start of a month without a budget: copy last month's, or decline for this month. */
export function NewMonthBudgetPrompt({ budget, period, isCurrent }: NewMonthBudgetPromptProps) {
  const [dismissed, setDismissed] = useState(() => isBudgetCopyDismissed(budget.month))
  const copy = useCopyPreviousBudget(budget.month)
  if (!shouldOfferBudgetCopy(budget, isCurrent, dismissed)) return null

  const previous = monthName(shiftMonths(period, -1).month)

  function decline() {
    dismissBudgetCopy(budget.month)
    setDismissed(true)
  }

  return (
    <section
      aria-labelledby="new-month-title"
      className="flex flex-col gap-3 rounded-3xl border-2 border-dashed border-brass/60 bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <CalendarPlus className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id="new-month-title" className="font-heading text-lg font-semibold">
            חודש חדש! להעתיק את התקציב מ{previous}?
          </h2>
          <p className="text-sm text-muted-foreground">
            כל הסכומים יועתקו לחודש הזה, ואפשר לערוך אותם אחר כך.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={copy.isPending}
          onClick={() =>
            copy.mutate(undefined, {
              onSuccess: () => toast.success(`התקציב הועתק מ${previous}`),
              onError: (error) => toast.error(describeError(error)),
            })
          }
        >
          {copy.isPending && <Loader2 className="animate-spin" aria-hidden />}
          העתקה
        </Button>
        <Button variant="outline" disabled={copy.isPending} onClick={decline}>
          לא עכשיו
        </Button>
      </div>
    </section>
  )
}
