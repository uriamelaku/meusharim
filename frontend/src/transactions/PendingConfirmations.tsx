import { Check, CheckCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Member } from '@/household/api'
import { todayIso } from '@/lib/dates'
import { describeError } from '@/lib/errors'
import { tr } from '@/lib/i18n'
import { useConfirmTransactions, useTransactions } from './api'
import { useQuickAdd } from './quickAdd'
import { TransactionRow } from './TransactionRow'

const MAX_SHOWN = 50

/**
 * Planned transactions whose date has arrived. They stay planned until someone confirms
 * them; tapping a row opens it for editing (e.g. a utility bill with a different amount).
 */
export function PendingConfirmations({ members }: { members: Member[] }) {
  const pending = useTransactions({
    status: 'planned',
    to: todayIso(),
    sort: 'date_asc',
    limit: MAX_SHOWN,
  })
  const confirm = useConfirmTransactions()
  const { edit } = useQuickAdd()
  const items = pending.data?.items ?? []
  if (items.length === 0) return null

  function confirmIds(ids: string[]) {
    confirm.mutate(ids, {
      onSuccess: ({ confirmed }) =>
        toast.success(
          confirmed === 1
            ? tr({ he: 'סומן כשולם', en: 'Marked as paid' })
            : tr({ he: `${confirmed} סומנו כשולמו`, en: `${confirmed} marked as paid` }),
        ),
      onError: (error) => toast.error(describeError(error)),
    })
  }

  return (
    <section
      aria-labelledby="pending-title"
      className="rounded-3xl border border-brass/40 bg-accent/50 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="pending-title" className="font-heading text-lg font-semibold">
            {tr({ he: 'שולם כבר?', en: 'Already paid?' })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tr({
              he: 'הגיע המועד. מסמנים מה באמת יצא מהחשבון (או נכנס אליו), ורק אז זה נכנס ליתרה.',
              en: 'These are due. Mark what actually left your account (or came in), and only then does it count in the balance.',
            })}
          </p>
        </div>
        {items.length > 1 && (
          <Button
            variant="outline"
            onClick={() => confirmIds(items.map((t) => t.id))}
            disabled={confirm.isPending}
          >
            {confirm.isPending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <CheckCheck aria-hidden />
            )}
            {tr({ he: `הכל שולם (${items.length})`, en: `All paid (${items.length})` })}
          </Button>
        )}
      </div>
      <ul className="mt-3 flex flex-col gap-1">
        {items.map((transaction) => (
          <li key={transaction.id} className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <TransactionRow
                transaction={transaction}
                members={members}
                onSelect={edit}
                showDate
              />
            </div>
            <Button
              size="icon"
              variant="secondary"
              aria-label={tr({
                he: `סימון "${transaction.description || transaction.category.name}" כשולם`,
                en: `Mark "${transaction.description || transaction.category.name}" as paid`,
              })}
              onClick={() => confirmIds([transaction.id])}
              disabled={confirm.isPending}
            >
              <Check className="size-5" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
