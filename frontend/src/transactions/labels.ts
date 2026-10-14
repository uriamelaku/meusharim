import type { Kind } from '@/categories/api'
import { todayIso } from '@/lib/dates'
import type { Member } from '@/household/api'
import type { Transaction, TransactionStatus } from './api'

export const TRANSACTION_KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'expense', label: 'הוצאה' },
  { value: 'income', label: 'הכנסה' },
]

export const STATUS_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: 'completed', label: 'בוצעה' },
  { value: 'planned', label: 'מתוכננת' },
]

/** Suggested status for a date: future dates are usually planned. The user can always change it. */
export function defaultStatusFor(date: string): TransactionStatus {
  return date > todayIso() ? 'planned' : 'completed'
}

export function partyName(partyUserId: string | null, members: Member[]): string {
  if (partyUserId === null) return 'משותף'
  return members.find((m) => m.user_id === partyUserId)?.display_name ?? 'חבר/ה לשעבר'
}

/** "תשלום 3 מתוך 12" or "הוראת קבע" for rows created from a schedule. */
export function scheduleLabel(transaction: Transaction): string | null {
  const { schedule } = transaction
  if (!schedule) return null
  return schedule.type === 'installments'
    ? `תשלום ${schedule.sequence_no} מתוך ${schedule.installments_count}`
    : 'הוראת קבע'
}
