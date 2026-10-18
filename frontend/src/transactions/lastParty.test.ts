import { beforeEach, describe, expect, it } from 'vitest'
import type { Member } from '@/household/api'
import { lastParty, rememberParty } from './lastParty'

const members: Member[] = [
  { user_id: 'me', display_name: 'אוריה', gender: null, joined_at: '' },
  { user_id: 'partner', display_name: 'נועה', gender: null, joined_at: '' },
]

const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  } as Storage
})

describe('lastParty', () => {
  it('defaults to the signed-in user', () => {
    expect(lastParty(members, 'me')).toBe('me')
  })

  it('remembers a partner or the joint account', () => {
    rememberParty('partner')
    expect(lastParty(members, 'me')).toBe('partner')
    rememberParty(null)
    expect(lastParty(members, 'me')).toBeNull()
  })

  it('ignores a remembered member who left the household', () => {
    rememberParty('someone-who-left')
    expect(lastParty(members, 'me')).toBe('me')
  })
})
