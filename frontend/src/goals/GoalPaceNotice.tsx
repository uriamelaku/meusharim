import { PiggyBank } from 'lucide-react'
import { Link } from 'react-router'
import { tr } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { useGoals } from './api'

/**
 * A reminder on the main screen when a dated goal is behind schedule. Without goals,
 * or when every goal is on track, it shows nothing.
 */
export function GoalPaceNotice() {
  const goals = useGoals()
  const behind = goals.data?.find((goal) => goal.behind && goal.monthly_needed)
  if (!behind?.monthly_needed) return null
  return (
    <Link
      to="/budget#goals"
      className="flex items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <PiggyBank className="size-5 shrink-0" aria-hidden />
      <span>
        <b>{behind.name}</b>
        {tr({
          he: ` מאחור: כדי להגיע בזמן צריך ${formatMoney(behind.monthly_needed)} בחודש`,
          en: ` is behind: ${formatMoney(behind.monthly_needed)} a month gets it there on time`,
        })}
      </span>
    </Link>
  )
}
