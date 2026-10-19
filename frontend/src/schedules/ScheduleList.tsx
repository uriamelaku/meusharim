import { CreditCard, Plus, Repeat } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import type { Member } from '@/household/api'
import { tr } from '@/lib/i18n'
import { useQuickAdd } from '@/transactions/quickAdd'
import { type ScheduleType, useSchedules } from './api'
import { ScheduleCard } from './ScheduleCard'

const TEXT = tr({
  he: {
    recurring: {
      add: 'הוראת קבע חדשה',
      emptyTitle: 'אין הוראות קבע',
      emptyDescription:
        'שכר דירה, משכורת, מנויים: מוסיפים פעם אחת, והמועדים מופיעים לבד בכל חודש.',
      error: 'לא הצלחנו לטעון את הוראות הקבע',
    },
    installments: {
      add: 'רכישה בתשלומים',
      emptyTitle: 'אין רכישות בתשלומים',
      emptyDescription:
        'מזינים את הסכום הכולל ואת מספר התשלומים, וכל תשלום נכנס לחודש שבו הוא יורד.',
      error: 'לא הצלחנו לטעון את התשלומים',
    },
  },
  en: {
    recurring: {
      add: 'New recurring payment',
      emptyTitle: 'No recurring payments',
      emptyDescription:
        'Rent, salary, subscriptions: add them once, and the dates show up by themselves every month.',
      error: "We couldn't load your recurring payments",
    },
    installments: {
      add: 'Purchase in installments',
      emptyTitle: 'No purchases in installments',
      emptyDescription:
        'Enter the total amount and the number of installments, and each payment goes into the month it is charged.',
      error: "We couldn't load your installments",
    },
  },
})

export function ScheduleList({ type, members }: { type: ScheduleType; members: Member[] }) {
  const schedules = useSchedules(type)
  const { add, editSchedule } = useQuickAdd()
  const text = TEXT[type]

  return (
    <div className="flex flex-col gap-4">
      <Button variant="outline" className="self-start" onClick={() => add('expense', type)}>
        <Plus aria-hidden />
        {text.add}
      </Button>
      {schedules.isPending ? (
        <LoadingState />
      ) : schedules.isError ? (
        <ErrorState
          title={text.error}
          description={tr({ he: 'בדקו את החיבור ונסו שוב.', en: 'Check your connection and try again.' })}
          onRetry={() => void schedules.refetch()}
        />
      ) : schedules.data.length === 0 ? (
        <EmptyState
          icon={type === 'recurring' ? Repeat : CreditCard}
          title={text.emptyTitle}
          description={text.emptyDescription}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {schedules.data.map((schedule) => (
            <li key={schedule.id}>
              <ScheduleCard schedule={schedule} members={members} onSelect={editSchedule} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
