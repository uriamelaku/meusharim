import { createContext, use } from 'react'
import type { Kind } from '@/categories/api'
import type { Transaction } from './api'

export type QuickAdd = {
  /** Opens the add form, e.g. from the dashboard or the floating button. */
  add: (kind?: Kind) => void
  edit: (transaction: Transaction) => void
}

export const QuickAddContext = createContext<QuickAdd | null>(null)

export function useQuickAdd(): QuickAdd {
  const quickAdd = use(QuickAddContext)
  if (!quickAdd) throw new Error('useQuickAdd must be used inside QuickAddProvider')
  return quickAdd
}
