import { Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { AmountField } from '@/components/AmountField'
import { PartyPicker } from '@/components/PartyPicker'
import { Button } from '@/components/ui/button'
import type { Member } from '@/household/api'
import { newRequestId } from '@/lib/api'
import { describeError } from '@/lib/errors'
import { formatMoney, parseAmountInput } from '@/lib/money'
import { lastParty, rememberParty } from '@/transactions/lastParty'
import { type Goal, useDeposit } from './api'

type DepositFormProps = { goal: Goal; members: Member[]; userId: string; onDone: () => void }

/** Money put aside for a goal today: recorded as a savings expense. */
export function DepositForm({ goal, members, userId, onDone }: DepositFormProps) {
  const [amountText, setAmountText] = useState('')
  const [party, setParty] = useState(() => lastParty(members, userId))
  const [submitted, setSubmitted] = useState(false)
  const [requestId] = useState(() => newRequestId())
  const deposit = useDeposit(goal.id)
  const amount = parseAmountInput(amountText)

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!amount) return
    rememberParty(party)
    deposit.mutate(
      { amount, party_user_id: party, request_id: requestId },
      {
        onSuccess: () => {
          toast.success(`הופקדו ${formatMoney(amount)} ל${goal.name}`)
          onDone()
        },
      },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <AmountField
        label="כמה הפקדתם?"
        value={amountText}
        onChange={setAmountText}
        error={submitted && !amount ? 'הזינו סכום חיובי.' : undefined}
        autoFocus
      />
      {goal.monthly_needed && (
        <p className="-mt-3 text-center text-sm text-muted-foreground">
          כדי להגיע בזמן: {formatMoney(goal.monthly_needed)} בחודש
        </p>
      )}
      <PartyPicker label="מאיפה" members={members} value={party} onChange={setParty} />
      <p className="text-sm text-muted-foreground">
        ההפקדה נרשמת כהוצאה בקטגוריה "חיסכון" (החודש), כי הכסף יוצא מהשוטף.
      </p>
      {deposit.isError && (
        <p role="alert" className="text-sm text-destructive">
          {describeError(deposit.error)}
        </p>
      )}
      <Button type="submit" size="lg" disabled={deposit.isPending}>
        {deposit.isPending && <Loader2 className="animate-spin" aria-hidden />}
        הפקדה
      </Button>
    </form>
  )
}
