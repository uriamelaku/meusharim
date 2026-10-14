import { Copy, Loader2, Pencil, Wallet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useBudget, useCopyPreviousBudget } from '@/budgets/api'
import { BudgetEditor } from '@/budgets/BudgetEditor'
import { BudgetSummary } from '@/budgets/BudgetSummary'
import { CategoryBudgetRow } from '@/budgets/CategoryBudgetRow'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageHeader } from '@/components/PageHeader'
import { PeriodPicker } from '@/components/PeriodPicker'
import { Sheet } from '@/components/Sheet'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useSelectedPeriod } from '@/hooks/useSelectedPeriod'
import { describeError } from '@/lib/errors'
import { formatPeriod, toPeriodParam } from '@/lib/period'

export function BudgetPage() {
  const { period, today, setPeriod } = useSelectedPeriod()
  const month = toPeriodParam(period)
  const budget = useBudget(month)
  const copy = useCopyPreviousBudget(month)
  const [editing, setEditing] = useState(false)
  const [confirmingCopy, setConfirmingCopy] = useState(false)
  const label = formatPeriod(period)

  const hasBudget = Boolean(budget.data?.effective_budget)
  const hasActivity = budget.data ? budget.data.categories.length > 0 : false
  const budgeted = budget.data?.categories.filter((c) => c.budget) ?? []
  const unbudgeted = budget.data?.categories.filter((c) => !c.budget) ?? []

  function copyPrevious() {
    copy.mutate(undefined, {
      onSuccess: () => {
        toast.success('התקציב הועתק מהחודש הקודם')
        setConfirmingCopy(false)
      },
      onError: (error) => {
        toast.error(describeError(error))
        setConfirmingCopy(false)
      },
    })
  }

  const actions = budget.data && (
    <div className="flex flex-wrap gap-2">
      <Button variant={hasBudget ? 'outline' : 'default'} onClick={() => setEditing(true)}>
        <Pencil aria-hidden />
        {hasBudget ? 'עריכת התקציב' : 'הגדרת תקציב'}
      </Button>
      {budget.data.previous_month_has_budget && (
        <Button
          variant="ghost"
          disabled={copy.isPending}
          onClick={() => (hasBudget ? setConfirmingCopy(true) : copyPrevious())}
        >
          {copy.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Copy aria-hidden />}
          העתקה מהחודש הקודם
        </Button>
      )}
    </div>
  )

  return (
    <>
      <PageHeader title="תקציב" />
      <div className="-ms-3 mb-5">
        <PeriodPicker period={period} today={today} onChange={setPeriod} />
      </div>

      {budget.isPending ? (
        <LoadingState />
      ) : budget.isError ? (
        <ErrorState
          title="לא הצלחנו לטעון את התקציב"
          description="בדקו את החיבור ונסו שוב."
          onRetry={() => void budget.refetch()}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {hasBudget || hasActivity ? (
            <section
              aria-label={`תקציב ${label}`}
              className="rounded-3xl border bg-card p-5 sm:p-6"
            >
              <BudgetSummary budget={budget.data} />
              {!hasBudget && (
                <p className="mt-4 text-sm text-muted-foreground">
                  עדיין לא הוגדר תקציב ל{label}. קבעו תקציב כדי לראות כמה נוצל וכמה נשאר.
                </p>
              )}
              <div className="mt-5">{actions}</div>
            </section>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <EmptyState
                className="w-full"
                icon={Wallet}
                title={`עדיין לא הוגדר תקציב ל${label}`}
                description="קבעו כמה אתם מתכננים להוציא בכל קטגוריה, ותראו כאן כמה נוצל וכמה נשאר."
              />
              {actions}
            </div>
          )}

          {budgeted.length > 0 && (
            <section aria-labelledby="budgeted-title">
              <h2 id="budgeted-title" className="mb-1 font-heading text-xl font-semibold">
                לפי קטגוריה
              </h2>
              <ul className="divide-y">
                {budgeted.map((item) => (
                  <li key={item.category.id}>
                    <CategoryBudgetRow item={item} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {unbudgeted.length > 0 && (
            <section aria-labelledby="unbudgeted-title">
              <h2 id="unbudgeted-title" className="mb-1 font-heading text-xl font-semibold">
                הוצאות ללא תקציב
              </h2>
              <ul className="divide-y">
                {unbudgeted.map((item) => (
                  <li key={item.category.id}>
                    <CategoryBudgetRow item={item} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <Sheet open={editing} onOpenChange={setEditing} title={`תקציב ${label}`}>
        {editing && budget.data && (
          <BudgetEditor budget={budget.data} periodLabel={label} onDone={() => setEditing(false)} />
        )}
      </Sheet>
      <ConfirmDialog
        open={confirmingCopy}
        onOpenChange={setConfirmingCopy}
        title="להחליף את התקציב של החודש?"
        description="התקציב הנוכחי יוחלף בתקציב של החודש הקודם. אפשר לערוך אחר כך."
        confirmLabel="החלפה"
        onConfirm={copyPrevious}
        pending={copy.isPending}
      />
    </>
  )
}
