import { ApiError } from '@/lib/api'
import { describeError } from '@/lib/errors'
import { tr } from '@/lib/i18n'

const messages: Record<string, { he: string; en: string }> = {
  invitation_invalid: {
    he: 'הקישור לא תקין, או שההזמנה בוטלה. כדאי לבקש קישור חדש.',
    en: 'This link is invalid, or the invitation was cancelled. Ask for a new link.',
  },
  invitation_expired: {
    he: 'תוקף ההזמנה פג. כדאי לבקש קישור חדש.',
    en: 'This invitation has expired. Ask for a new link.',
  },
  invitation_used: {
    he: 'כבר השתמשו בהזמנה הזו. כדאי לבקש קישור חדש.',
    en: 'This invitation was already used. Ask for a new link.',
  },
  household_full: {
    he: 'בבית הזה כבר יש שני אנשים.',
    en: 'This household already has two members.',
  },
  already_member: {
    he: 'החשבון שלך כבר שייך לבית.',
    en: 'Your account already belongs to a household.',
  },
  rate_limited: {
    he: 'היו יותר מדי ניסיונות. אפשר לנסות שוב בעוד רבע שעה.',
    en: 'Too many attempts. Please try again in 15 minutes.',
  },
}

export function describeHouseholdError(error: unknown): string {
  if (error instanceof ApiError && error.code && messages[error.code]) {
    return tr(messages[error.code])
  }
  return describeError(error)
}
