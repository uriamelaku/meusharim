import { Repeat } from 'lucide-react'
import { CategoryIconBadge } from '@/categories/CategoryBadge'
import type { Member } from '@/household/api'
import { formatShortDate } from '@/lib/dates'
import { formatFlow } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Transaction } from './api'
import { partyName, scheduleLabel } from './labels'

type TransactionRowProps = {
  transaction: Transaction
  members: Member[]
  onSelect: (transaction: Transaction) => void
  showDate?: boolean
}

export function TransactionRow({
  transaction,
  members,
  onSelect,
  showDate = false,
}: TransactionRowProps) {
  const { category, kind, status } = transaction
  const title = transaction.description || category.name
  const fromSchedule = scheduleLabel(transaction)
  const details = [
    transaction.description ? category.name : null,
    showDate ? formatShortDate(transaction.occurred_on) : null,
    partyName(transaction.party_user_id, members),
  ].filter(Boolean)

  return (
    <button
      type="button"
      onClick={() => onSelect(transaction)}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-start transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <CategoryIconBadge color={category.color} icon={category.icon} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{title}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          {fromSchedule && (
            <span className="flex shrink-0 items-center gap-1 text-brass-strong">
              <Repeat className="size-3.5" aria-hidden />
              {fromSchedule}
              <span aria-hidden>·</span>
            </span>
          )}
          <span className="truncate">{details.join(' · ')}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={cn(
            'font-semibold tabular-nums',
            kind === 'income' ? 'text-income' : 'text-foreground',
            status === 'planned' && 'text-muted-foreground',
          )}
        >
          {formatFlow(transaction.amount, kind)}
        </span>
        {status === 'planned' && (
          <span className="rounded-full border border-dashed border-brass px-2 text-xs text-brass-strong">
            מתוכננת
          </span>
        )}
      </span>
    </button>
  )
}
