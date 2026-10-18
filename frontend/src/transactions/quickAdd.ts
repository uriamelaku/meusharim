import { createContext, use } from 'react'
import type { Kind } from '@/categories/api'
import type { Schedule } from '@/schedules/api'
import type { Transaction } from './api'

/** A one-time transaction, a recurring entry or an installment purchase. */
export type EntryType = 'once' | 'recurring' | 'installments'

export type QuickAdd = {
  /** Opens the add form, e.g. from the add button or a category on the main screen. */
  add: (kind?: Kind, entry?: EntryType, categoryId?: string) => void
  edit: (transaction: Transaction) => void
  editSchedule: (schedule: Schedule) => void
}

export const QuickAddContext = createContext<QuickAdd | null>(null)

export function useQuickAdd(): QuickAdd {
  const quickAdd = use(QuickAddContext)
  if (!quickAdd) throw new Error('useQuickAdd must be used inside QuickAddProvider')
  return quickAdd
}
