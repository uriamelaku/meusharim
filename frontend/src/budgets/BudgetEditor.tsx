import { Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { useCategories } from '@/categories/api'
import { CategoryIconBadge } from '@/categories/CategoryBadge'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { describeError } from '@/lib/errors'
import { amountToInput, parseAmountInput } from '@/lib/money'
import { type BudgetMonth, useSaveBudget } from './api'

type BudgetEditorProps = { budget: BudgetMonth; periodLabel: string; onDone: () => void }

/** Amounts for the month: an optional overall budget and one per expense category. */
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
  const hasErrors = invalid(total) || Object.values(amounts).some(invalid)

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
          toast.success(`התקציב ל${periodLabel} נשמר`)
          onDone()
        },
      },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <TextField
        label="תקציב כולל לחודש (לא חובה)"
        inputMode="decimal"
        placeholder="סכום התקציבים לפי קטגוריה"
        value={total}
        onChange={(event) => setTotal(event.target.value)}
        aria-invalid={submitted && invalid(total)}
        hint="אם לא תמלאו, התקציב הכולל יהיה סכום התקציבים של הקטגוריות."
      />

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-2 text-sm font-medium">תקציב לפי קטגוריה</legend>
        {options.map((category) => {
          const value = amounts[category.id] ?? ''
          return (
            <label key={category.id} className="flex items-center gap-3 py-1.5">
              <CategoryIconBadge color={category.color} icon={category.icon} className="size-9" />
              <span className="min-w-0 flex-1 truncate">
                {category.name}
                {category.archived && <span className="text-muted-foreground"> (נמחקה)</span>}
              </span>
              <span className="relative w-32 shrink-0">
                <input
                  inputMode="decimal"
                  placeholder="ללא"
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

      {submitted && hasErrors && (
        <p role="alert" className="text-sm text-destructive">
          יש סכום לא תקין. הזינו מספר חיובי עד שתי ספרות אחרי הנקודה, או השאירו ריק.
        </p>
      )}
      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {describeError(save.error)}
        </p>
      )}

      <Button type="submit" size="lg" disabled={save.isPending}>
        {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
        שמירת התקציב
      </Button>
    </form>
  )
}
