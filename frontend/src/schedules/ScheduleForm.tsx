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
import { newRequestId } from '@/lib/api'
import { todayIso } from '@/lib/dates'
import { describeError } from '@/lib/errors'
import { tr } from '@/lib/i18n'
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
  const [requestId, setRequestId] = useState(() => newRequestId())
  const update = useUpdateSchedule()
  const mutation = schedule ? update : create

  const amount = parseAmountInput(amountText)
  const count = Number(countText)
  const countValid =
    Number.isInteger(count) && count >= MIN_INSTALLMENTS && count <= MAX_INSTALLMENTS
  const split = isInstallments && amount && countValid ? previewInstallments(amount, count) : null
  const endBeforeStart = Boolean(endDate) && endDate < startDate

  const errors = {
    amount: !amount
      ? tr({
          he: 'צריך סכום חיובי (עד שתי ספרות אחרי הנקודה).',
          en: 'Please enter a positive amount (up to two decimal places).',
        })
      : undefined,
    count:
      isInstallments && !countValid
        ? tr({
            he: `בין ${MIN_INSTALLMENTS} ל-${MAX_INSTALLMENTS} תשלומים.`,
            en: `Between ${MIN_INSTALLMENTS} and ${MAX_INSTALLMENTS} installments.`,
          })
        : undefined,
    split:
      isInstallments && amount && countValid && !split
        ? tr({
            he: 'הסכום קטן מדי למספר התשלומים.',
            en: 'The amount is too small for this number of installments.',
          })
        : undefined,
    category: !categoryId,
    endDate: endBeforeStart
      ? tr({ he: 'תאריך הסיום לפני תאריך ההתחלה.', en: 'The end date is before the start date.' })
      : undefined,
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
                ? tr({ he: 'השינויים נשמרו', en: 'Changes saved' })
                : tr({
                    he: 'נשמר. מהמועד החדש ממשיכה הוראה מעודכנת.',
                    en: 'Saved. An updated payment continues from the new date.',
                  }),
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
            setRequestId(newRequestId())
            toast.success(
              isInstallments
                ? tr({ he: 'התשלומים נוספו', en: 'Installments added' })
                : tr({ he: 'הוראת הקבע נוספה', en: 'Recurring payment added' }),
            )
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
          label={tr({ he: 'סוג', en: 'Type' })}
          options={TRANSACTION_KIND_OPTIONS}
          value={kind}
          onChange={changeKind}
        />
      )}

      <AmountField
        label={
          isInstallments
            ? tr({ he: 'סכום כולל של הרכישה', en: 'Total purchase amount' })
            : tr({ he: 'סכום בכל פעם', en: 'Amount each time' })
        }
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
            label={tr({ he: 'מספר תשלומים', en: 'Number of installments' })}
            inputMode="numeric"
            value={countText}
            disabled={planLocked}
            onChange={(event) => setCountText(event.target.value.replace(/\D/g, ''))}
            aria-invalid={submitted && Boolean(errors.count || errors.split)}
          />
          {split ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {split.first === split.rest
                ? tr({
                    he: `${count} תשלומים של ${formatMoney(split.rest)}`,
                    en: `${count} installments of ${formatMoney(split.rest)}`,
                  })
                : tr({
                    he: `${count} תשלומים: הראשון ${formatMoney(split.first)}, והשאר ${formatMoney(split.rest)}`,
                    en: `${count} installments: the first ${formatMoney(split.first)}, the rest ${formatMoney(split.rest)}`,
                  })}
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
        <p className="text-sm text-muted-foreground">
          {tr({ he: 'טוען קטגוריות…', en: 'Loading categories…' })}
        </p>
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
          label={tr({ he: 'תדירות', en: 'Frequency' })}
          showLabel
          options={FREQUENCY_OPTIONS}
          value={frequency}
          onChange={setFrequency}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={
            isInstallments
              ? tr({ he: 'תאריך התשלום הראשון', en: 'First payment date' })
              : tr({ he: 'תאריך התחלה', en: 'Start date' })
          }
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
            label={tr({ he: 'תאריך סיום (לא חובה)', en: 'End date (optional)' })}
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
          {tr({
            he: 'כבר נרשמו תשלומים, ולכן אי אפשר לשנות סכום, מספר תשלומים או תאריך. אפשר לבטל ולהזין מחדש.',
            en: 'Payments were already recorded, so the amount, number of installments and date can no longer change. You can cancel and enter it again.',
          })}
        </p>
      )}
      {started && !isInstallments && (
        <p className="rounded-2xl bg-muted/60 p-3 text-sm text-muted-foreground">
          {tr({
            he: 'שינויים יחולו רק על המועדים הבאים. מה שכבר נרשם נשאר כמו שהוא.',
            en: 'Changes apply only to upcoming payments. What was already recorded stays as it is.',
          })}
        </p>
      )}

      <PartyPicker
        label={
          kind === 'expense'
            ? tr({ he: 'מי משלם', en: 'Who pays' })
            : tr({ he: 'מי מקבל', en: 'Who receives it' })
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

      <ToggleField
        label={
          kind === 'expense'
            ? tr({ he: 'לסמן "שולם" אוטומטית במועד', en: 'Mark as "Paid" automatically on the date' })
            : tr({
                he: 'לסמן "התקבל" אוטומטית במועד',
                en: 'Mark as "Received" automatically on the date',
              })
        }
        description={
          autoConfirm
            ? tr({ he: 'במועד היא תיכנס ישר ליתרה.', en: 'On the date, it goes straight into the balance.' })
            : tr({
                he: 'במועד היא תופיע ב"שולם כבר?" עד שמסמנים שהיא שולמה.',
                en: 'On the date, it appears under "Already paid?" until you mark it as paid.',
              })
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
        {schedule
          ? tr({ he: 'שמירת השינויים', en: 'Save changes' })
          : isInstallments
            ? tr({ he: 'הוספת התשלומים', en: 'Add installments' })
            : tr({ he: 'הוספת הוראת הקבע', en: 'Add recurring payment' })}
      </Button>
    </form>
  )
}
