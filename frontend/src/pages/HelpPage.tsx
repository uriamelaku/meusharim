import {
  ArrowRight,
  BarChart3,
  CircleCheck,
  CircleDot,
  PiggyBank,
  Repeat,
  Smartphone,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { myGender, partnerName, useShellContext } from '@/components/shellContext'
import type { Gender } from '@/household/api'
import { byGender } from '@/lib/gender'

type Question = { q: string; a: ReactNode }
type Topic = { id: string; title: string; icon: LucideIcon; questions: Question[] }

/** Picks the female or male form of a word for the reader. */
type Say = (female: string, male: string) => string

function topics(say: Say, partner: string): Topic[] {
  return [
    {
      id: 'main',
      title: 'המסך הראשי',
      icon: CircleDot,
      questions: [
        {
          q: 'מה רואים במסך הראשי?',
          a: (
            <>
              <p>
                למעלה: כמה כסף יצא החודש, ועיגול צבעוני לכל קטגוריה (מזון, רכב, דיור…). הטבעת
                סביב כל עיגול מראה כמה מהתקציב של הקטגוריה כבר נוצל. עיגול אדום = עברתם את
                התקציב.
              </p>
              <p>
                למטה: היתרה של החודש (הכנסות פחות הוצאות), ומה נרשם לאחרונה.
              </p>
            </>
          ),
        },
        {
          q: 'איך מוסיפים הוצאה הכי מהר?',
          a: (
            <>
              <p>
                {say('לוחצת', 'לוחץ')} על העיגול של הקטגוריה, {say('מקלידה', 'מקליד')} סכום
                ו{say('שומרת', 'שומר')}. זהו. התאריך הוא היום, וההוצאה נרשמת כ״שולם״.
              </p>
              <p>
                אפשר גם ללחוץ על כפתור ה־+ הכתום שבתחתית המסך, ושם לבחור הוצאה, הכנסה, הוראת
                קבע או רכישה בתשלומים.
              </p>
            </>
          ),
        },
        {
          q: 'איך רואים מה נרשם בקטגוריה מסוימת?',
          a: (
            <p>
              לחיצה ארוכה על העיגול שלה (או לחיצה ימנית בעכבר) פותחת את כל ההוצאות שנרשמו בה
              החודש.
            </p>
          ),
        },
      ],
    },
    {
      id: 'status',
      title: 'שולם ועוד לא שולם',
      icon: CircleCheck,
      questions: [
        {
          q: 'מה ההבדל בין ״שולם״ ל״עוד לא שולם״?',
          a: (
            <>
              <p>
                <b>שולם</b> – הכסף כבר יצא (או נכנס, ואז כתוב ״התקבל״). רק מה שסומן ככה נכנס
                ליתרה, לתקציב ולדוחות.
              </p>
              <p>
                <b>עוד לא שולם</b> – משהו שידוע שיגיע, כמו שכר דירה בסוף החודש או חשבון חשמל.
                הוא מוצג בנפרד (״כולל מה שעוד לא שולם״) כדי שיהיה ברור לאן החודש הולך, אבל לא
                משנה את היתרה עד שמסמנים אותו.
              </p>
            </>
          ),
        },
        {
          q: 'מה זה ״שולם כבר?״ במסך הראשי?',
          a: (
            <p>
              כשמגיע התאריך של משהו שעוד לא שולם, הוא מופיע שם. אם הוא שולם – {say('לוחצת', 'לוחץ')}{' '}
              ״שולם״. אם הסכום יצא שונה (חשבון מים, למשל) – {say('לוחצת', 'לוחץ')} על השורה,{' '}
              {say('מתקנת', 'מתקן')} את הסכום ו{say('שומרת', 'שומר')}. התאריך לבד אף פעם לא
              מסמן ״שולם״.
            </p>
          ),
        },
        {
          q: 'מה זה ״מי שילם״?',
          a: (
            <p>
              בכל הוצאה בוחרים מי שילם: {say('את', 'אתה')}, {partner}, או החשבון המשותף. כך
              רואים בדוחות מי הוציא מה, ואפשר גם לסנן לפי זה ברשימת ההוצאות וההכנסות.
            </p>
          ),
        },
      ],
    },
    {
      id: 'budget',
      title: 'תקציב',
      icon: Wallet,
      questions: [
        {
          q: 'מה זה ״תקציב כולל״ ומה זה ״שארית״?',
          a: (
            <>
              <p>
                <b>תקציב כולל</b> – כמה אתם מתכננים להוציא החודש בסך הכל. זו תקרה.
              </p>
              <p>
                <b>מתוכנן לפי קטגוריות</b> – כמה מהתקרה כבר חילקתם לקטגוריות (מזון 2,500, רכב
                1,400…). אי אפשר לחלק יותר מהתקרה.
              </p>
              <p>
                <b>שארית</b> – מה שעוד לא חולק לאף קטגוריה. היא נשארת כרזרבה להוצאות שלא
                תוכננו.
              </p>
            </>
          ),
        },
        {
          q: 'מה קורה בסוף החודש?',
          a: (
            <p>
              כל חודש מתחיל מחדש: מה שלא נוצל לא עובר לחודש הבא. בתחילת חודש חדש האפליקציה
              מציעה להעתיק את התקציב של החודש הקודם, ואפשר לשנות אותו אחר כך.
            </p>
          ),
        },
        {
          q: 'מתי מקבלים התראה על התקציב?',
          a: (
            <p>
              כשקטגוריה מגיעה ל־80% מהתקציב שלה, וכשהיא עוברת אותו. ההתראה מופיעה בתוך
              האפליקציה, פעם אחת לכל קטגוריה בחודש. אין מיילים ואין הודעות לטלפון.
            </p>
          ),
        },
      ],
    },
    {
      id: 'repeat',
      title: 'הוראות קבע, תשלומים וחיסכון',
      icon: Repeat,
      questions: [
        {
          q: 'מה זו הוראת קבע?',
          a: (
            <>
              <p>
                הוצאה או הכנסה שחוזרת כל חודש (או כל שבוע/שנה): שכר דירה, משכורת, ועד בית.
                {say(' מגדירה', ' מגדיר')} פעם אחת, והיא נרשמת לבד בכל מועד.
              </p>
              <p>
                אם הסכום תמיד זהה, אפשר לבחור ״לסמן שולם אוטומטית במועד״. אם הסכום משתנה (כמו
                חשמל), עדיף להשאיר את זה כבוי, ואז במועד היא תופיע ב״שולם כבר?״ לאישור.
              </p>
              <p>אפשר להשהות הוראת קבע או לבטל אותה. מה שכבר נרשם נשאר.</p>
            </>
          ),
        },
        {
          q: 'איך רושמים רכישה בתשלומים?',
          a: (
            <p>
              בכפתור ה־+ {say('בוחרת', 'בוחר')} ״רכישה בתשלומים״, {say('מקלידה', 'מקליד')} את
              הסכום הכולל ואת מספר התשלומים. כל תשלום נרשם בחודש שבו הוא יורד, כך שהתקציב של
              כל חודש מראה רק את התשלום של אותו חודש.
            </p>
          ),
        },
        {
          q: 'איך עובדים יעדי חיסכון?',
          a: (
            <>
              <p>
                בעמוד התקציב יוצרים יעד (למשל ״חופשה בקיץ״, 5,000 ₪) ואפשר להוסיף תאריך. עם
                תאריך, האפליקציה מחשבת כמה צריך לשים בצד בכל חודש.
              </p>
              <p>
                כל ״הפקדה״ נרשמת כהוצאה בקטגוריית חיסכון, כי הכסף יוצא מהחשבון השוטף. בלי יעד
                – אין שום התראות על חיסכון.
              </p>
            </>
          ),
        },
      ],
    },
    {
      id: 'reports',
      title: 'דוחות',
      icon: BarChart3,
      questions: [
        {
          q: 'מה יש בדוחות?',
          a: (
            <p>
              לאן הלך הכסף לפי קטגוריות, הכנסות מול הוצאות לאורך החודשים, השוואה לחודש הקודם,
              כמה חסכתם מתחילת השנה ותחזית לסוף החודש. גם בדוחות נספר רק מה שסומן ״שולם״.
            </p>
          ),
        },
      ],
    },
    {
      id: 'together',
      title: 'יחד עם בן או בת הזוג',
      icon: Users,
      questions: [
        {
          q: 'איך מזמינים את בן או בת הזוג?',
          a: (
            <p>
              בהגדרות {say('לוחצת', 'לוחץ')} ״יצירת קישור הזמנה״ ו{say('שולחת', 'שולח')} את
              הקישור בוואטסאפ או בכל דרך אחרת. הקישור טוב לשבוע ולשימוש אחד. כל אחד נכנס עם
              מייל וסיסמה משלו, ושניכם רואים ועורכים את אותם נתונים.
            </p>
          ),
        },
        {
          q: 'מי יכול לשנות מה?',
          a: (
            <p>
              לשניכם יש בדיוק אותן הרשאות: הוספה, עריכה ומחיקה של הוצאות, הכנסות, קטגוריות
              ותקציב. כל שינוי נראה מיד גם אצל השני.
            </p>
          ),
        },
      ],
    },
    {
      id: 'phone',
      title: 'התקנה בטלפון',
      icon: Smartphone,
      questions: [
        {
          q: 'איך שמים את האפליקציה במסך הבית?',
          a: (
            <>
              <p>
                <b>אייפון:</b> {say('פותחת', 'פותח')} את האתר בספארי, {say('לוחצת', 'לוחץ')} על
                כפתור השיתוף (ריבוע עם חץ למעלה) ו{say('בוחרת', 'בוחר')} ״הוספה למסך הבית״.
              </p>
              <p>
                <b>אנדרואיד:</b> {say('פותחת', 'פותח')} בכרום, {say('לוחצת', 'לוחץ')} על שלוש
                הנקודות למעלה ו{say('בוחרת', 'בוחר')} ״התקנת האפליקציה״ או ״הוספה למסך הבית״.
              </p>
              <p>מעכשיו היא נפתחת כמו כל אפליקציה, במסך מלא.</p>
            </>
          ),
        },
        {
          q: 'איך עוברים למצב כהה?',
          a: <p>בהגדרות, תחת ״תצוגה״. הבחירה נשמרת בכל מכשיר בנפרד.</p>,
        },
      ],
    },
    {
      id: 'more',
      title: 'עוד דברים שכדאי לדעת',
      icon: PiggyBank,
      questions: [
        {
          q: 'איך מוצאים הוצאה ישנה?',
          a: (
            <p>
              בעמוד ״הוצאות והכנסות״ יש חיפוש לפי מילה, וסינון לפי קטגוריה, מי שילם, ״שולם״ או
              ״עוד לא״, ותקופה.
            </p>
          ),
        },
        {
          q: 'אפשר לשנות או להוסיף קטגוריות?',
          a: (
            <p>
              כן, בהגדרות תחת ״קטגוריות״: שם, צבע וסמל. קטגוריה שנמחקת יורדת מהרשימה, אבל מה
              שכבר נרשם בה נשאר.
            </p>
          ),
        },
        {
          q: 'אפשר לייבא דף חשבון מהבנק או מכרטיס האשראי?',
          a: <p>עוד לא. זה בדרך, ולכן הכפתור מסומן ״בקרוב״.</p>,
        },
        {
          q: 'הנתונים שלנו בטוחים?',
          a: (
            <p>
              רק שניכם רואים את הנתונים של הבית, אחרי כניסה עם מייל וסיסמה. אין חיבור לבנק או
              לכרטיס אשראי – כל מה שבאפליקציה הוא מה שהקלדתם.
            </p>
          ),
        },
      ],
    },
  ]
}

export function HelpPage() {
  const context = useShellContext()
  const gender: Gender | null = myGender(context)
  const say: Say = (female, male) => byGender(gender, { female, male, neutral: male })
  const list = topics(say, partnerName(context))

  return (
    <>
      <Link
        to="/settings"
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ArrowRight className="size-4" aria-hidden />
        להגדרות
      </Link>
      <PageHeader
        title="איך זה עובד?"
        description="כל מה שצריך לדעת כדי להשתמש באפליקציה, בקצרה."
      />
      <nav aria-label="נושאים" className="mb-5 flex flex-wrap gap-2">
        {list.map((topic) => (
          <a
            key={topic.id}
            href={`#${topic.id}`}
            className="rounded-full bg-card px-3 py-1.5 text-sm font-medium"
          >
            {topic.title}
          </a>
        ))}
      </nav>
      <div className="flex flex-col gap-4">
        {list.map(({ id, title, icon: Icon, questions }) => (
          <section key={id} id={id} className="scroll-mt-20 rounded-2xl bg-card p-4 sm:p-5">
            <h2 className="mb-2 flex items-center gap-2 font-heading text-lg font-semibold">
              <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              {title}
            </h2>
            <div className="divide-y">
              {questions.map(({ q, a }) => (
                <details key={q} className="group py-1">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
                    {q}
                    <span
                      aria-hidden
                      className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="flex flex-col gap-2 pb-3 leading-relaxed text-muted-foreground">
                    {a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
