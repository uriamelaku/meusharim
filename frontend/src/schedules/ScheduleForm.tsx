import { Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { type Kind, useCategories } from '@/categories/api'
import { CategoryPicker } from '@/categories/CategoryPicker'
import { AmountField } from '@/components/AmountField'
import { PartyPicker } from '@/components/PartyPicker'
import { Segmented } from '@/components/Segmented'
import { TextField } from '@/components/TextField'
import { ToggleField } from '@/components/ToggleField'
import { Button } from '@/components/ui/button'
import type { Member } from '@/household/api'
import { todayIso } from '@/lib/dates'
import { describeError } from '@/lib/errors'
import { amountToInput, formatMoney, parseAmountInput, previewInstallments } from '@/lib/money'
import { TRANSACTION_KIND_OPTIONS } from '@/transactions/labels'
import {
  type Frequency,
  type Schedule,
  type ScheduleInput,
  type ScheduleType,
  useCreateSchedule,
  useUpdateSchedule,
} from './api'
import { FREQUENCY_OPTIONS } from './labels'

const MIN_INSTALLMENTS = 2
const MAX_INSTALLMENTS = 360

type ScheduleFormProps = {
  type: ScheduleType
  schedule?: Schedule
  initialKind: Kind
  /** Preselected category for a new entry. */
  initialCategoryId?: string
  members: Member[]
  userId: string
  onDone: () => void
}

/** Creates or edits a recurring entry or an installment plan. */
export function ScheduleForm({
  type,
  schedule,
  initialKind,
  initialCategoryId,
  members,
  userId,
  onDone,
}: ScheduleFormProps) {
  const categories = useCategories()
  const isInstallments = type === 'installments'
  // Installment plans cannot change their amounts or dates once a payment was recorded.
  const planLocked = isInstallments && Boolean(schedule && schedule.recorded_count > 0)
  const started = Boolean(schedule && schedule.recorded_count > 0)

  const [kind, setKind] = useState<Kind>(
    schedule?.kind ?? (isInstallments ? 'expense' : initialKind),
  )
  const [amountText, setAmountText] = useState(() => {
    const amount = isInstallments ? schedule?.total_amount : schedule?.amount
    return amount ? amountToInput(amount) : ''
  })
  const [countText, setCountText] = useState(String(schedule?.installments_count ?? 12))
  const [categoryId, setCategoryId] = useState<string | null>(
    schedule?.category.id ?? initialCategoryId ?? null,
  )
  const [frequency, setFrequency] = useState<Frequency>(schedule?.frequency ?? 'monthly')
  const [startDate, setStartDate] = useState(schedule?.start_date ?? todayIso())
  const [endDate, setEndDate] = useState(schedule?.end_date ?? '')
  const [party, setParty] = useState<string | null>(schedule ? schedule.party_user_id : userId)
  const [description, setDescription] = useState(schedule?.description ?? '')
  const [autoConfirm, setAutoConfirm] = useState(schedule?.auto_confirm ?? isInstallments)
  const [submitted, setSubmitted] = useState(false)

  const create = useCreateSchedule()
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const update = useUpdateSchedule()
  const mutation = schedule ? update : create

  const amount = parseAmountInput(amountText)
  const count = Number(countText)
  const countValid =
    Number.isInteger(count) && count >= MIN_INSTALLMENTS && count <= MAX_INSTALLMENTS
  const split = isInstallments && amount && countValid ? previewInstallments(amount, count) : null
  const endBeforeStart = Boolean(endDate) && endDate < startDate

  const errors = {
    amount: !amount ? 'הזינו סכום חיובי, עד שתי ספרות אחרי הנקודה.' : undefined,
    count:
      isInstallments && !countValid
        ? `בין ${MIN_INSTALLMENTS} ל-${MAX_INSTALLMENTS} תשלומים.`
        : undefined,
    split:
      isInstallments && amount && countValid && !split
        ? 'הסכום קטן מדי למספר התשלומים.'
        : undefined,
    category: !categoryId,
    endDate: endBeforeStart ? 'תאריך הסיום לפני תאריך ההתחלה.' : undefined,
  }
  const valid =
    !errors.amount && !errors.count && !errors.split && !errors.category && !errors.endDate

  function changeKind(next: Kind) {
    setKind(next)
    const current = categories.data?.find((c) => c.id === categoryId)
    if (current && current.kind !== next) setCategoryId(null)
  }

  function buildInput(): ScheduleInput {
    const common = {
      kind,
      category_id: categoryId!,
      description: description.trim(),
      party_user_id: party,
      start_date: startDate,
      auto_confirm: autoConfirm,
    }
    return isInstallments
      ? { ...common, type: 'installments', total_amount: amount!, installments_count: count }
      : { ...common, type: 'recurring', frequency, end_date: endDate || null, amount: amount! }
  }

  /** Only what changed, so the server can tell edits of future occurrences from timing changes. */
  function changesFrom(original: Schedule, input: ScheduleInput): Record<string, unknown> {
    const changes: Record<string, unknown> = {}
    const compare: [string, unknown, unknown][] = [
      ['category_id', input.category_id, original.category.id],
      ['description', input.description, original.description],
      ['party_user_id', input.party_user_id, original.party_user_id],
      ['auto_confirm', input.auto_confirm, original.auto_confirm],
      ['start_date', input.start_date, original.start_date],
    ]
    if (input.type === 'recurring') {
      compare.push(
        ['frequency', input.frequency, original.frequency],
        ['end_date', input.end_date, original.end_date],
        ['amount', input.amount, original.amount],
      )
    } else {
      compare.push(
        ['total_amount', input.total_amount, original.total_amount],
        ['installments_count', input.installments_count, original.installments_count],
      )
    }
    for (const [field, next, previous] of compare) if (next !== previous) changes[field] = next
    return changes
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!valid) return
    const input = buildInput()
    if (schedule) {
      const changes = changesFrom(schedule, input)
      if (Object.keys(changes).length === 0) return onDone()
      update.mutate(
        { id: schedule.id, changes },
        {
          onSuccess: (result) => {
            toast.success(
              result.id === schedule.id
                ? 'השינויים נשמרו'
                : 'נשמר. מהמועד החדש ממשיכה הוראה מעודכנת.',
            )
            onDone()
          },
        },
      )
    } else {
      create.mutate(
        { ...input, request_id: requestId },
        {
          onSuccess: () => {
            setRequestId(crypto.randomUUID())
            toast.success(isInstallments ? 'התשלומים נוספו' : 'הוראת הקבע נוספה')
            onDone()
          },
        },
      )
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {!isInstallments && !schedule && (
        <Segmented
          label="סוג"
          options={TRANSACTION_KIND_OPTIONS}
          value={kind}
          onChange={changeKind}
        />
      )}

      <AmountField
        label={isInstallments ? 'סכום כולל של הרכישה' : 'סכום בכל פעם'}
        value={amountText}
        onChange={setAmountText}
        error={submitted ? errors.amount : undefined}
        autoFocus={!schedule}
        tone={kind}
        disabled={planLocked}
      />

      {isInstallments && (
        <div className="flex flex-col gap-2">
          <TextField
            label="מספר תשלומים"
            inputMode="numeric"
            value={countText}
            disabled={planLocked}
            onChange={(event) => setCountText(event.target.value.replace(/\D/g, ''))}
            aria-invalid={submitted && Boolean(errors.count || errors.split)}
          />
          {split ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {split.first === split.rest
                ? `${count} תשלומים של ${formatMoney(split.rest)}`
                : `${count} תשלומים: הראשון ${formatMoney(split.first)}, והשאר ${formatMoney(split.rest)}`}
            </p>
          ) : (
            submitted && (
              <p role="alert" className="text-sm text-destructive">
                {errors.count ?? errors.split}
              </p>
            )
          )}
        </div>
      )}

      {categories.isPending ? (
        <p className="text-sm text-muted-foreground">טוען קטגוריות…</p>
      ) : (
        <CategoryPicker
          categories={categories.data ?? []}
          kind={kind}
          value={categoryId}
          onChange={setCategoryId}
          invalid={submitted && errors.category}
        />
      )}

      {!isInstallments && (
        <Segmented
          label="תדירות"
          showLabel
          options={FREQUENCY_OPTIONS}
          value={frequency}
          onChange={setFrequency}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={isInstallments ? 'תאריך התשלום הראשון' : 'תאריך התחלה'}
          type="date"
          value={startDate}
          min="1900-01-01"
          max="2100-12-31"
          disabled={planLocked}
          required
          onChange={(event) => setStartDate(event.target.value)}
        />
        {!isInstallments && (
          <TextField
            label="תאריך סיום (לא חובה)"
            type="date"
            value={endDate}
            min={startDate}
            max="2100-12-31"
            onChange={(event) => setEndDate(event.target.value)}
            aria-invalid={Boolean(errors.endDate) || undefined}
            hint={errors.endDate}
          />
        )}
      </div>

      {planLocked && (
        <p className="rounded-2xl bg-muted/60 p-3 text-sm text-muted-foreground">
          כבר נרשמו תשלומים, ולכן אי אפשר לשנות סכום, מספר תשלומים או תאריך. אפשר לבטל ולהזין מחדש.
        </p>
      )}
      {started && !isInstallments && (
        <p className="rounded-2xl bg-muted/60 p-3 text-sm text-muted-foreground">
          שינויים יחולו רק על המועדים הבאים. תנועות שכבר נרשמו נשארות כפי שהן.
        </p>
      )}

      <PartyPicker
        label={kind === 'expense' ? 'מי משלם' : 'מי מקבל'}
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

      <ToggleField
        label="לסמן כבוצע אוטומטית במועד"
        description={
          autoConfirm
            ? 'במועד התנועה תיכנס ישר למאזן.'
            : 'במועד התנועה תופיע ב"ממתינות לאישור" עד שתאשרו שבוצעה.'
        }
        checked={autoConfirm}
        onChange={setAutoConfirm}
      />

      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {describeError(mutation.error)}
        </p>
      )}

      <Button type="submit" size="lg" disabled={mutation.isPending}>
        {mutation.isPending && <Loader2 className="animate-spin" aria-hidden />}
        {schedule ? 'שמירת השינויים' : isInstallments ? 'הוספת התשלומים' : 'הוספת הוראת הקבע'}
      </Button>
    </form>
  )
}
