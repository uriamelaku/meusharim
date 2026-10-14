import type { Kind } from '@/categories/api'
import { useDataQuery } from '@/lib/data'
import type { UsageStatus } from '@/budgets/api'
import type { Transaction } from '@/transactions/api'

type CategoryRef = Transaction['category']

export type Flow = { actual: string; planned: string }

export type UpcomingItem = {
  source: 'transaction' | 'schedule'
  transaction_id: string | null
  schedule_id: string | null
  schedule_type: 'recurring' | 'installments' | null
  sequence_no: number | null
  installments_count: number | null
  kind: Kind
  occurred_on: string
  amount: string
  category: CategoryRef
  description: string
}

export type MonthSummary = {
  month: string
  income: Flow
  expense: Flow
  balance: string
  projected_balance: string
  budget: {
    budget: string
    actual: string
    remaining: string
    percent: number
    status: UsageStatus
  } | null
  expense_by_category: { category: CategoryRef; actual: string; planned: string }[]
  recent: Transaction[]
  upcoming: UpcomingItem[]
}

export function useMonthSummary(month: string) {
  return useDataQuery<MonthSummary>('/api/summary', { month })
}
