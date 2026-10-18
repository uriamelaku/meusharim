import { Loader2, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { describeError } from '@/lib/errors'
import { amountToInput, parseAmountInput } from '@/lib/money'
import { type Goal, useCreateGoal, useDeleteGoal, useUpdateGoal } from './api'

/** Create or edit a savings goal: a name, a target amount and an optional date. */
export function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(goal ? amountToInput(goal.target_amount) : '')
  const [date, setDate] = useState(goal?.target_date ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const create = useCreateGoal()
  const update = useUpdateGoal()
  const remove = useDeleteGoal()
  const mutation = goal ? update : create
  const amount = parseAmountInput(target)

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!name.trim() || !amount) return
    const body = { name: name.trim(), target_amount: amount, target_date: date || null }
    const onSuccess = () => {
      toast.success(goal ? 'היעד עודכן' : 'היעד נוצר')
      onDone()
    }
    if (goal) update.mutate({ id: goal.id, ...body }, { onSuccess })
    else create.mutate(body, { onSuccess })
  }

  function confirmDelete() {
    if (!goal) return
    remove.mutate(goal.id, {
      onSuccess: () => {
        toast.success('היעד נמחק. ההפקדות נשארות ברשימת ההוצאות.')
        setConfirmingDelete(false)
        onDone()
      },
      onError: (error) => toast.error(describeError(error)),
    })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <TextField
        label="שם היעד"
        placeholder="למשל: חופשה בקיץ"
        maxLength={40}
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-invalid={submitted && !name.trim()}
        autoFocus={!goal}
      />
      <TextField
        label="סכום יעד (₪)"
        inputMode="decimal"
        value={target}
        onChange={(event) => setTarget(event.target.value)}
        aria-invalid={submitted && !amount}
      />
      <TextField
        label="עד מתי (לא חובה)"
        type="date"
        min="2000-01-01"
        max="2100-12-31"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        hint="עם תאריך נחשב כמה צריך לחסוך בכל חודש."
      />
      {submitted && (!name.trim() || !amount) && (
        <p role="alert" className="text-sm text-destructive">
          צריך שם וסכום יעד חיובי.
        </p>
      )}
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {describeError(mutation.error)}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="lg" className="flex-1" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="animate-spin" aria-hidden />}
          {goal ? 'שמירת השינויים' : 'יצירת היעד'}
        </Button>
        {goal && (
          <Button
            type="button"
            size="lg"
            variant="destructive"
            aria-label="מחיקת היעד"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="למחוק את היעד?"
        description="היעד יימחק אצל שניכם. הפקדות שכבר נרשמו יישארו ברשימת ההוצאות."
        confirmLabel="מחיקה"
        onConfirm={confirmDelete}
        pending={remove.isPending}
      />
    </form>
  )
}
