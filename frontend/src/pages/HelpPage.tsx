import {
  ArrowRight,
  BarChart3,
  CircleCheck,
  CircleDot,
  Compass,
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
import { Button } from '@/components/ui/button'
import { myGender, partnerName, useShellContext } from '@/components/shellContext'
import type { Gender } from '@/household/api'
import { byGender } from '@/lib/gender'
import { isHebrew, tr } from '@/lib/i18n'
import { useTour } from '@/onboarding/tourContext'

type Question = { q: string; a: ReactNode }
type Topic = { id: string; title: string; icon: LucideIcon; questions: Question[] }

/** Picks the female or male form of a word for the reader. */
type Say = (female: string, male: string) => string

function hebrewTopics(say: Say, partner: string): Topic[] {
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
                למעלה: כמה כסף יצא החודש, ועיגול צבעוני לכל קטגוריה (מזון, רכב, דיור…). הטבעת סביב
                כל עיגול מראה כמה מהתקציב של הקטגוריה כבר נוצל. עיגול אדום = עברתם את התקציב.
              </p>
              <p>למטה: היתרה של החודש (הכנסות פחות הוצאות), ומה נרשם לאחרונה.</p>
            </>
          ),
        },
        {
          q: 'איך מוסיפים הוצאה הכי מהר?',
          a: (
            <>
              <p>
                {say('לוחצת', 'לוחץ')} על העיגול של הקטגוריה, {say('מקלידה', 'מקליד')} סכום ו
                {say('שומרת', 'שומר')}. זהו. התאריך הוא היום, וההוצאה נרשמת כ״שולם״.
              </p>
              <p>
                אפשר גם ללחוץ על כפתור ה־+ הכתום שבתחתית המסך, ושם לבחור הוצאה, הכנסה, הוראת קבע או
                רכישה בתשלומים.
              </p>
            </>
          ),
        },
        {
          q: 'איך רואים מה נרשם בקטגוריה מסוימת?',
          a: (
            <p>
              לחיצה ארוכה על העיגול שלה (או לחיצה ימנית בעכבר) פותחת את כל ההוצאות שנרשמו בה החודש.
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
                <b>שולם</b> – הכסף כבר יצא (או נכנס, ואז כתוב ״התקבל״). רק מה שסומן ככה נכנס ליתרה,
                לתקציב ולדוחות.
              </p>
              <p>
                <b>עוד לא שולם</b> – משהו שידוע שיגיע, כמו שכר דירה בסוף החודש או חשבון חשמל. הוא
                מוצג בנפרד (״כולל מה שעוד לא שולם״) כדי שיהיה ברור לאן החודש הולך, אבל לא משנה את
                היתרה עד שמסמנים אותו.
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
              {say('מתקנת', 'מתקן')} את הסכום ו{say('שומרת', 'שומר')}. התאריך לבד אף פעם לא מסמן
              ״שולם״.
            </p>
          ),
        },
        {
          q: 'מה זה ״מי שילם״?',
          a: (
            <p>
              בכל הוצאה בוחרים מי שילם: {say('את', 'אתה')}, {partner}, או החשבון המשותף. כך רואים
              בדוחות מי הוציא מה, ואפשר גם לסנן לפי זה ברשימת ההוצאות וההכנסות.
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
                <b>שארית</b> – מה שעוד לא חולק לאף קטגוריה. היא נשארת כרזרבה להוצאות שלא תוכננו.
              </p>
            </>
          ),
        },
        {
          q: 'מה קורה בסוף החודש?',
          a: (
            <p>
              כל חודש מתחיל מחדש: מה שלא נוצל לא עובר לחודש הבא. בתחילת חודש חדש האפליקציה מציעה
              להעתיק את התקציב של החודש הקודם, ואפשר לשנות אותו אחר כך.
            </p>
          ),
        },
        {
          q: 'מתי מקבלים התראה על התקציב?',
          a: (
            <p>
              כשקטגוריה מגיעה ל־80% מהתקציב שלה, וכשהיא עוברת אותו. ההתראה מופיעה בתוך האפליקציה,
              פעם אחת לכל קטגוריה בחודש. אין מיילים ואין הודעות לטלפון.
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
                אם הסכום תמיד זהה, אפשר לבחור ״לסמן שולם אוטומטית במועד״. אם הסכום משתנה (כמו חשמל),
                עדיף להשאיר את זה כבוי, ואז במועד היא תופיע ב״שולם כבר?״ לאישור.
              </p>
              <p>אפשר להשהות הוראת קבע או לבטל אותה. מה שכבר נרשם נשאר.</p>
            </>
          ),
        },
        {
          q: 'איך רושמים רכישה בתשלומים?',
          a: (
            <p>
              בכפתור ה־+ {say('בוחרת', 'בוחר')} ״רכישה בתשלומים״, {say('מקלידה', 'מקליד')} את הסכום
              הכולל ואת מספר התשלומים. כל תשלום נרשם בחודש שבו הוא יורד, כך שהתקציב של כל חודש מראה
              רק את התשלום של אותו חודש.
            </p>
          ),
        },
        {
          q: 'איך עובדים יעדי חיסכון?',
          a: (
            <>
              <p>
                בעמוד התקציב יוצרים יעד (למשל ״חופשה בקיץ״, 5,000 ₪) ואפשר להוסיף תאריך. עם תאריך,
                האפליקציה מחשבת כמה צריך לשים בצד בכל חודש.
              </p>
              <p>
                כל ״הפקדה״ נרשמת כהוצאה בקטגוריית חיסכון, כי הכסף יוצא מהחשבון השוטף. בלי יעד – אין
                שום התראות על חיסכון.
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
              לאן הלך הכסף לפי קטגוריות, הכנסות מול הוצאות לאורך החודשים, השוואה לחודש הקודם, כמה
              חסכתם מתחילת השנה ותחזית לסוף החודש. גם בדוחות נספר רק מה שסומן ״שולם״.
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
              בהגדרות {say('לוחצת', 'לוחץ')} ״יצירת קישור הזמנה״ ו{say('שולחת', 'שולח')} את הקישור
              בוואטסאפ או בכל דרך אחרת. הקישור טוב לשבוע ולשימוש אחד. כל אחד נכנס עם מייל וסיסמה
              משלו, ושניכם רואים ועורכים את אותם נתונים.
            </p>
          ),
        },
        {
          q: 'מי יכול לשנות מה?',
          a: (
            <p>
              לשניכם יש בדיוק אותן הרשאות: הוספה, עריכה ומחיקה של הוצאות, הכנסות, קטגוריות ותקציב.
              כל שינוי נראה מיד גם אצל השני.
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
        {
          q: 'אפשר להשתמש באפליקציה באנגלית?',
          a: (
            <p>
              כן. בהגדרות, תחת ״תצוגה״ ← ״שפה״. גם הבחירה הזו נשמרת בכל מכשיר בנפרד, כך שכל אחד
              מכם יכול לעבוד בשפה שלו.
            </p>
          ),
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
              בעמוד ״הוצאות והכנסות״ יש חיפוש לפי מילה, וסינון לפי קטגוריה, מי שילם, ״שולם״ או ״עוד
              לא״, ותקופה.
            </p>
          ),
        },
        {
          q: 'אפשר לשנות או להוסיף קטגוריות?',
          a: (
            <p>
              כן, בהגדרות תחת ״קטגוריות״: שם, צבע וסמל. קטגוריה שנמחקת יורדת מהרשימה, אבל מה שכבר
              נרשם בה נשאר.
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
              רק שניכם רואים את הנתונים של הבית, אחרי כניסה עם מייל וסיסמה. אין חיבור לבנק או לכרטיס
              אשראי – כל מה שבאפליקציה הוא מה שהקלדתם.
            </p>
          ),
        },
      ],
    },
  ]
}

function englishTopics(partner: string): Topic[] {
  return [
    {
      id: 'main',
      title: 'The home screen',
      icon: CircleDot,
      questions: [
        {
          q: 'What do I see on the home screen?',
          a: (
            <>
              <p>
                At the top: how much money went out this month, and a colored circle for each
                category (groceries, car, housing…). The ring around each circle shows how much of
                that category's budget is already used. A red circle means you went over budget.
              </p>
              <p>Below: this month's balance (income minus expenses), and what was added recently.</p>
            </>
          ),
        },
        {
          q: "What's the fastest way to add an expense?",
          a: (
            <>
              <p>
                Tap the category's circle, type the amount and save. That's it. The date is today,
                and the expense is recorded as "Paid".
              </p>
              <p>
                You can also tap the orange + button at the bottom of the screen, and choose an
                expense, income, a recurring payment or a purchase in installments.
              </p>
            </>
          ),
        },
        {
          q: "How do I see what's in a category?",
          a: (
            <p>
              Press and hold its circle (or right-click with a mouse) to open all the expenses
              recorded in it this month.
            </p>
          ),
        },
      ],
    },
    {
      id: 'status',
      title: 'Paid and not paid yet',
      icon: CircleCheck,
      questions: [
        {
          q: 'What\'s the difference between "Paid" and "Not paid yet"?',
          a: (
            <>
              <p>
                <b>Paid</b> – the money already went out (or came in, and then it says "Received").
                Only what's marked this way counts in the balance, the budget and the reports.
              </p>
              <p>
                <b>Not paid yet</b> – something you know is coming, like rent at the end of the
                month or an electricity bill. It's shown separately ("Including what isn't paid
                yet") so you can see where the month is heading, but it doesn't change the balance
                until you mark it.
              </p>
            </>
          ),
        },
        {
          q: 'What is "Already paid?" on the home screen?',
          a: (
            <p>
              When the date of something not paid yet arrives, it shows up there. If it was paid,
              tap "Paid". If the amount turned out different (a water bill, for example), tap the
              row, fix the amount and save. A date alone never marks anything as paid.
            </p>
          ),
        },
        {
          q: 'What is "Who paid"?',
          a: (
            <p>
              For every expense you choose who paid: you, {partner}, or the joint account. That way
              the reports show who spent what, and you can filter by it in the transaction list.
            </p>
          ),
        },
      ],
    },
    {
      id: 'budget',
      title: 'Budget',
      icon: Wallet,
      questions: [
        {
          q: 'What are "total budget" and "unallocated"?',
          a: (
            <>
              <p>
                <b>Total budget</b> – how much you plan to spend this month altogether. It's a
                ceiling.
              </p>
              <p>
                <b>Planned by category</b> – how much of the ceiling you've already split into
                categories (groceries 2,500, car 1,400…). You can't split more than the ceiling.
              </p>
              <p>
                <b>Unallocated</b> – what isn't assigned to any category yet. It stays as a reserve
                for unplanned spending.
              </p>
            </>
          ),
        },
        {
          q: 'What happens at the end of the month?',
          a: (
            <p>
              Every month starts fresh: what isn't used doesn't carry over to the next month. At the
              start of a new month the app offers to copy last month's budget, and you can change it
              afterwards.
            </p>
          ),
        },
        {
          q: 'When do I get a budget alert?',
          a: (
            <p>
              When a category reaches 80% of its budget, and when it goes over. The alert appears
              inside the app, once per category each month. No emails and no phone notifications.
            </p>
          ),
        },
      ],
    },
    {
      id: 'repeat',
      title: 'Recurring, installments and savings',
      icon: Repeat,
      questions: [
        {
          q: 'What is a recurring payment?',
          a: (
            <>
              <p>
                An expense or income that repeats every month (or every week or year): rent, salary,
                building fees. Set it up once, and it's recorded by itself on every date.
              </p>
              <p>
                If the amount is always the same, you can turn on "Mark as paid automatically on the
                date". If the amount changes (like electricity), better leave it off, and then on the
                date it appears under "Already paid?" for you to confirm.
              </p>
              <p>You can pause or cancel a recurring payment. What was already recorded stays.</p>
            </>
          ),
        },
        {
          q: 'How do I record a purchase in installments?',
          a: (
            <p>
              With the + button, choose "Installments", then type the total amount and the number
              of installments. Each payment is recorded in the month it's charged, so each month's
              budget shows only that month's payment.
            </p>
          ),
        },
        {
          q: 'How do savings goals work?',
          a: (
            <>
              <p>
                On the budget page you create a goal (say "Summer vacation", ₪5,000) and can add a
                date. With a date, the app works out how much to put aside each month.
              </p>
              <p>
                Each "deposit" is recorded as an expense in the savings category, since the money
                leaves your current account. No goal, no savings alerts.
              </p>
            </>
          ),
        },
      ],
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: BarChart3,
      questions: [
        {
          q: "What's in the reports?",
          a: (
            <p>
              Where the money went by category, income vs. expenses over the months, a comparison
              with last month or the same month last year, how much you saved since the start of
              the year and an end-of-month forecast. Reports also count only what's marked "Paid".
            </p>
          ),
        },
      ],
    },
    {
      id: 'together',
      title: 'Together with your partner',
      icon: Users,
      questions: [
        {
          q: 'How do I invite my partner?',
          a: (
            <p>
              In Settings, tap "Create invitation link" and send the link on WhatsApp or any other
              way. The link is valid for a week and works once. Each of you signs in with your own
              email and password, and you both see and edit the same data.
            </p>
          ),
        },
        {
          q: 'Who can change what?',
          a: (
            <p>
              You both have exactly the same permissions: adding, editing and deleting expenses,
              income, categories and the budget. Every change shows up right away for the other.
            </p>
          ),
        },
      ],
    },
    {
      id: 'phone',
      title: 'Installing on your phone',
      icon: Smartphone,
      questions: [
        {
          q: 'How do I add the app to my home screen?',
          a: (
            <>
              <p>
                <b>iPhone:</b> open the site in Safari, tap the share button (a square with an
                arrow pointing up) and choose "Add to Home Screen".
              </p>
              <p>
                <b>Android:</b> open it in Chrome, tap the three dots at the top and choose "Install
                app" or "Add to Home screen".
              </p>
              <p>From then on it opens like any other app, in full screen.</p>
            </>
          ),
        },
        {
          q: 'How do I switch to dark mode?',
          a: <p>In Settings, under "Display". The choice is saved separately on each device.</p>,
        },
        {
          q: 'Can I use the app in Hebrew?',
          a: (
            <p>
              Yes. In Settings, under "Display" → "Language". This choice is also saved separately
              on each device, so each of you can use your own language.
            </p>
          ),
        },
      ],
    },
    {
      id: 'more',
      title: 'Good to know',
      icon: PiggyBank,
      questions: [
        {
          q: 'How do I find an old expense?',
          a: (
            <p>
              On the Transactions page you can search by word, and filter by category, who paid,
              "Paid" or "Not yet", and period.
            </p>
          ),
        },
        {
          q: 'Can I change or add categories?',
          a: (
            <p>
              Yes, in Settings under "Categories": name, color and icon. A deleted category leaves
              the list, but what was already recorded in it stays.
            </p>
          ),
        },
        {
          q: 'Can I import a bank or credit card statement?',
          a: <p>Not yet. It's on the way, which is why the button says "Soon".</p>,
        },
        {
          q: 'Is our data safe?',
          a: (
            <p>
              Only the two of you see your household's data, after signing in with email and
              password. There's no connection to your bank or credit card – everything in the app
              is what you typed in.
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
  const partner = partnerName(context)
  const list = isHebrew ? hebrewTopics(say, partner) : englishTopics(partner)
  const tour = useTour()

  return (
    <>
      <Link
        to="/settings"
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ArrowRight className="size-4 ltr:-scale-x-100" aria-hidden />
        {tr({ he: 'להגדרות', en: 'Settings' })}
      </Link>
      <PageHeader
        title={tr({ he: 'איך זה עובד?', en: 'How it works' })}
        description={tr({
          he: 'כל מה שצריך לדעת כדי להשתמש באפליקציה, בקצרה.',
          en: 'Everything you need to know to use the app, in short.',
        })}
      />
      <Button className="mb-5 w-full sm:w-auto" variant="outline" onClick={tour.start}>
        <Compass aria-hidden />
        {tr({ he: 'סיור באפליקציה', en: 'Take the tour' })}
      </Button>
      <nav aria-label={tr({ he: 'נושאים', en: 'Topics' })} className="mb-5 flex flex-wrap gap-2">
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
