import { afterEach, describe, expect, it, vi } from 'vitest'

// The language is read once, when the modules load, so each test loads them afresh.
async function loadIn(language: string | null) {
  vi.stubGlobal('localStorage', { getItem: () => language })
  vi.resetModules()
  return {
    i18n: await import('@/lib/i18n'),
    dates: await import('@/lib/dates'),
    money: await import('@/lib/money'),
    schedules: await import('@/schedules/labels'),
    usage: await import('@/budgets/usage'),
  }
}

describe('interface language', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('defaults to Hebrew, right to left', async () => {
    const { i18n } = await loadIn(null)
    expect(i18n.language).toBe('he')
    expect(i18n.direction).toBe('rtl')
    expect(i18n.tr({ he: 'שלום', en: 'Hello' })).toBe('שלום')
  })

  it('falls back to Hebrew when storage is blocked', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
    })
    vi.resetModules()
    const i18n = await import('@/lib/i18n')
    expect(i18n.language).toBe('he')
  })

  it('switches texts, direction and formats to English', async () => {
    const { i18n, dates, money, usage } = await loadIn('en')
    expect(i18n.direction).toBe('ltr')
    expect(i18n.tr({ he: 'שלום', en: 'Hello' })).toBe('Hello')
    expect(dates.formatRelativeDay('2026-10-19', '2026-10-19')).toBe('Today')
    expect(dates.formatRelativeDay('2026-10-18', '2026-10-19')).toBe('Yesterday')
    expect(dates.formatRelativeDay('2025-10-16', '2026-10-19')).toBe('Thu 16/10/2025')
    expect(money.formatMoney('80.00')).toBe('₪80')
    expect(money.formatFlow('80.00', 'expense')).toBe('−₪80')
    expect(usage.remainingText('-50.00')).toBe('₪50 over')
  })

  it('writes English ordinals for monthly payments', async () => {
    const { schedules } = await loadIn('en')
    expect(schedules.describeFrequency('monthly', '2026-10-01')).toBe('Every month on the 1st')
    expect(schedules.describeFrequency('monthly', '2026-10-22')).toBe('Every month on the 22nd')
    expect(schedules.describeFrequency('monthly', '2026-10-13')).toBe('Every month on the 13th')
    expect(schedules.describeFrequency('weekly', '2026-10-19')).toBe('Every week on Monday')
  })
})
