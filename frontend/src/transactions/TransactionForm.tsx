import { ChevronDown, Loader2, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { type Kind, useCategories } from '@/categories/api'
import { useBudgetAlert } from '@/budgets/budgetAlert'
import { CategoryIconBadge } from '@/categories/CategoryBadge'
import { CategoryPicker } from '@/categories/CategoryPicker'
import { AmountField } from '@/components/AmountField'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PartyPicker } from '@/components/PartyPicker'
import { Segmented } from '@/components/Segmented'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import type { Member } from '@/household/api'
import { newRequestId } from '@/lib/api'
import { todayIso } from '@/lib/dates'
import { describeError } from '@/lib/errors'
import { amountToInput, parseAmountInput } from '@/lib/money'
import { cn } from '@/lib/utils'
import {
  type Transaction,
  type TransactionStatus,
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from './api'
import { defaultStatusFor, partyName, STATUS_OPTIONS, TRANSACTION_KIND_OPTIONS } from './labels'
import { lastParty, rememberParty } from './lastParty'

type TransactionFormProps = {
  transaction?: Transaction
  initialKind: Kind
  /** Preselected category for a new transaction, e.g. from the main screen. */
  initialCategoryId?: string
  members: Member[]
  userId: string
  onDone: () => void
}

export function TransactionForm({
  transaction,
  initialKind,
  initialCategoryId,
  members,
  userId,
  onDone,
}: TransactionFormProps) {
  const categories = useCategories()
  const [kind, setKind] = useState<Kind>(transaction?.kind ?? initialKind)
  const [amountText, setAmountText] = useState(transaction ? amountToInput(transaction.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(
    transaction?.category.id ?? initialCategoryId ?? null,
  )
  const [date, setDate] = useState(transaction?.occurred_on ?? todayIso())
  const [status, setStatus] = useState<TransactionStatus>(transaction?.status ?? 'completed')
  const [statusTouched, setStatusTouched] = useState(Boolean(transaction))
  const [party, setParty] = useState<string | null>(() =>
    transaction ? transaction.party_user_id : lastParty(members, userId),
  )
  // Details (date, status, payer, description) start open; they can be collapsed.
  const [showDetails, setShowDetails] = useState(true)
  // Opened from a category on the main screen: the category is known, so the form
  // starts at the amount. "שינוי" brings back the full picker.
  const [pickingCategory, setPickingCategory] = useState(!initialCategoryId || Boolean(transaction))
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const create = useCreateTransaction()
  const [requestId, setRequestId] = useState(() => newRequestId())
  const update = useUpdateTransaction()
  const remove = useDeleteTransaction()
  const checkBudget = useBudgetAlert()
  const mutation = transaction ? update : create

  const amount = parseAmountInput(amountText)
  const selectedCategory = categories.data?.find((c) => c.id === categoryId)
  const amountError =
    submitted && !amount ? 'הזינו סכום חיובי, עד שתי ספרות אחרי הנקודה.' : undefined

  function changeKind(next: Kind) {
    setKind(next)
    // Categories are per kind; keep the choice only if it still fits.
    const current = categories.data?.find((c) => c.id === categoryId)
    if (current && current.kind !== next) setCategoryId(null)
  }

  function changeDate(next: string) {
    setDate(next)
    if (!statusTouched && next) setStatus(defaultStatusFor(next))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!date) setShowDetails(true)
    if (!amount || !categoryId || !date) return
    rememberParty(party)
    const body = {
      kind,
      amount,
      occurred_on: date,
      category_id: categoryId,
      description: description.trim(),
      status,
      party_user_id: party,
    }
    const onSuccess = () => {
      toast.success(
        transaction ? 'התנועה עודכנה' : kind === 'expense' ? 'ההוצאה נוספה' : 'ההכנסה נוספה',
      )
      // Only completed expenses count against the budget.
      if (kind === 'expense' && status === 'completed') void checkBudget(date, categoryId)
      onDone()
    }
    if (transaction) update.mutate({ id: transaction.id, ...body }, { onSuccess })
    else
      create.mutate(
        { ...body, request_id: requestId },
        {
          onSuccess: () => {
            setRequestId(newRequestId())
            onSuccess()
          },
        },
      )
  }

  function confirmDelete() {
    if (!transaction) return
    remove.mutate(transaction.id, {
      onSuccess: () => {
        toast.success('התנועה נמחקה')
        setConfirmingDelete(false)
        onDone()
      },
      onError: (error) => toast.error(describeError(error)),
    })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {pickingCategory && (
        <Segmented
          label="סוג התנועה"
          options={TRANSACTION_KIND_OPTIONS}
          value={kind}
          onChange={changeKind}
        />
      )}

      <AmountField
        label="סכום"
        value={amountText}
        onChange={setAmountText}
        error={amountError}
        autoFocus={!transaction}
        tone={kind}
      />

      {categories.isPending ? (
        <p className="text-sm text-muted-foreground">טוען קטגוריות…</p>
      ) : !pickingCategory && selectedCategory ? (
        <div className="flex items-center gap-3 rounded-2xl border px-3 py-2">
          <CategoryIconBadge color={selectedCategory.color} icon={selectedCategory.icon} />
          <span className="flex-1">
            <span className="block text-xs text-muted-foreground">קטגוריה</span>
            <span className="font-semibold">{selectedCategory.name}</span>
          </span>
          <Button type="button" variant="ghost" onClick={() => setPickingCategory(true)}>
            שינוי
          </Button>
        </div>
      ) : (
        <CategoryPicker
          categories={categories.data ?? []}
          kind={kind}
          value={categoryId}
          onChange={setCategoryId}
          invalid={submitted && !categoryId}
        />
      )}

      <div className="flex flex-col gap-4">
        <button
          type="button"
          aria-expanded={showDetails}
          aria-controls="transaction-details"
          onClick={() => setShowDetails((open) => !open)}
          className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-muted px-4 py-2 text-start text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="min-w-0">
            <span className="font-semibold">עוד פרטים</span>
            {!showDetails && (
              <span className="block truncate text-muted-foreground">
                {detailsSummary(date, status, partyName(party, members), description)}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn('size-5 shrink-0 transition-transform', showDetails && 'rotate-180')}
            aria-hidden
          />
        </button>
        {showDetails && (
          <div id="transaction-details" className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="תאריך"
              type="date"
              value={date}
              min="1900-01-01"
              max="2100-12-31"
              required
              onChange={(event) => changeDate(event.target.value)}
            />
            <Segmented
              label="סטטוס"
              showLabel
              options={STATUS_OPTIONS}
              value={status}
              onChange={(next) => {
                setStatus(next)
                setStatusTouched(true)
              }}
            />
          </div>

          <PartyPicker
            label={kind === 'expense' ? 'מי שילם' : 'מי קיבל'}
            members={members}
            value={party}
            onChange={setParty}
          />

          <TextField
            label="תיאור (לא חובה)"
            value={description}
            maxLength={120}
            onChange={(event) => setDescription(event.target.value)}
          />

          </div>
        )}
      </div>

      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {describeError(mutation.error)}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="lg" className="flex-1" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="animate-spin" aria-hidden />}
          {transaction ? 'שמירת השינויים' : kind === 'expense' ? 'הוספת ההוצאה' : 'הוספת ההכנסה'}
        </Button>
        {transaction && (
          <Button
            type="button"
            size="lg"
            variant="destructive"
            aria-label="מחיקת התנועה"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="למחוק את התנועה?"
        description="התנועה תימחק לצמיתות, גם אצל בן/בת הזוג."
        confirmLabel="מחיקה"
        onConfirm={confirmDelete}
        pending={remove.isPending}
      />
    </form>
  )
}

/** "היום · בוצעה · שילם/ה: אוריה" — what will be saved while the details are closed. */
function detailsSummary(date: string, status: TransactionStatus, party: string, note: string) {
  const day = date === todayIso() ? 'היום' : date.split('-').reverse().join('.')
  const statusLabel = STATUS_OPTIONS.find((option) => option.value === status)?.label ?? ''
  return [day, statusLabel, party, note.trim()].filter(Boolean).join(' · ')
}
