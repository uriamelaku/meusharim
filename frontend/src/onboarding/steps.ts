import { byGender } from '@/lib/gender'
import type { Gender } from '@/household/api'
import { tr } from '@/lib/i18n'

export type TourStep = {
  /** The screen the step is shown on. */
  route: string
  /** `data-tour` of the element to highlight; none shows the card in the middle. */
  target?: string
  title: string
  body: string
}

export function tourSteps(gender: Gender | null, partner: string): TourStep[] {
  return tr({ he: hebrewSteps(gender, partner), en: englishSteps(partner) })
}

function hebrewSteps(gender: Gender | null, partner: string): TourStep[] {
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

function englishSteps(partner: string): TourStep[] {
  return [
    {
      route: '/',
      title: 'Welcome to Meusharim!',
      body: 'A one-minute tour of the main screens. You can leave it at any time.',
    },
    {
      route: '/',
      target: 'ring',
      title: 'A circle for each category',
      body: "Tap a circle to add an expense in that category. Press and hold to see what's already in it this month. The ring around it shows how much of the budget is used.",
    },
    {
      route: '/',
      target: 'add',
      title: 'The add button',
      body: 'Record everything from here: an expense, income, a recurring payment or a purchase in installments.',
    },
    {
      route: '/',
      target: 'balance',
      title: "This month's balance",
      body: "Income minus expenses, counting only what was actually paid. What isn't paid yet is shown separately, so you can see where the month is heading.",
    },
    {
      route: '/transactions',
      target: 'nav-/transactions',
      title: 'Transactions',
      body: 'Everything recorded, newest first, with search and filters. Tap a row to edit or delete it.',
    },
    {
      route: '/budget',
      target: 'nav-/budget',
      title: 'Budget',
      body: "Decide how much to spend this month and split it into categories. Your savings goals are here too.",
    },
    {
      route: '/reports',
      target: 'nav-/reports',
      title: 'Reports',
      body: 'Where the money went, how it compares with earlier months and how much you saved this year.',
    },
    {
      route: '/settings',
      target: 'help',
      title: 'Settings and help',
      body: `In Settings you can invite ${partner}, edit categories and switch to dark mode. Any question? "How it works" is right up here, and you can restart the tour from there.`,
    },
  ]
}
