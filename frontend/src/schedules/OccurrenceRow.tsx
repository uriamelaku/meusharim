import { CalendarClock } from 'lucide-react'
import { CategoryIconBadge } from '@/categories/CategoryBadge'
import type { Member } from '@/household/api'
import { formatShortDate } from '@/lib/dates'
import { formatFlow } from '@/lib/money'
import { partyName } from '@/transactions/labels'
import type { Occurrence } from './api'

/** A future occurrence of a schedule. Not a transaction yet, so it is shown dimmed. */
export function OccurrenceRow({
  occurrence,
  members,
}: {
  occurrence: Occurrence
  members: Member[]
}) {
  const label =
    occurrence.type === 'installments'
      ? `תשלום ${occurrence.sequence_no} מתוך ${occurrence.installments_count}`
      : 'הוראת קבע'
  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
      <CategoryIconBadge
        color={occurrence.category.color}
        icon={occurrence.category.icon}
        className="opacity-70"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium text-muted-foreground">
          {occurrence.description || occurrence.category.name}
        </span>
        <span className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          <CalendarClock className="size-3.5 shrink-0" aria-hidden />
          {formatShortDate(occurrence.occurred_on)} · {label} ·{' '}
          {partyName(occurrence.party_user_id, members)}
        </span>
      </span>
      <span className="shrink-0 font-semibold text-muted-foreground tabular-nums">
        {formatFlow(occurrence.amount, occurrence.kind)}
      </span>
    </div>
  )
}
