import { formatFullDate } from '@/lib/dates'
import type { Frequency, Schedule } from './api'

export const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'weekly', label: 'שבועי' },
  { value: 'monthly', label: 'חודשי' },
  { value: 'yearly', label: 'שנתי' },
]

const WEEKDAYS = new Intl.DateTimeFormat('he-IL', { weekday: 'long', timeZone: 'UTC' })
const DAY_AND_MONTH = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

/** "כל חודש ב-31", "כל שבוע ביום שני", "כל שנה ב-12 באוקטובר" */
export function describeFrequency(frequency: Frequency, startDate: string): string {
  const date = new Date(`${startDate}T12:00:00Z`)
  if (frequency === 'weekly') return `כל שבוע ב${WEEKDAYS.format(date)}`
  if (frequency === 'monthly') return `כל חודש ב-${date.getUTCDate()}`
  return `כל שנה ב-${DAY_AND_MONTH.format(date)}`
}

export type ScheduleState = 'active' | 'paused' | 'cancelled' | 'finished'

export function scheduleState(schedule: Schedule): ScheduleState {
  if (schedule.status !== 'active') return schedule.status
  return schedule.finished ? 'finished' : 'active'
}

export const STATE_LABELS: Record<ScheduleState, string> = {
  active: 'פעילה',
  paused: 'מושהית',
  cancelled: 'בוטלה',
  finished: 'הסתיימה',
}

export function nextDateText(schedule: Schedule): string | null {
  return schedule.next_occurrence
    ? `הבא: ${formatFullDate(schedule.next_occurrence.occurred_on)}`
    : null
}
