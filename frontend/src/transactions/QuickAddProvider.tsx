import { type ReactNode, useMemo, useState } from 'react'
import type { Kind } from '@/categories/api'
import { Segmented } from '@/components/Segmented'
import { Sheet } from '@/components/Sheet'
import type { Household } from '@/household/api'
import type { Schedule } from '@/schedules/api'
import { ScheduleEditor } from '@/schedules/ScheduleEditor'
import { ScheduleForm } from '@/schedules/ScheduleForm'
import type { Transaction } from './api'
import { type EntryType, type QuickAdd, QuickAddContext } from './quickAdd'
import { TransactionForm } from './TransactionForm'

type OpenSheet =
  | { mode: 'add'; kind: Kind; entry: EntryType }
  | { mode: 'transaction'; transaction: Transaction }
  | { mode: 'schedule'; schedule: Schedule }

const ENTRY_OPTIONS: { value: EntryType; label: string }[] = [
  { value: 'once', label: 'חד-פעמית' },
  { value: 'recurring', label: 'הוראת קבע' },
  { value: 'installments', label: 'תשלומים' },
]

const TITLES: Record<EntryType, string> = {
  once: 'תנועה חדשה',
  recurring: 'הוראת קבע חדשה',
  installments: 'רכישה בתשלומים',
}

function titleOf(sheet: OpenSheet | null): string {
  if (!sheet) return ''
  if (sheet.mode === 'add') return TITLES[sheet.entry]
  if (sheet.mode === 'transaction') return 'עריכת תנועה'
  return sheet.schedule.type === 'installments' ? 'רכישה בתשלומים' : 'הוראת קבע'
}

type QuickAddProviderProps = { household: Household; userId: string; children: ReactNode }

/** One add/edit sheet for the whole app, so every screen opens the same forms. */
export function QuickAddProvider({ household, userId, children }: QuickAddProviderProps) {
  const [sheet, setSheet] = useState<OpenSheet | null>(null)
  // Kept while the sheet animates closed, so the title does not jump.
  const [lastSheet, setLastSheet] = useState<OpenSheet | null>(null)

  const quickAdd = useMemo<QuickAdd>(() => {
    const open = (next: OpenSheet) => {
      setSheet(next)
      setLastSheet(next)
    }
    return {
      add: (kind = 'expense', entry = 'once') => open({ mode: 'add', kind, entry }),
      edit: (transaction) => open({ mode: 'transaction', transaction }),
      editSchedule: (schedule) => open({ mode: 'schedule', schedule }),
    }
  }, [])

  const close = () => setSheet(null)
  const common = { members: household.members, userId, onDone: close }

  return (
    <QuickAddContext value={quickAdd}>
      {children}
      <Sheet
        open={sheet !== null}
        onOpenChange={(open) => !open && close()}
        title={titleOf(sheet ?? lastSheet)}
      >
        {sheet?.mode === 'add' && (
          <div className="flex flex-col gap-6">
            <Segmented
              label="סוג הרישום"
              options={ENTRY_OPTIONS}
              value={sheet.entry}
              onChange={(entry) => setSheet({ ...sheet, entry })}
            />
            {sheet.entry === 'once' ? (
              <TransactionForm initialKind={sheet.kind} {...common} />
            ) : (
              <ScheduleForm
                key={sheet.entry}
                type={sheet.entry}
                initialKind={sheet.kind}
                {...common}
              />
            )}
          </div>
        )}
        {sheet?.mode === 'transaction' && (
          <TransactionForm
            key={sheet.transaction.id}
            transaction={sheet.transaction}
            initialKind={sheet.transaction.kind}
            {...common}
          />
        )}
        {sheet?.mode === 'schedule' && (
          <ScheduleEditor key={sheet.schedule.id} schedule={sheet.schedule} {...common} />
        )}
      </Sheet>
    </QuickAddContext>
  )
}
