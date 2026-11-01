import { describe, expect, it } from 'vitest'
import { exportFilename } from './api'

describe('exportFilename', () => {
  it('names the month, or all time', () => {
    expect(exportFilename({ year: 2026, month: 3 })).toBe('meusharim-2026-03.csv')
    expect(exportFilename(null)).toBe('meusharim-all.csv')
  })
})
