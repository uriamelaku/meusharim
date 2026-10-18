import type { Member } from '@/household/api'

const STORAGE_KEY = 'meusharim-last-party'
const JOINT = 'joint'

/**
 * Who paid last time on this device, if that choice is still valid: a current member
 * or the joint account (null). Falls back to the signed-in user.
 */
export function lastParty(members: Member[], userId: string): string | null {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    return userId
  }
  if (stored === JOINT) return null
  return members.some((member) => member.user_id === stored) ? stored : userId
}

export function rememberParty(party: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, party ?? JOINT)
  } catch {
    // Not remembered on this device; the next form starts from the default.
  }
}
