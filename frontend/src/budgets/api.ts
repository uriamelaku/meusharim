import { useDataMutation, useDataQuery } from '@/lib/data'
import type { Transaction } from '@/transactions/api'

export type UsageStatus = 'ok' | 'near' | 'over'

export type CategoryBudget = {
  category: Transaction['category']
  budget: string | null
  actual: string
  planned: string
  remaining: string | null
  percent: number | null
  status: UsageStatus | null
}

export type BudgetMonth = {
  month: string
  total_budget: string | null
  effective_budget: string | null
  actual: string
  planned: string
  remaining: string | null
  percent: number | null
  status: UsageStatus | null
  categories: CategoryBudget[]
  previous_month_has_budget: boolean
}

export type BudgetInput = {
  total: string | null
  categories: { category_id: string; amount: string }[]
}

export function useBudget(month: string) {
  return useDataQuery<BudgetMonth>('/api/budgets', { month })
}

export function useSaveBudget(month: string) {
  return useDataMutation<BudgetMonth, BudgetInput>((body) => ({
    path: '/api/budgets',
    method: 'PUT',
    params: { month },
    body,
  }))
}

export function useCopyPreviousBudget(month: string) {
  return useDataMutation<BudgetMonth>(() => ({
    path: '/api/budgets/copy-previous',
    method: 'POST',
    params: { month },
  }))
}
