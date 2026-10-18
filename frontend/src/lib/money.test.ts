import { describe, expect, it } from 'vitest'
import {
  amountToInput,
  formatFlow,
  formatMoney,
  parseAmountInput,
  previewInstallments,
  subtractAmounts,
  sumAmounts,
} from './money'

describe('parseAmountInput', () => {
  it.each([
    ['100', '100.00'],
    ['0.1', '0.10'],
    ['0.01', '0.01'],
    ['1,234.5', '1234.50'],
    [' 12 ', '12.00'],
    ['007', '7.00'],
    ['12.', '12.00'],
    ['₪50', '50.00'],
    ['9999999999.99', '9999999999.99'],
  ])('accepts %j as %j', (input, expected) => {
    expect(parseAmountInput(input)).toBe(expected)
  })

  it.each(['', '0', '0.00', '-5', '1.234', 'abc', '1e3', '.5', '10000000000', '1.2.3'])(
    'rejects %j',
    (input) => {
      expect(parseAmountInput(input)).toBeNull()
    },
  )
})

describe('formatMoney', () => {
  it('formats with shekel sign and thousands separators', () => {
    expect(formatMoney('1234.5')).toMatch(/1,234\.50/)
    expect(formatMoney('1234.50')).toContain('₪')
  })

  it('drops zero agorot', () => {
    expect(formatMoney('80.00')).not.toContain('.')
  })

  it('formats negative balances', () => {
    expect(formatMoney('-350.40')).toMatch(/\u2212.*350\.40/)
    expect(formatMoney('-350.40')).not.toContain('-')
  })

  it('keeps exact agorot for large amounts without float rounding', () => {
    expect(formatMoney('9999999999.99')).toMatch(/9,999,999,999\.99/)
  })
})

describe('amountToInput', () => {
  it.each([
    ['120.50', '120.5'],
    ['80.00', '80'],
    ['0.05', '0.05'],
  ])('%s → %s', (amount, expected) => {
    expect(amountToInput(amount)).toBe(expected)
  })
})

describe('formatFlow', () => {
  it('signs income and expense', () => {
    expect(formatFlow('80.00', 'income')).toMatch(/\+.*80/)
    expect(formatFlow('350.40', 'expense')).toMatch(/\u2212.*350\.40/)
  })
})

describe('previewInstallments', () => {
  it.each([
    ['100.00', 3, '33.34', '33.33'],
    ['1000.00', 12, '83.37', '83.33'],
    ['0.05', 3, '0.03', '0.01'],
    ['1200.00', 12, '100.00', '100.00'],
    ['9999999999.99', 360, '27777780.56', '27777777.77'],
  ])('%s in %i payments', (total, count, first, rest) => {
    expect(previewInstallments(total, count)).toEqual({ first, rest })
  })

  it('rejects splits below one agora per payment', () => {
    expect(previewInstallments('0.05', 6)).toBeNull()
    expect(previewInstallments('100.00', 1)).toBeNull()
  })
})

describe('sumAmounts / subtractAmounts', () => {
  it('adds exactly, without floating point drift', () => {
    expect(sumAmounts(['0.10', '0.20'])).toBe('0.30')
    expect(sumAmounts(['1000.00', '650.50', '0.01'])).toBe('1650.51')
    expect(sumAmounts([])).toBe('0.00')
  })

  it('subtracts and keeps the sign', () => {
    expect(subtractAmounts('9000.00', '1650.50')).toBe('7349.50')
    expect(subtractAmounts('1000.00', '1000.01')).toBe('-0.01')
    expect(subtractAmounts('100.00', '250.25')).toBe('-150.25')
  })
})
