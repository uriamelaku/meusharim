import { describe, expect, it, vi } from 'vitest'
import type { CategoryBudget } from './api'

vi.mock('@/auth/useAuth', () => ({ useSession: () => ({}) }))
const { budgetAlertFor } = await import('./budgetAlert')

const row = (extra: Partial<CategoryBudget>): CategoryBudget => ({
  category: { id: 'food', name: 'מזון', color: 'green', icon: 'shopping-basket', archived: false },
  budget: '1000.00',
  actual: '0.00',
  planned: '0.00',
  remaining: '1000.00',
  percent: 0,
  status: 'ok',
  ...extra,
})
const never = () => false

describe('budgetAlertFor', () => {
  it('stays quiet below 80% and without a budget', () => {
    expect(budgetAlertFor('2026-10', row({ percent: 79 }), never)).toBeNull()
    expect(
      budgetAlertFor('2026-10', row({ budget: null, remaining: null, percent: null, status: null }), never),
    ).toBeNull()
  })

  it('warns near the limit with what is left', () => {
    const alert = budgetAlertFor(
      '2026-10',
      row({ percent: 86, status: 'near', remaining: '140.00' }),
      never,
    )
    expect(alert?.level).toBe('near')
    expect(alert?.message).toContain('86%')
    expect(alert?.message).toContain('מזון')
  })

  it('reports how much over the budget', () => {
    const alert = budgetAlertFor(
      '2026-10',
      row({ percent: 112, status: 'over', remaining: '-120.50' }),
      never,
    )
    expect(alert).toMatchObject({ level: 'over', key: '2026-10:food:over' })
    expect(alert?.message).toContain('120.50')
    expect(alert?.message).not.toContain('-120')
  })

  it('alerts once per category, month and level', () => {
    const near = row({ percent: 90, status: 'near', remaining: '100.00' })
    expect(budgetAlertFor('2026-10', near, (key) => key === '2026-10:food:near')).toBeNull()
    expect(budgetAlertFor('2026-11', near, (key) => key === '2026-10:food:near')).not.toBeNull()
  })
})
