import { ApiError } from '@/lib/api'
import { tr } from '@/lib/i18n'

const messages: Record<string, { he: string; en: string }> = {
  category_exists: {
    he: 'כבר יש קטגוריה בשם הזה.',
    en: 'There is already a category with this name.',
  },
  category_not_found: {
    he: 'הקטגוריה לא נמצאה. ייתכן שנמחקה בינתיים.',
    en: 'Category not found. It may have just been deleted.',
  },
  category_archived: {
    he: 'הקטגוריה הזו נמחקה. צריך לבחור קטגוריה אחרת.',
    en: 'This category was deleted. Please choose another one.',
  },
  category_kind_mismatch: {
    he: 'הקטגוריה לא מתאימה (הוצאה או הכנסה).',
    en: 'This category does not match (expense or income).',
  },
  transaction_not_found: {
    he: 'לא נמצא. ייתכן שכבר נמחק.',
    en: 'Not found. It may have already been deleted.',
  },
  schedule_not_found: { he: 'ההוראה לא נמצאה.', en: 'Recurring payment not found.' },
  schedule_cancelled: {
    he: 'ההוראה בוטלה ואי אפשר לשנות אותה.',
    en: 'This payment was cancelled and can no longer be changed.',
  },
  installments_started: {
    he: 'אחרי שהתשלום הראשון נרשם אי אפשר לשנות סכום, מספר תשלומים או תאריך. אפשר לבטל וליצור חדש.',
    en: 'Once the first installment is recorded, the amount, number of installments and date can no longer change. You can cancel it and create a new one.',
  },
  start_before_last_occurrence: {
    he: 'תאריך ההתחלה החדש חייב להיות אחרי המועד האחרון שכבר נרשם.',
    en: 'The new start date must be after the last payment already recorded.',
  },
  invalid_member: {
    he: 'מי שנבחר כבר לא חלק מהבית.',
    en: 'The person you chose is no longer part of the household.',
  },
  installments_too_small: {
    he: 'הסכום קטן מדי למספר התשלומים.',
    en: 'The amount is too small for this number of installments.',
  },
  end_before_start: { he: 'תאריך הסיום לפני תאריך ההתחלה.', en: 'The end date is before the start date.' },
  categories_exceed_total: {
    he: 'סכום הקטגוריות גבוה מהתקציב הכולל.',
    en: 'The category budgets add up to more than the total budget.',
  },
  no_previous_budget: {
    he: 'לא הוגדר תקציב לחודש הקודם.',
    en: 'No budget was set for the previous month.',
  },
  email_mismatch: {
    he: 'המייל לא תואם לחשבון המחובר.',
    en: 'This email does not match the signed-in account.',
  },
  wrong_password: { he: 'הסיסמה שגויה.', en: 'Incorrect password.' },
  auth_service_unavailable: {
    he: 'שירות ההתחברות לא זמין כרגע. אפשר לנסות שוב בעוד כמה דקות.',
    en: 'The sign-in service is unavailable right now. Please try again in a few minutes.',
  },
  account_deletion_not_configured: {
    he: 'מחיקת חשבון לא זמינה כרגע. אפשר לנסות שוב מאוחר יותר.',
    en: 'Account deletion is not available right now. Please try again later.',
  },
  goal_exists: { he: 'כבר יש יעד בשם הזה.', en: 'There is already a goal with this name.' },
  goal_not_found: {
    he: 'היעד לא נמצא. ייתכן שנמחק בינתיים.',
    en: 'Goal not found. It may have just been deleted.',
  },
  no_household: { he: 'צריך קודם ליצור בית.', en: 'Please create a household first.' },
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError && error.code && messages[error.code]) {
    return tr(messages[error.code])
  }
  // The server rejected the input itself (FastAPI's field validation).
  if (error instanceof ApiError && error.status === 422) {
    return tr({
      he: 'חלק מהפרטים לא תקינים. כדאי לבדוק את השדות ולנסות שוב.',
      en: 'Some of the details are invalid. Check the fields and try again.',
    })
  }
  return tr({
    he: 'הפעולה לא הצליחה. בדקו את החיבור ונסו שוב.',
    en: 'Something went wrong. Check your connection and try again.',
  })
}
