import { Ban, Pause, Play } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CategoryIconBadge } from '@/categories/CategoryBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import type { Member } from '@/household/api'
import { formatShortDate } from '@/lib/dates'
import { describeError } from '@/lib/errors'
import { formatMoney } from '@/lib/money'
import { type Schedule, useSchedule, useScheduleAction } from './api'
import { scheduleState, STATE_LABELS } from './labels'
import { InstallmentProgress } from './ScheduleCard'
import { ScheduleForm } from './ScheduleForm'

type ScheduleEditorProps = {
  schedule: Schedule
  members: Member[]
  userId: string
  onDone: () => void
}

/** Status actions, the edit form and the next occurrences of one schedule. */
export function ScheduleEditor({ schedule, members, userId, onDone }: ScheduleEditorProps) {
  const detail = useSchedule(schedule.id)
  const action = useScheduleAction()
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const current = detail.data ?? schedule
  const state = scheduleState(current)
  const isInstallments = current.type === 'installments'

  function run(name: 'pause' | 'resume' | 'cancel', message: string) {
    action.mutate(
      { id: current.id, action: name },
      {
        onSuccess: () => {
          toast.success(message)
          setConfirmingCancel(false)
        },
        onError: (error) => toast.error(describeError(error)),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-3.5">
        <div className="flex items-center gap-3">
          <CategoryIconBadge color={current.category.color} icon={current.category.icon} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{current.description || current.category.name}</p>
            <p className="text-sm text-muted-foreground">{STATE_LABELS[state]}</p>
          </div>
        </div>
        {isInstallments && <InstallmentProgress schedule={current} />}
        {current.status !== 'cancelled' && (
          <div className="flex flex-wrap gap-2">
            {current.status === 'active' && !current.finished && (
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                disabled={action.isPending}
                onClick={() => run('pause', 'ההוראה הושהתה')}
              >
                <Pause aria-hidden />
                השהיה
              </Button>
            )}
            {current.status === 'paused' && (
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                disabled={action.isPending}
                onClick={() => run('resume', 'ההוראה חודשה')}
              >
                <Play aria-hidden />
                חידוש
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-destructive hover:text-destructive"
              disabled={action.isPending}
              onClick={() => setConfirmingCancel(true)}
            >
              <Ban aria-hidden />
              {isInstallments ? 'ביטול התשלומים' : 'ביטול ההוראה'}
            </Button>
          </div>
        )}
        {current.status === 'paused' && (
          <p className="text-sm text-muted-foreground">
            בזמן ההשהיה לא נרשם כלום. בחידוש, מועדים שעברו בזמן ההשהיה ידולגו.
          </p>
        )}
      </div>

      {current.status !== 'cancelled' && (
        <ScheduleForm
          key={current.id}
          type={current.type}
          schedule={current}
          initialKind={current.kind}
          members={members}
          userId={userId}
          onDone={onDone}
        />
      )}

      {detail.data && detail.data.upcoming.length > 0 && (
        <section aria-labelledby="upcoming-title">
          <h3 id="upcoming-title" className="mb-2 text-sm font-medium">
            המועדים הבאים
          </h3>
          <ul className="flex flex-col divide-y rounded-2xl border">
            {detail.data.upcoming.map((occurrence) => (
              <li
                key={occurrence.sequence_no}
                className="flex justify-between gap-3 px-3.5 py-2.5 text-sm"
              >
                <span>
                  {formatShortDate(occurrence.occurred_on)}
                  {isInstallments && (
                    <span className="text-muted-foreground">
                      {' '}
                      · תשלום {occurrence.sequence_no} מתוך {occurrence.installments_count}
                    </span>
                  )}
                </span>
                <span className="tabular-nums">{formatMoney(occurrence.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirmingCancel}
        onOpenChange={setConfirmingCancel}
        title={isInstallments ? 'לבטל את התשלומים?' : 'לבטל את הוראת הקבע?'}
        description="לא ייווצרו יותר מועדים חדשים. מה שכבר נרשם יישאר בהיסטוריה."
        confirmLabel={isInstallments ? 'ביטול התשלומים' : 'ביטול ההוראה'}
        cancelLabel="חזרה"
        onConfirm={() => run('cancel', isInstallments ? 'התשלומים בוטלו' : 'הוראת הקבע בוטלה')}
        pending={action.isPending}
      />
    </div>
  )
}
