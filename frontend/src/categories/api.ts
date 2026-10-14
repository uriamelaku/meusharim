import { useDataMutation, useDataQuery } from '@/lib/data'

export type Kind = 'income' | 'expense'

export const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'expense', label: 'הוצאות' },
  { value: 'income', label: 'הכנסות' },
]

export type Category = {
  id: string
  kind: Kind
  name: string
  color: string
  icon: string
  archived: boolean
}

export type CategoryInput = { name: string; color: string; icon: string }

export function useCategories() {
  return useDataQuery<Category[]>('/api/categories')
}

export function useCreateCategory() {
  return useDataMutation<Category, CategoryInput & { kind: Kind }>((body) => ({
    path: '/api/categories',
    method: 'POST',
    body,
  }))
}

export function useUpdateCategory() {
  return useDataMutation<Category, CategoryInput & { id: string }>(({ id, ...body }) => ({
    path: `/api/categories/${id}`,
    method: 'PATCH',
    body,
  }))
}

export function useDeleteCategory() {
  return useDataMutation<{ result: 'deleted' | 'archived' }, string>((id) => ({
    path: `/api/categories/${id}`,
    method: 'DELETE',
  }))
}
