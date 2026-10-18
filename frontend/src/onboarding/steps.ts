import { byGender } from '@/lib/gender'
import type { Gender } from '@/household/api'

export type TourStep = {
  /** The screen the step is shown on. */
  route: string
  /** `data-tour` of the element to highlight; none shows the card in the middle. */
  target?: string
  title: string
  body: string
}

export function tourSteps(gender: Gender | null, partner: string): TourStep[] {
  const say = (female: string, male: string) => byGender(gender, { female, male, neutral: male })
  return [
    {
      route: '/',
      title: byGender(gender, {
        female: 'ברוכה הבאה למאושרים!',
        male: 'ברוך הבא למאושרים!',
        neutral: 'ברוכים הבאים למאושרים!',
      }),
      body: 'סיור קצר של דקה על המסכים העיקריים. אפשר לצאת ממנו בכל רגע.',
    },
    {
      route: '/',
      target: 'ring',
      title: 'עיגול לכל קטגוריה',
      body: `${say('לוחצת', 'לוחץ')} על עיגול כדי להוסיף הוצאה בקטגוריה. לחיצה ארוכה מראה מה כבר נרשם בה החודש. הטבעת סביב העיגול מראה כמה מהתקציב נוצל.`,
    },
    {
      route: '/',
      target: 'add',
      title: 'כפתור ההוספה',
      body: 'מכאן רושמים הכל: הוצאה, הכנסה, הוראת קבע או רכישה בתשלומים.',
    },
    {
      route: '/',
      target: 'balance',
      title: 'היתרה של החודש',
      body: 'הכנסות פחות הוצאות, רק ממה שכבר שולם. מה שעוד לא שולם מוצג בנפרד, כדי שיהיה ברור לאן החודש הולך.',
    },
    {
      route: '/transactions',
      target: 'nav-/transactions',
      title: 'הוצאות והכנסות',
      body: `כל מה שנרשם, מהחדש לישן, עם חיפוש וסינון. ${say('לוחצת', 'לוחץ')} על שורה כדי לערוך או למחוק.`,
    },
    {
      route: '/budget',
      target: 'nav-/budget',
      title: 'תקציב',
      body: 'קובעים כמה מוציאים החודש ומחלקים לקטגוריות. כאן גם יעדי החיסכון.',
    },
    {
      route: '/reports',
      target: 'nav-/reports',
      title: 'דוחות',
      body: 'לאן הלך הכסף, השוואה לחודשים קודמים וכמה חסכתם השנה.',
    },
    {
      route: '/settings',
      target: 'help',
      title: 'הגדרות ועזרה',
      body: `בהגדרות מזמינים את ${partner}, משנים קטגוריות ועוברים למצב כהה. בכל שאלה, ״איך זה עובד?״ כאן למעלה. משם אפשר גם לחזור לסיור.`,
    },
  ]
}
