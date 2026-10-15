import type { Kind } from '@/categories/api'
import { useDataMutation, useDataQuery } from '@/lib/data'
import type { Transaction } from '@/transactions/api'

export type ScheduleType = 'recurring' | 'installments'
export type Frequency = 'weekly' | 'monthly' | 'yearly'
export type ScheduleStatus = 'active' | 'paused' | 'cancelled'

type CategoryRef = Transaction['category']

/** A future occurrence: planned money that is not in the ledger yet. */
export type Occurrence = {
  schedule_id: string
  type: ScheduleType
  kind: Kind
  sequence_no: number
  installments_count: number | null
  occurred_on: string
  amount: string
  category: CategoryRef
  description: string
  party_user_id: string | null
}

export type Schedule = {
  id: string
  type: ScheduleType
  kind: Kind
  category: CategoryRef
  description: string
  party_user_id: string | null
  frequency: Frequency
  start_date: string
  end_date: string | null
  amount: string | null
  total_amount: string | null
  installments_count: number | null
  status: ScheduleStatus
  auto_confirm: boolean
  recorded_count: number
  completed_count: number
  completed_amount: string
  remaining_amount: string | null
  next_occurrence: Occurrence | null
  finished: boolean
}

export type ScheduleDetail = Schedule & { upcoming: Occurrence[] }

type Common = {
  kind: Kind
  category_id: string
  description: string
  party_user_id: string | null
  start_date: string
  auto_confirm: boolean
}

export type RecurringInput = Common & {
  type: 'recurring'
  frequency: Frequency
  end_date: string | null
  amount: string
}

export type InstallmentsInput = Common & {
  type: 'installments'
  total_amount: string
  installments_count: number
}

export type ScheduleInput = RecurringInput | InstallmentsInput

export function useSchedules(type: ScheduleType) {
  return useDataQuery<Schedule[]>('/api/schedules', { type })
}

export function useSchedule(id: string | null) {
  return useDataQuery<ScheduleDetail>(`/api/schedules/${id}`, undefined, id !== null)
}

export function useOccurrences(from: string, to: string, kind?: Kind) {
  return useDataQuery<Occurrence[]>('/api/schedules/occurrences', { from, to, kind })
}

/** `request_id`: see useCreateTransaction. */
export function useCreateSchedule() {
  return useDataMutation<ScheduleDetail, ScheduleInput & { request_id: string }>((body) => ({
    path: '/api/schedules',
    method: 'POST',
    body,
  }))
}

export function useUpdateSchedule() {
  return useDataMutation<ScheduleDetail, { id: string; changes: Record<string, unknown> }>(
    ({ id, changes }) => ({ path: `/api/schedules/${id}`, method: 'PATCH', body: changes }),
  )
}

export function useScheduleAction() {
  return useDataMutation<ScheduleDetail, { id: string; action: 'pause' | 'resume' | 'cancel' }>(
    ({ id, action }) => ({ path: `/api/schedules/${id}/${action}`, method: 'POST' }),
  )
}
