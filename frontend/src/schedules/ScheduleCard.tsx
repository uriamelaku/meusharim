import { CategoryIconBadge } from '@/categories/CategoryBadge'
import { ProgressBar } from '@/components/ProgressBar'
import type { Member } from '@/household/api'
import { tr } from '@/lib/i18n'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { partyName } from '@/transactions/labels'
import type { Schedule } from './api'
import { describeFrequency, nextDateText, scheduleState, STATE_LABELS } from './labels'

const STATE_STYLES = {
  active: 'bg-secondary text-primary',
  paused: 'bg-accent text-accent-foreground',
  cancelled: 'bg-muted text-muted-foreground',
  finished: 'bg-muted text-muted-foreground',
}

/** "3 of 12 paid" with a bar, and what is left to pay. */
export function InstallmentProgress({ schedule }: { schedule: Schedule }) {
  const count = schedule.installments_count ?? 0
  return (
    <div className="flex flex-col gap-1.5">
      <ProgressBar
        percent={count ? (schedule.completed_count / count) * 100 : 0}
        label={tr({
          he: `שולמו ${schedule.completed_count} מתוך ${count} תשלומים`,
          en: `${schedule.completed_count} of ${count} installments paid`,
        })}
      />
      <div className="flex justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {tr({
            he: `שולמו ${schedule.completed_count} מתוך ${count}`,
            en: `${schedule.completed_count} of ${count} paid`,
          })}
        </span>
        {schedule.remaining_amount && (
          <span>
            {tr({
              he: `נשארו ${formatMoney(schedule.remaining_amount)}`,
              en: `${formatMoney(schedule.remaining_amount)} left`,
            })}
          </span>
        )}
      </div>
    </div>
  )
}

type ScheduleCardProps = {
  schedule: Schedule
  members: Member[]
  onSelect: (schedule: Schedule) => void
}

export function ScheduleCard({ schedule, members, onSelect }: ScheduleCardProps) {
  const state = scheduleState(schedule)
  const isInstallments = schedule.type === 'installments'
  const amount = isInstallments ? schedule.total_amount : schedule.amount
  const subtitle = isInstallments
    ? tr({
        he: `${schedule.installments_count} תשלומים · ${partyName(schedule.party_user_id, members)}`,
        en: `${schedule.installments_count} installments · ${partyName(schedule.party_user_id, members)}`,
      })
    : `${describeFrequency(schedule.frequency, schedule.start_date)} · ${partyName(schedule.party_user_id, members)}`

  return (
    <button
      type="button"
      onClick={() => onSelect(schedule)}
      className={cn(
        'flex w-full flex-col gap-3 rounded-2xl border bg-card p-4 text-start transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        (state === 'cancelled' || state === 'finished') && 'opacity-70',
      )}
    >
      <span className="flex w-full items-center gap-3">
        <CategoryIconBadge color={schedule.category.color} icon={schedule.category.icon} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-medium">
            {schedule.description || schedule.category.name}
          </span>
          <span className="truncate text-sm text-muted-foreground">{subtitle}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              'font-semibold tabular-nums',
              schedule.kind === 'income' ? 'text-income' : 'text-foreground',
            )}
          >
            {amount && formatMoney(amount)}
          </span>
          <span className={cn('rounded-full px-2 text-xs', STATE_STYLES[state])}>
            {STATE_LABELS[state]}
          </span>
        </span>
      </span>
      {isInstallments && <InstallmentProgress schedule={schedule} />}
      {nextDateText(schedule) && (
        <span className="text-sm text-muted-foreground">
          {nextDateText(schedule)}
          {schedule.next_occurrence && isInstallments
            ? ` · ${formatMoney(schedule.next_occurrence.amount)}`
            : ''}
        </span>
      )}
    </button>
  )
}
