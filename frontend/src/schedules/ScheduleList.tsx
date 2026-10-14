import { CreditCard, Plus, Repeat } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import type { Member } from '@/household/api'
import { useQuickAdd } from '@/transactions/quickAdd'
import { type ScheduleType, useSchedules } from './api'
import { ScheduleCard } from './ScheduleCard'

const TEXT = {
  recurring: {
    add: 'הוראת קבע חדשה',
    emptyTitle: 'אין הוראות קבע',
    emptyDescription: 'שכר דירה, משכורת, מנויים – הוסיפו פעם אחת, והמועדים יופיעו לבד בכל תקופה.',
    error: 'לא הצלחנו לטעון את הוראות הקבע',
  },
  installments: {
    add: 'רכישה בתשלומים',
    emptyTitle: 'אין רכישות בתשלומים',
    emptyDescription:
      'הזינו את הסכום הכולל ומספר התשלומים, וכל תשלום ייכנס לחודש שלו – בלי ספירה כפולה.',
    error: 'לא הצלחנו לטעון את התשלומים',
  },
}

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
          description="בדקו את החיבור ונסו שוב."
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
