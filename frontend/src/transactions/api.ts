import type { Kind } from '@/categories/api'
import { useDataMutation, useDataQuery } from '@/lib/data'

export type TransactionStatus = 'planned' | 'completed'

export type Transaction = {
  id: string
  kind: Kind
  amount: string
  occurred_on: string
  category: { id: string; name: string; color: string; icon: string; archived: boolean }
  description: string
  status: TransactionStatus
  party_user_id: string | null
  created_by: string
  schedule: {
    id: string
    type: 'recurring' | 'installments'
    sequence_no: number
    installments_count: number | null
  } | null
}

export type TransactionPage = { items: Transaction[]; total: number }

export type TransactionInput = {
  kind: Kind
  amount: string
  occurred_on: string
  category_id: string
  description: string
  status: TransactionStatus
  party_user_id: string | null
}

export type SortOrder = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'

export type TransactionQuery = {
  from?: string
  to?: string
  kind?: Kind
  status?: TransactionStatus
  category_id?: string
  /** A member's user id, or "joint". */
  party?: string
  q?: string
  sort?: SortOrder
  limit?: number
  offset?: number
}

export function useTransactions(query: TransactionQuery) {
  return useDataQuery<TransactionPage>('/api/transactions', query)
}

export function useCreateTransaction() {
  return useDataMutation<Transaction, TransactionInput>((body) => ({
    path: '/api/transactions',
    method: 'POST',
    body,
  }))
}

export function useUpdateTransaction() {
  return useDataMutation<Transaction, TransactionInput & { id: string }>(({ id, ...body }) => ({
    path: `/api/transactions/${id}`,
    method: 'PATCH',
    body,
  }))
}

export function useDeleteTransaction() {
  return useDataMutation<void, string>((id) => ({
    path: `/api/transactions/${id}`,
    method: 'DELETE',
  }))
}

export function useConfirmTransactions() {
  return useDataMutation<{ confirmed: number }, string[]>((ids) => ({
    path: '/api/transactions/confirm',
    method: 'POST',
    body: { ids },
  }))
}
