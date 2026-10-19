import type { Kind } from '@/categories/api'
import { todayIso } from '@/lib/dates'
import { tr } from '@/lib/i18n'
import type { Member } from '@/household/api'
import type { Transaction, TransactionStatus } from './api'

export const TRANSACTION_KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'expense', label: tr({ he: 'הוצאה', en: 'Expense' }) },
  { value: 'income', label: tr({ he: 'הכנסה', en: 'Income' }) },
]

const STATUS_LABELS: Record<Kind, Record<TransactionStatus, string>> = tr({
  he: {
    expense: { completed: 'שולם', planned: 'עוד לא שולם' },
    income: { completed: 'התקבל', planned: 'עוד לא התקבל' },
  },
  en: {
    expense: { completed: 'Paid', planned: 'Not paid yet' },
    income: { completed: 'Received', planned: 'Not received yet' },
  },
})

/** "שולם / עוד לא שולם" for expenses, "התקבל / עוד לא התקבל" for income. */
export function statusLabel(status: TransactionStatus, kind: Kind): string {
  return STATUS_LABELS[kind][status]
}

export function statusOptions(kind: Kind): { value: TransactionStatus; label: string }[] {
  return [
    { value: 'completed', label: statusLabel('completed', kind) },
    { value: 'planned', label: statusLabel('planned', kind) },
  ]
}

/** Suggested status for a date: future dates are usually planned. The user can always change it. */
export function defaultStatusFor(date: string): TransactionStatus {
  return date > todayIso() ? 'planned' : 'completed'
}

export function partyName(partyUserId: string | null, members: Member[]): string {
  if (partyUserId === null) return tr({ he: 'משותף', en: 'Joint' })
  return (
    members.find((m) => m.user_id === partyUserId)?.display_name ??
    tr({ he: 'מי שעזב את הבית', en: 'Former member' })
  )
}

/** "תשלום 3 מתוך 12" or "הוראת קבע" for rows created from a schedule. */
export function scheduleLabel(transaction: Transaction): string | null {
  const { schedule } = transaction
  if (!schedule) return null
  return schedule.type === 'installments'
    ? tr({
        he: `תשלום ${schedule.sequence_no} מתוך ${schedule.installments_count}`,
        en: `Installment ${schedule.sequence_no} of ${schedule.installments_count}`,
      })
    : tr({ he: 'הוראת קבע', en: 'Recurring' })
}
