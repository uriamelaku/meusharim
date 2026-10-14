import { ApiError } from '@/lib/api'

const messages: Record<string, string> = {
  category_exists: 'כבר יש קטגוריה בשם הזה.',
  category_not_found: 'הקטגוריה לא נמצאה. ייתכן שבן/בת הזוג מחק/ה אותה.',
  category_archived: 'הקטגוריה הזו נמחקה. בחרו קטגוריה אחרת.',
  category_kind_mismatch: 'הקטגוריה לא מתאימה לסוג התנועה.',
  transaction_not_found: 'התנועה לא נמצאה. ייתכן שהיא כבר נמחקה.',
  schedule_not_found: 'ההוראה לא נמצאה.',
  schedule_cancelled: 'ההוראה בוטלה ואי אפשר לשנות אותה.',
  installments_started:
    'אחרי שהתשלום הראשון נרשם אי אפשר לשנות סכום, מספר תשלומים או תאריך. בטלו וצרו חדש.',
  start_before_last_occurrence: 'תאריך ההתחלה החדש חייב להיות אחרי המועד האחרון שכבר נרשם.',
  invalid_member: 'בן/בת הזוג שנבחר/ה לא שייך/ת למשק הבית.',
  no_previous_budget: 'לא הוגדר תקציב לחודש הקודם.',
  no_household: 'צריך קודם להקים משק בית.',
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError && error.code && messages[error.code]) return messages[error.code]
  return 'הפעולה לא הצליחה. בדקו את החיבור ונסו שוב.'
}
