import { CalendarClock } from 'lucide-react'
import { CategoryIconBadge } from '@/categories/CategoryBadge'
import { formatRelativeDay } from '@/lib/dates'
import { formatFlow } from '@/lib/money'
import type { UpcomingItem } from './api'

function sourceLabel(item: UpcomingItem): string {
  if (item.schedule_type === 'installments') {
    return `תשלום ${item.sequence_no} מתוך ${item.installments_count}`
  }
  if (item.schedule_type === 'recurring') return 'הוראת קבע'
  return item.kind === 'expense' ? 'עוד לא שולם' : 'עוד לא התקבל'
}

/** A planned item still to come this month. Dimmed: it is not part of the balance yet. */
export function UpcomingRow({ item }: { item: UpcomingItem }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <CategoryIconBadge
        color={item.category.color}
        icon={item.category.icon}
        className="opacity-75"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{item.description || item.category.name}</span>
        <span className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          <CalendarClock className="size-3.5 shrink-0" aria-hidden />
          {formatRelativeDay(item.occurred_on)} · {sourceLabel(item)}
        </span>
      </span>
      <span className="shrink-0 font-semibold text-muted-foreground tabular-nums">
        {formatFlow(item.amount, item.kind)}
      </span>
    </div>
  )
}
