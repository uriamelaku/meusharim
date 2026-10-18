import { ApiError } from '@/lib/api'

const messages: Record<string, string> = {
  category_exists: 'כבר יש קטגוריה בשם הזה.',
  category_not_found: 'הקטגוריה לא נמצאה. ייתכן שנמחקה בינתיים.',
  category_archived: 'הקטגוריה הזו נמחקה. צריך לבחור קטגוריה אחרת.',
  category_kind_mismatch: 'הקטגוריה לא מתאימה (הוצאה או הכנסה).',
  transaction_not_found: 'לא נמצא. ייתכן שכבר נמחק.',
  schedule_not_found: 'ההוראה לא נמצאה.',
  schedule_cancelled: 'ההוראה בוטלה ואי אפשר לשנות אותה.',
  installments_started:
    'אחרי שהתשלום הראשון נרשם אי אפשר לשנות סכום, מספר תשלומים או תאריך. אפשר לבטל וליצור חדש.',
  start_before_last_occurrence: 'תאריך ההתחלה החדש חייב להיות אחרי המועד האחרון שכבר נרשם.',
  invalid_member: 'מי שנבחר כבר לא חלק מהבית.',
  installments_too_small: 'הסכום קטן מדי למספר התשלומים.',
  end_before_start: 'תאריך הסיום לפני תאריך ההתחלה.',
  categories_exceed_total: 'סכום הקטגוריות גבוה מהתקציב הכולל.',
  no_previous_budget: 'לא הוגדר תקציב לחודש הקודם.',
  email_mismatch: 'המייל לא תואם לחשבון המחובר.',
  wrong_password: 'הסיסמה שגויה.',
  auth_service_unavailable: 'שירות ההתחברות לא זמין כרגע. אפשר לנסות שוב בעוד כמה דקות.',
  account_deletion_not_configured: 'מחיקת חשבון לא זמינה כרגע. אפשר לנסות שוב מאוחר יותר.',
  goal_exists: 'כבר יש יעד בשם הזה.',
  goal_not_found: 'היעד לא נמצא. ייתכן שנמחק בינתיים.',
  no_household: 'צריך קודם ליצור בית.',
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError && error.code && messages[error.code]) return messages[error.code]
  return 'הפעולה לא הצליחה. בדקו את החיבור ונסו שוב.'
}
