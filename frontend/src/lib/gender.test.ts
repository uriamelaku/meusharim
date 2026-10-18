import { describe, expect, it } from 'vitest'
import { byGender } from './gender'

describe('byGender', () => {
  const forms = { female: 'את', male: 'אתה', neutral: 'את/ה' }

  it('uses the form for the known gender', () => {
    expect(byGender('female', forms)).toBe('את')
    expect(byGender('male', forms)).toBe('אתה')
  })

  it('falls back to the neutral form', () => {
    expect(byGender(null, forms)).toBe('את/ה')
    expect(byGender(undefined, { female: 'רוצה', male: 'רוצה' })).toBe('רוצה/רוצה')
  })
})
