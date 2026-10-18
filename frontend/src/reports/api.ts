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

export type CategoryChange = {
  category: Transaction['category']
  actual: string
  previous: string
  difference: string
  change_percent: number | null
}

export type MonthInsights = {
  month: string
  previous_month: string
  income: string
  expense: string
  balance: string
  previous_expense: string
  expense_change_percent: number | null
  categories: CategoryChange[]
  forecast: {
    expense: string
    income: string
    balance: string
    budget: string | null
    over_budget: boolean
  } | null
  year: {
    year: number
    income: string
    expense: string
    balance: string
    saved_to_goals: string
    total_saved: string
  }
}

export function useInsights(month: string, enabled = true) {
  return useDataQuery<MonthInsights>('/api/reports/insights', { month }, enabled)
}
