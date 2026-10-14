import { type ReactNode, useMemo, useState } from 'react'
import type { Kind } from '@/categories/api'
import { Sheet } from '@/components/Sheet'
import type { Household } from '@/household/api'
import type { Transaction } from './api'
import { type QuickAdd, QuickAddContext } from './quickAdd'
import { TransactionForm } from './TransactionForm'

type OpenForm = { kind: Kind; transaction?: Transaction }

type QuickAddProviderProps = { household: Household; userId: string; children: ReactNode }

/** One add/edit sheet for the whole app, so every screen opens the same form. */
export function QuickAddProvider({ household, userId, children }: QuickAddProviderProps) {
  const [form, setForm] = useState<OpenForm | null>(null)
  // Kept while the sheet animates closed, so the title does not jump.
  const [lastForm, setLastForm] = useState<OpenForm | null>(null)

  const quickAdd = useMemo<QuickAdd>(
    () => ({
      add: (kind = 'expense') => {
        setForm({ kind })
        setLastForm({ kind })
      },
      edit: (transaction) => {
        setForm({ kind: transaction.kind, transaction })
        setLastForm({ kind: transaction.kind, transaction })
      },
    }),
    [],
  )

  const shown = form ?? lastForm
  return (
    <QuickAddContext value={quickAdd}>
      {children}
      <Sheet
        open={form !== null}
        onOpenChange={(open) => !open && setForm(null)}
        title={shown?.transaction ? 'עריכת תנועה' : 'תנועה חדשה'}
      >
        {form && (
          <TransactionForm
            key={form.transaction?.id ?? 'new'}
            transaction={form.transaction}
            initialKind={form.kind}
            members={household.members}
            userId={userId}
            onDone={() => setForm(null)}
          />
        )}
      </Sheet>
    </QuickAddContext>
  )
}
