import { ApiError } from '@/lib/api'

const messages: Record<string, string> = {
  invitation_invalid: 'הקישור לא תקין, או שההזמנה בוטלה. בקשו מבן/בת הזוג קישור חדש.',
  invitation_expired: 'תוקף ההזמנה פג. בקשו מבן/בת הזוג קישור חדש.',
  invitation_used: 'כבר נעשה שימוש בהזמנה הזו. בקשו מבן/בת הזוג קישור חדש.',
  household_full: 'במשק הבית הזה כבר יש שני חברים.',
  already_member: 'החשבון שלך כבר שייך למשק בית.',
  no_household: 'צריך קודם להקים משק בית.',
  rate_limited: 'היו יותר מדי ניסיונות. נסו שוב בעוד רבע שעה.',
}

export function describeHouseholdError(error: unknown): string {
  if (error instanceof ApiError && error.code && messages[error.code]) return messages[error.code]
  return 'הפעולה לא הצליחה. בדקו את החיבור ונסו שוב.'
}
