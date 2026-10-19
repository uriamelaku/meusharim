import { formatFullDate } from '@/lib/dates'
import { locale, tr } from '@/lib/i18n'
import type { Frequency, Schedule } from './api'

export const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'weekly', label: tr({ he: 'שבועי', en: 'Weekly' }) },
  { value: 'monthly', label: tr({ he: 'חודשי', en: 'Monthly' }) },
  { value: 'yearly', label: tr({ he: 'שנתי', en: 'Yearly' }) },
]

const WEEKDAYS = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' })
const DAY_AND_MONTH = new Intl.DateTimeFormat(locale, {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

/** "כל חודש ב-31", "כל שבוע ביום שני", "כל שנה ב-12 באוקטובר" ("Every month on the 31st"…) */
export function describeFrequency(frequency: Frequency, startDate: string): string {
  const date = new Date(`${startDate}T12:00:00Z`)
  if (frequency === 'weekly') {
    const weekday = WEEKDAYS.format(date)
    return tr({ he: `כל שבוע ב${weekday}`, en: `Every week on ${weekday}` })
  }
  if (frequency === 'monthly') {
    const day = date.getUTCDate()
    return tr({ he: `כל חודש ב-${day}`, en: `Every month on the ${ordinal(day)}` })
  }
  const dayAndMonth = DAY_AND_MONTH.format(date)
  return tr({ he: `כל שנה ב-${dayAndMonth}`, en: `Every year on ${dayAndMonth}` })
}

const ORDINAL_SUFFIXES: Partial<Record<Intl.LDMLPluralRule, string>> = {
  one: 'st',
  two: 'nd',
  few: 'rd',
}
const ordinalRules = new Intl.PluralRules('en', { type: 'ordinal' })

/** 1 → "1st", 22 → "22nd", 13 → "13th". */
function ordinal(day: number): string {
  return `${day}${ORDINAL_SUFFIXES[ordinalRules.select(day)] ?? 'th'}`
}

export type ScheduleState = 'active' | 'paused' | 'cancelled' | 'finished'

export function scheduleState(schedule: Schedule): ScheduleState {
  if (schedule.status !== 'active') return schedule.status
  return schedule.finished ? 'finished' : 'active'
}

export const STATE_LABELS: Record<ScheduleState, string> = tr({
  he: { active: 'פעילה', paused: 'מושהית', cancelled: 'בוטלה', finished: 'הסתיימה' },
  en: { active: 'Active', paused: 'Paused', cancelled: 'Cancelled', finished: 'Finished' },
})

export function nextDateText(schedule: Schedule): string | null {
  return schedule.next_occurrence
    ? tr({ he: 'הבא: ', en: 'Next: ' }) + formatFullDate(schedule.next_occurrence.occurred_on)
    : null
}
