import { useDataQuery } from '@/lib/data'
import type { Transaction } from '@/transactions/api'

export type MonthRow = {
  month: string
  income: string
  expense: string
  balance: string
  income_planned: string
  expense_planned: string
  expense_change_percent: number | null
}

export type CategoryRow = {
  category: Transaction['category']
  actual: string
  planned: string
  share_percent: number
}

export type YearRow = {
  year: number
  income: string
  expense: string
  balance: string
  previous_income: string
  previous_expense: string
  income_change_percent: number | null
  expense_change_percent: number | null
}

export type Report = {
  date_from: string
  date_to: string
  income: string
  expense: string
  balance: string
  income_planned: string
  expense_planned: string
  average_monthly_expense: string
  months: MonthRow[]
  categories: CategoryRow[]
  years: YearRow[]
}

export function useReport(from: string, to: string) {
  return useDataQuery<Report>('/api/reports', { from, to })
}
