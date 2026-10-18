import { useDataMutation, useDataQuery } from '@/lib/data'
import type { Transaction } from '@/transactions/api'

export type Goal = {
  id: string
  name: string
  target_amount: string
  target_date: string | null
  saved: string
  remaining: string
  percent: number
  monthly_needed: string | null
  behind: boolean
  reached: boolean
}

export type GoalInput = { name: string; target_amount: string; target_date: string | null }

export type DepositInput = {
  amount: string
  party_user_id: string | null
  request_id: string
}

export function useGoals() {
  return useDataQuery<Goal[]>('/api/goals')
}

export function useCreateGoal() {
  return useDataMutation<Goal, GoalInput>((body) => ({ path: '/api/goals', method: 'POST', body }))
}

export function useUpdateGoal() {
  return useDataMutation<Goal, GoalInput & { id: string }>(({ id, ...body }) => ({
    path: `/api/goals/${id}`,
    method: 'PATCH',
    body,
  }))
}

export function useDeleteGoal() {
  return useDataMutation<{ result: 'deleted' | 'archived' }, string>((id) => ({
    path: `/api/goals/${id}`,
    method: 'DELETE',
  }))
}

export function useDeposit(goalId: string) {
  return useDataMutation<Transaction, DepositInput>((body) => ({
    path: `/api/goals/${goalId}/deposits`,
    method: 'POST',
    body,
  }))
}
