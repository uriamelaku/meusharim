import { ApiError } from '@/lib/api'

const messages: Record<string, string> = {
  invitation_invalid: 'הקישור לא תקין, או שההזמנה בוטלה. כדאי לבקש קישור חדש.',
  invitation_expired: 'תוקף ההזמנה פג. כדאי לבקש קישור חדש.',
  invitation_used: 'כבר השתמשו בהזמנה הזו. כדאי לבקש קישור חדש.',
  household_full: 'בבית הזה כבר יש שני אנשים.',
  already_member: 'החשבון שלך כבר שייך לבית.',
  no_household: 'צריך קודם ליצור בית.',
  rate_limited: 'היו יותר מדי ניסיונות. אפשר לנסות שוב בעוד רבע שעה.',
}

export function describeHouseholdError(error: unknown): string {
  if (error instanceof ApiError && error.code && messages[error.code]) return messages[error.code]
  return 'הפעולה לא הצליחה. בדקו את החיבור ונסו שוב.'
}
