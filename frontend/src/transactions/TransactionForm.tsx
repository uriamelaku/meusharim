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
import { formatRelativeDay, todayIso } from '@/lib/dates'
import { describeError } from '@/lib/errors'
import { tr } from '@/lib/i18n'
import { amountToInput, parseAmountInput } from '@/lib/money'
import { cn } from '@/lib/utils'
import {
  type Transaction,
  type TransactionStatus,
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from './api'
import {
  defaultStatusFor,
  partyName,
  statusLabel,
  statusOptions,
  TRANSACTION_KIND_OPTIONS,
} from './labels'
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
  const partner =
    members.find((m) => m.user_id !== userId)?.display_name ??
    tr({ he: 'בן או בת הזוג', en: 'your partner' })
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
  // starts at the amount. "Change" brings back the full picker.
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
    submitted && !amount
      ? tr({
          he: 'צריך סכום חיובי (עד שתי ספרות אחרי הנקודה).',
          en: 'Please enter a positive amount (up to two decimal places).',
        })
      : undefined

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
        transaction
          ? tr({ he: 'השינויים נשמרו', en: 'Changes saved' })
          : kind === 'expense'
            ? tr({ he: 'ההוצאה נוספה', en: 'Expense added' })
            : tr({ he: 'ההכנסה נוספה', en: 'Income added' }),
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
        toast.success(
          kind === 'expense'
            ? tr({ he: 'ההוצאה נמחקה', en: 'Expense deleted' })
            : tr({ he: 'ההכנסה נמחקה', en: 'Income deleted' }),
        )
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
          label={tr({ he: 'הוצאה או הכנסה', en: 'Expense or income' })}
          options={TRANSACTION_KIND_OPTIONS}
          value={kind}
          onChange={changeKind}
        />
      )}

      <AmountField
        label={tr({ he: 'סכום', en: 'Amount' })}
        value={amountText}
        onChange={setAmountText}
        error={amountError}
        autoFocus={!transaction}
        tone={kind}
      />

      {categories.isPending ? (
        <p className="text-sm text-muted-foreground">
          {tr({ he: 'טוען קטגוריות…', en: 'Loading categories…' })}
        </p>
      ) : !pickingCategory && selectedCategory ? (
        <div className="flex items-center gap-3 rounded-2xl border px-3 py-2">
          <CategoryIconBadge color={selectedCategory.color} icon={selectedCategory.icon} />
          <span className="flex-1">
            <span className="block text-xs text-muted-foreground">
              {tr({ he: 'קטגוריה', en: 'Category' })}
            </span>
            <span className="font-semibold">{selectedCategory.name}</span>
          </span>
          <Button type="button" variant="ghost" onClick={() => setPickingCategory(true)}>
            {tr({ he: 'שינוי', en: 'Change' })}
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
            <span className="font-semibold">{tr({ he: 'עוד פרטים', en: 'More details' })}</span>
            {!showDetails && (
              <span className="block truncate text-muted-foreground">
                {detailsSummary(date, status, kind, partyName(party, members), description)}
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
              label={tr({ he: 'תאריך', en: 'Date' })}
              type="date"
              value={date}
              min="1900-01-01"
              max="2100-12-31"
              required
              onChange={(event) => changeDate(event.target.value)}
            />
            <Segmented
              label={
                kind === 'expense'
                  ? tr({ he: 'שולם?', en: 'Paid?' })
                  : tr({ he: 'התקבל?', en: 'Received?' })
              }
              showLabel
              options={statusOptions(kind)}
              value={status}
              onChange={(next) => {
                setStatus(next)
                setStatusTouched(true)
              }}
            />
          </div>

          <PartyPicker
            label={
              kind === 'expense'
                ? tr({ he: 'מי שילם', en: 'Who paid' })
                : tr({ he: 'מי קיבל', en: 'Who received it' })
            }
            members={members}
            value={party}
            onChange={setParty}
          />

          <TextField
            label={tr({ he: 'תיאור (לא חובה)', en: 'Description (optional)' })}
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
          {transaction
            ? tr({ he: 'שמירת השינויים', en: 'Save changes' })
            : kind === 'expense'
              ? tr({ he: 'הוספת ההוצאה', en: 'Add expense' })
              : tr({ he: 'הוספת ההכנסה', en: 'Add income' })}
        </Button>
        {transaction && (
          <Button
            type="button"
            size="lg"
            variant="destructive"
            aria-label={
              kind === 'expense'
                ? tr({ he: 'מחיקת ההוצאה', en: 'Delete expense' })
                : tr({ he: 'מחיקת ההכנסה', en: 'Delete income' })
            }
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={
          kind === 'expense'
            ? tr({ he: 'למחוק את ההוצאה?', en: 'Delete this expense?' })
            : tr({ he: 'למחוק את ההכנסה?', en: 'Delete this income?' })
        }
        description={tr({
          he: `היא תימחק לצמיתות, גם אצל ${partner}.`,
          en: `It will be permanently deleted, for ${partner} too.`,
        })}
        confirmLabel={tr({ he: 'מחיקה', en: 'Delete' })}
        onConfirm={confirmDelete}
        pending={remove.isPending}
      />
    </form>
  )
}

/** "Today · Paid · Noa": what will be saved while the details are closed. */
function detailsSummary(
  date: string,
  status: TransactionStatus,
  kind: Kind,
  party: string,
  note: string,
) {
  return [formatRelativeDay(date), statusLabel(status, kind), party, note.trim()]
    .filter(Boolean)
    .join(' · ')
}
