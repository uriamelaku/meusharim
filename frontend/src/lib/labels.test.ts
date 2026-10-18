import { afterEach, describe, expect, it, vi } from 'vitest'
import { remainingText, toneOf } from '@/budgets/usage'
import type { Schedule } from '@/schedules/api'
import { describeFrequency, scheduleState } from '@/schedules/labels'
import type { Transaction } from '@/transactions/api'
import { defaultStatusFor, partyName, scheduleLabel } from '@/transactions/labels'

describe('defaultStatusFor', () => {
  afterEach(() => vi.useRealTimers())

  it('suggests planned only for future dates in Israel', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-14T21:30:00Z')) // already Oct 15 in Israel
    expect(defaultStatusFor('2026-10-15')).toBe('completed')
    expect(defaultStatusFor('2026-10-16')).toBe('planned')
    expect(defaultStatusFor('2020-01-01')).toBe('completed')
  })
})

describe('partyName', () => {
  const members = [{ user_id: 'a', display_name: 'אורי', joined_at: '' }]
  it('names members and the joint account', () => {
    expect(partyName('a', members)).toBe('אורי')
    expect(partyName(null, members)).toBe('משותף')
  })
})

describe('scheduleLabel', () => {
  const base = { schedule: null } as unknown as Transaction
  it('labels installments and recurring rows', () => {
    expect(scheduleLabel(base)).toBeNull()
    expect(
      scheduleLabel({
        ...base,
        schedule: { id: 's', type: 'installments', sequence_no: 3, installments_count: 12 },
      }),
    ).toBe('תשלום 3 מתוך 12')
    expect(
      scheduleLabel({
        ...base,
        schedule: { id: 's', type: 'recurring', sequence_no: 7, installments_count: null },
      }),
    ).toBe('הוראת קבע')
  })
})

describe('describeFrequency', () => {
  it.each([
    ['monthly', '2026-01-31', 'כל חודש ב-31'],
    ['weekly', '2026-10-12', 'כל שבוע ביום שני'],
    ['yearly', '2028-02-29', 'כל שנה ב-29 בפברואר'],
  ] as const)('%s from %s', (frequency, start, expected) => {
    expect(describeFrequency(frequency, start)).toBe(expected)
  })
})

describe('scheduleState', () => {
  it('distinguishes finished from active', () => {
    const schedule = { status: 'active', finished: true } as Schedule
    expect(scheduleState(schedule)).toBe('finished')
    expect(scheduleState({ ...schedule, finished: false })).toBe('active')
    expect(scheduleState({ ...schedule, status: 'paused' })).toBe('paused')
  })
})

describe('budget usage text', () => {
  it('shows what is left or how much is over', () => {
    expect(remainingText('200.00')).toMatch(/^נשארו .*200/)
    expect(remainingText('-8.50')).toMatch(/^חריגה של .*8\.50/)
    expect(remainingText('-8.50')).not.toContain('-')
  })

  it('maps status to bar tone', () => {
    expect(toneOf('over')).toBe('over')
    expect(toneOf('near')).toBe('warning')
    expect(toneOf('ok')).toBe('default')
    expect(toneOf(null)).toBe('default')
  })
})
