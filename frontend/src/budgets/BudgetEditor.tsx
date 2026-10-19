import { Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { useCategories } from '@/categories/api'
import { CategoryIconBadge } from '@/categories/CategoryBadge'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { describeError } from '@/lib/errors'
import {
  amountToInput,
  formatMoney,
  parseAmountInput,
  subtractAmounts,
  sumAmounts,
} from '@/lib/money'
import { tr } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { type BudgetMonth, useSaveBudget } from './api'

type BudgetEditorProps = { budget: BudgetMonth; periodLabel: string; onDone: () => void }

/**
 * Amounts for the month: one per expense category and an optional overall ceiling.
 * The categories may not add up to more than the ceiling; the rest stays unallocated.
 */
export function BudgetEditor({ budget, periodLabel, onDone }: BudgetEditorProps) {
  const categories = useCategories()
  const save = useSaveBudget(budget.month)
  const [total, setTotal] = useState(budget.total_budget ? amountToInput(budget.total_budget) : '')
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      budget.categories
        .filter((c) => c.budget)
        .map((c) => [c.category.id, amountToInput(c.budget!)]),
    ),
  )
  const [submitted, setSubmitted] = useState(false)

  // Active expense categories, plus archived ones that still have a budget this month.
  const options = (categories.data ?? []).filter(
    (c) => c.kind === 'expense' && (!c.archived || amounts[c.id] !== undefined),
  )
  const invalid = (text: string) => text.trim() !== '' && parseAmountInput(text) === null
  const allocated = sumAmounts(
    Object.values(amounts)
      .map(parseAmountInput)
      .filter((amount): amount is string => amount !== null),
  )
  const ceiling = parseAmountInput(total)
  const unallocated = ceiling === null ? null : subtractAmounts(ceiling, allocated)
  const overCeiling = unallocated !== null && unallocated.startsWith('-')
  const hasErrors = invalid(total) || Object.values(amounts).some(invalid) || overCeiling

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (hasErrors) return
    const rows = Object.entries(amounts)
      .map(([category_id, text]) => ({ category_id, amount: parseAmountInput(text) }))
      .filter((row): row is { category_id: string; amount: string } => row.amount !== null)
    save.mutate(
      { total: parseAmountInput(total), categories: rows },
      {
        onSuccess: () => {
          toast.success(
            tr({ he: `התקציב ל${periodLabel} נשמר`, en: `Budget for ${periodLabel} saved` }),
          )
          onDone()
        },
      },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <TextField
        label={tr({ he: 'תקציב כולל לחודש (לא חובה)', en: 'Total monthly budget (optional)' })}
        inputMode="decimal"
        placeholder={tr({ he: 'לא הוגדר', en: 'Not set' })}
        value={total}
        onChange={(event) => setTotal(event.target.value)}
        aria-invalid={(submitted && invalid(total)) || overCeiling}
        hint={tr({
          he: 'כמה מותר להוציא החודש בסך הכול. בלי סכום כאן, התקציב הכולל הוא סכום הקטגוריות.',
          en: 'How much you can spend this month in total. Without an amount here, the total is the sum of the categories.',
        })}
      />

      <AllocationSummary allocated={allocated} unallocated={unallocated} />

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-2 text-sm font-medium">
          {tr({ he: 'תקציב לפי קטגוריה', en: 'Budget by category' })}
        </legend>
        {options.map((category) => {
          const value = amounts[category.id] ?? ''
          return (
            <label key={category.id} className="flex items-center gap-3 py-1.5">
              <CategoryIconBadge color={category.color} icon={category.icon} className="size-9" />
              <span className="min-w-0 flex-1 truncate">
                {category.name}
                {category.archived && (
                  <span className="text-muted-foreground">
                    {tr({ he: ' (נמחקה)', en: ' (deleted)' })}
                  </span>
                )}
              </span>
              <span className="relative w-32 shrink-0">
                <input
                  inputMode="decimal"
                  placeholder={tr({ he: 'ללא', en: 'None' })}
                  value={value}
                  onChange={(event) =>
                    setAmounts((current) => ({ ...current, [category.id]: event.target.value }))
                  }
                  aria-invalid={submitted && invalid(value)}
                  className="h-11 w-full rounded-xl border border-input bg-card ps-3 pe-8 text-base tabular-nums outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                >
                  ₪
                </span>
              </span>
            </label>
          )
        })}
      </fieldset>

      {submitted && hasErrors && !overCeiling && (
        <p role="alert" className="text-sm text-destructive">
          {tr({
            he: 'יש סכום לא תקין. צריך מספר חיובי (עד שתי ספרות אחרי הנקודה), או להשאיר ריק.',
            en: 'An amount is invalid. Enter a positive number (up to two decimal places), or leave it empty.',
          })}
        </p>
      )}
      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {describeError(save.error)}
        </p>
      )}

      <Button type="submit" size="lg" disabled={save.isPending}>
        {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
        {tr({ he: 'שמירת התקציב', en: 'Save budget' })}
      </Button>
    </form>
  )
}

/** Live split of the month: how much went to categories and what is left of the ceiling. */
function AllocationSummary({
  allocated,
  unallocated,
}: {
  allocated: string
  unallocated: string | null
}) {
  const over = unallocated?.startsWith('-') ?? false
  return (
    <div
      aria-live="polite"
      className={cn(
        'flex flex-col gap-1.5 rounded-2xl bg-muted px-4 py-3 text-sm',
        over && 'bg-destructive/10',
      )}
    >
      <p className="flex justify-between gap-2">
        <span className="text-muted-foreground">
          {tr({ he: 'מתוכנן לפי קטגוריות', en: 'Planned by category' })}
        </span>
        <span className="font-semibold tabular-nums">{formatMoney(allocated)}</span>
      </p>
      {unallocated !== null && (
        <p
          role={over ? 'alert' : undefined}
          className={cn('flex justify-between gap-2', over && 'font-medium text-destructive')}
        >
          <span>
            {over
              ? tr({ he: 'חריגה מהתקציב הכולל', en: 'Over the total budget' })
              : tr({ he: 'שארית', en: 'Unallocated' })}
          </span>
          <span className="font-semibold tabular-nums">
            {formatMoney(over ? unallocated.slice(1) : unallocated)}
          </span>
        </p>
      )}
    </div>
  )
}
