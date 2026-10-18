import { Pencil, PiggyBank, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useShellContext } from '@/components/shellContext'
import { ProgressBar } from '@/components/ProgressBar'
import { Sheet } from '@/components/Sheet'
import { ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { formatFullDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { type Goal, useGoals } from './api'
import { DepositForm } from './DepositForm'
import { GoalForm } from './GoalForm'

type Open = { mode: 'new' } | { mode: 'edit'; goal: Goal } | { mode: 'deposit'; goal: Goal } | null

/** Savings goals with their progress, a deposit button and editing. */
export function GoalsSection() {
  const { user, household } = useShellContext()
  const goals = useGoals()
  const { hash } = useLocation()
  const sectionRef = useRef<HTMLElement>(null)
  const [open, setOpen] = useState<Open>(null)
  // Links to /budget#goals (e.g. from the main screen) land here once the list is in.
  useEffect(() => {
    if (hash === '#goals' && goals.isSuccess) sectionRef.current?.scrollIntoView({ block: 'start' })
  }, [hash, goals.isSuccess])
  const [last, setLast] = useState<Open>(null)
  const show = (next: Open) => {
    setOpen(next)
    setLast(next)
  }
  const sheet = open ?? last
  const close = () => setOpen(null)

  return (
    <section
      ref={sectionRef}
      id="goals"
      aria-labelledby="goals-title"
      className="scroll-mt-20"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id="goals-title" className="font-heading text-xl font-semibold">
          יעדי חיסכון
        </h2>
        <Button variant="ghost" size="sm" className="h-9" onClick={() => show({ mode: 'new' })}>
          <Plus aria-hidden />
          יעד חדש
        </Button>
      </div>

      {goals.isPending ? (
        <LoadingState />
      ) : goals.isError ? (
        <ErrorState
          title="לא הצלחנו לטעון את היעדים"
          description="בדקו את החיבור ונסו שוב."
          onRetry={() => void goals.refetch()} />
      ) : goals.data.length === 0 ? (
        <button
          type="button"
          onClick={() => show({ mode: 'new' })}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed p-4 text-start text-sm text-muted-foreground hover:bg-muted"
        >
          <PiggyBank className="size-6 shrink-0 text-primary" aria-hidden />
          חוסכים למשהו? אפשר להגדיר יעד, למשל חופשה או קרן חירום, ולעקוב אחרי ההתקדמות.
        </button>
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.data.map((goal) => (
            <li key={goal.id}>
              <GoalCard
                goal={goal}
                onDeposit={() => show({ mode: 'deposit', goal })}
                onEdit={() => show({ mode: 'edit', goal })}
              />
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={open !== null}
        onOpenChange={(next) => !next && close()}
        title={
          sheet?.mode === 'new'
            ? 'יעד חיסכון חדש'
            : sheet?.mode === 'edit'
              ? 'עריכת יעד'
              : `הפקדה ל${sheet?.goal.name ?? ''}`
        }
      >
        {open?.mode === 'new' && <GoalForm onDone={close} />}
        {open?.mode === 'edit' && <GoalForm key={open.goal.id} goal={open.goal} onDone={close} />}
        {open?.mode === 'deposit' && (
          <DepositForm
            goal={open.goal}
            members={household.members}
            userId={user.id}
            onDone={close}
          />
        )}
      </Sheet>
    </section>
  )
}

function GoalCard({
  goal,
  onDeposit,
  onEdit,
}: {
  goal: Goal
  onDeposit: () => void
  onEdit: () => void
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{goal.name}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatMoney(goal.saved)} מתוך {formatMoney(goal.target_amount)}
            {goal.target_date && ` · עד ${formatFullDate(goal.target_date)}`}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label={`עריכת ${goal.name}`} onClick={onEdit}>
          <Pencil className="size-4" aria-hidden />
        </Button>
      </div>
      <ProgressBar
        percent={goal.percent}
        label={`${goal.name}: נחסכו ${goal.percent}%`}
        className="h-2.5"
      />
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            'text-sm',
            goal.reached
              ? 'font-semibold text-income'
              : goal.behind
                ? 'text-brass-strong'
                : 'text-muted-foreground',
          )}
        >
          {goal.reached
            ? 'הגעתם ליעד!'
            : goal.monthly_needed
              ? `${goal.behind ? 'מאחור · ' : ''}${formatMoney(goal.monthly_needed)} בחודש כדי להגיע בזמן`
              : `נשארו ${formatMoney(goal.remaining)}`}
        </p>
        <Button size="sm" className="h-9 shrink-0 px-3" onClick={onDeposit}>
          <Plus aria-hidden />
          הפקדה
        </Button>
      </div>
    </div>
  )
}
