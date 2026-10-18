import type { Kind } from '@/categories/api'
import { todayIso } from '@/lib/dates'
import type { Member } from '@/household/api'
import type { Transaction, TransactionStatus } from './api'

export const TRANSACTION_KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'expense', label: 'הוצאה' },
  { value: 'income', label: 'הכנסה' },
]

const STATUS_LABELS: Record<Kind, Record<TransactionStatus, string>> = {
  expense: { completed: 'שולם', planned: 'עוד לא שולם' },
  income: { completed: 'התקבל', planned: 'עוד לא התקבל' },
}

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
  if (partyUserId === null) return 'משותף'
  return members.find((m) => m.user_id === partyUserId)?.display_name ?? 'מי שעזב את הבית'
}

/** "תשלום 3 מתוך 12" or "הוראת קבע" for rows created from a schedule. */
export function scheduleLabel(transaction: Transaction): string | null {
  const { schedule } = transaction
  if (!schedule) return null
  return schedule.type === 'installments'
    ? `תשלום ${schedule.sequence_no} מתוך ${schedule.installments_count}`
    : 'הוראת קבע'
}
