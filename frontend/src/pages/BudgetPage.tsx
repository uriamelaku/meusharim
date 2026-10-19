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
import { GoalsSection } from '@/goals/GoalsSection'
import { useSelectedPeriod } from '@/hooks/useSelectedPeriod'
import { describeError } from '@/lib/errors'
import { tr } from '@/lib/i18n'
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
        toast.success(tr({ he: 'התקציב הועתק מהחודש הקודם', en: 'Budget copied from last month' }))
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
        {hasBudget
          ? tr({ he: 'עריכת התקציב', en: 'Edit budget' })
          : tr({ he: 'הגדרת תקציב', en: 'Set a budget' })}
      </Button>
      {budget.data.previous_month_has_budget && (
        <Button
          variant="ghost"
          disabled={copy.isPending}
          onClick={() => (hasBudget ? setConfirmingCopy(true) : copyPrevious())}
        >
          {copy.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Copy aria-hidden />}
          {tr({ he: 'העתקה מהחודש הקודם', en: 'Copy from last month' })}
        </Button>
      )}
    </div>
  )

  return (
    <>
      <PageHeader title={tr({ he: 'תקציב', en: 'Budget' })} />
      <div className="-ms-3 mb-5">
        <PeriodPicker period={period} today={today} onChange={setPeriod} />
      </div>

      {budget.isPending ? (
        <LoadingState />
      ) : budget.isError ? (
        <ErrorState
          title={tr({ he: 'לא הצלחנו לטעון את התקציב', en: "We couldn't load the budget" })}
          description={tr({ he: 'בדקו את החיבור ונסו שוב.', en: 'Check your connection and try again.' })}
          onRetry={() => void budget.refetch()}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {hasBudget || hasActivity ? (
            <section
              aria-label={tr({ he: `תקציב ${label}`, en: `Budget for ${label}` })}
              className="rounded-3xl border bg-card p-5 sm:p-6"
            >
              <BudgetSummary budget={budget.data} />
              {!hasBudget && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {tr({
                    he: `עדיין לא הוגדר תקציב ל${label}. כשיוגדר, יופיע כאן כמה נוצל וכמה נשאר.`,
                    en: `No budget set for ${label} yet. Once it is, you'll see here how much is used and how much is left.`,
                  })}
                </p>
              )}
              <div className="mt-5">{actions}</div>
            </section>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <EmptyState
                className="w-full"
                icon={Wallet}
                title={tr({
                  he: `עדיין לא הוגדר תקציב ל${label}`,
                  en: `No budget set for ${label} yet`,
                })}
                description={tr({
                  he: 'מגדירים כמה מתכננים להוציא בכל קטגוריה, ורואים כאן כמה נוצל וכמה נשאר.',
                  en: 'Plan how much to spend in each category, and see here how much is used and how much is left.',
                })}
              />
              {actions}
            </div>
          )}

          {budgeted.length > 0 && (
            <section aria-labelledby="budgeted-title">
              <h2 id="budgeted-title" className="mb-1 font-heading text-xl font-semibold">
                {tr({ he: 'לפי קטגוריה', en: 'By category' })}
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

          <GoalsSection />

          {unbudgeted.length > 0 && (
            <section aria-labelledby="unbudgeted-title">
              <h2 id="unbudgeted-title" className="mb-1 font-heading text-xl font-semibold">
                {tr({ he: 'הוצאות ללא תקציב', en: 'Spending without a budget' })}
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

      <Sheet
        open={editing}
        onOpenChange={setEditing}
        title={tr({ he: `תקציב ${label}`, en: `Budget for ${label}` })}
      >
        {editing && budget.data && (
          <BudgetEditor budget={budget.data} periodLabel={label} onDone={() => setEditing(false)} />
        )}
      </Sheet>
      <ConfirmDialog
        open={confirmingCopy}
        onOpenChange={setConfirmingCopy}
        title={tr({ he: 'להחליף את התקציב של החודש?', en: "Replace this month's budget?" })}
        description={tr({
          he: 'התקציב הנוכחי יוחלף בתקציב של החודש הקודם. אפשר לערוך אחר כך.',
          en: "The current budget will be replaced with last month's. You can edit it afterwards.",
        })}
        confirmLabel={tr({ he: 'החלפה', en: 'Replace' })}
        onConfirm={copyPrevious}
        pending={copy.isPending}
      />
    </>
  )
}
