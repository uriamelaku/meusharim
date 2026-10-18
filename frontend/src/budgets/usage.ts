import type { ProgressTone } from '@/components/ProgressBar'
import { formatMoney } from '@/lib/money'
import type { UsageStatus } from './api'

export function toneOf(status: UsageStatus | null): ProgressTone {
  if (status === 'over') return 'over'
  if (status === 'near') return 'warning'
  return 'default'
}

/** "נותרו 200 ₪" or "חריגה של 50 ₪". `remaining` is negative when over budget. */
export function remainingText(remaining: string): string {
  return remaining.startsWith('-')
    ? `חריגה של ${formatMoney(remaining.slice(1))}`
    : `נשארו ${formatMoney(remaining)}`
}

export const STATUS_TEXT: Record<UsageStatus, string> = {
  ok: 'בתקציב',
  near: 'מתקרבים לתקציב',
  over: 'חריגה מהתקציב',
}
