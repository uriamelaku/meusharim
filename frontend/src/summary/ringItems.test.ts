import { describe, expect, it } from 'vitest'
import type { CategoryBudget } from '@/budgets/api'
import type { Category } from '@/categories/api'
import { ringItems } from './ringItems'

const category = (id: string, name: string, extra: Partial<Category> = {}): Category => ({
  id,
  name,
  kind: 'expense',
  color: 'green',
  icon: 'ellipsis',
  archived: false,
  ...extra,
})

const row = (c: Category, actual: string, extra: Partial<CategoryBudget> = {}): CategoryBudget => ({
  category: { id: c.id, name: c.name, color: c.color, icon: c.icon, archived: c.archived },
  budget: null,
  actual,
  planned: '0.00',
  remaining: null,
  percent: null,
  status: null,
  ...extra,
})

describe('ringItems', () => {
  const food = category('1', 'מזון')
  const rent = category('2', 'דיור')
  const kids = category('3', 'ילדים')
  const salary = category('4', 'משכורת', { kind: 'income' })
  const oldGym = category('5', 'כושר', { archived: true })

  it('lists active expense categories, biggest spending first, idle ones as zero', () => {
    const items = ringItems([food, rent, kids, salary], [row(food, '120.50'), row(rent, '4200.00')])
    expect(items.map((i) => [i.category.name, i.actual])).toEqual([
      ['דיור', '4200.00'],
      ['מזון', '120.50'],
      ['ילדים', '0.00'],
    ])
  })

  it('keeps a deleted category while it has spending this month', () => {
    const items = ringItems([food], [row(oldGym, '90.00')])
    expect(items.map((i) => i.category.name)).toEqual(['כושר', 'מזון'])
    expect(ringItems([food, oldGym], []).map((i) => i.category.name)).toEqual(['מזון'])
  })

  it('carries budget use and over-budget state', () => {
    const [item] = ringItems([food], [row(food, '1100.00', { percent: 110, status: 'over' })])
    expect(item).toMatchObject({ percent: 110, over: true })
  })
})
