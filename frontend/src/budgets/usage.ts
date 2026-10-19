import type { ProgressTone } from '@/components/ProgressBar'
import { tr } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import type { UsageStatus } from './api'

export function toneOf(status: UsageStatus | null): ProgressTone {
  if (status === 'over') return 'over'
  if (status === 'near') return 'warning'
  return 'default'
}

/** "נשארו 200 ₪" or "חריגה של 50 ₪". `remaining` is negative when over budget. */
export function remainingText(remaining: string): string {
  if (remaining.startsWith('-')) {
    const over = formatMoney(remaining.slice(1))
    return tr({ he: `חריגה של ${over}`, en: `${over} over` })
  }
  const left = formatMoney(remaining)
  return tr({ he: `נשארו ${left}`, en: `${left} left` })
}

export const STATUS_TEXT: Record<UsageStatus, string> = tr({
  he: { ok: 'בתקציב', near: 'מתקרבים לתקציב', over: 'חריגה מהתקציב' },
  en: { ok: 'Within budget', near: 'Close to the budget', over: 'Over budget' },
})
