import { useCallback, useState } from 'react'

/*
 * Invitation links look like /join#<token>. The token sits in the URL fragment, which
 * browsers never send to a server, so it cannot end up in request logs. On load we move
 * it to sessionStorage (so it survives signing in) and remove it from the address bar.
 */

const STORAGE_KEY = 'meusharim.pendingInvitation'
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function invitationLink(token: string): string {
  return `${window.location.origin}/join#${token}`
}

export function capturePendingInvitation(): void {
  if (window.location.pathname !== '/join') return
  const token = window.location.hash.slice(1)
  if (TOKEN_PATTERN.test(token)) {
    try {
      sessionStorage.setItem(STORAGE_KEY, token)
    } catch {
      // Storage blocked (e.g. private mode): the invitation cannot survive sign-in.
      console.warn('Could not store the invitation; open the link again after signing in.')
    }
  }
  window.history.replaceState(null, '', '/')
}

function readPendingInvitation(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function hasPendingInvitation(): boolean {
  return readPendingInvitation() !== null
}

export function usePendingInvitation() {
  const [token, setToken] = useState(readPendingInvitation)
  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing stored if storage is unavailable.
    }
    setToken(null)
  }, [])
  return { token, clear }
}
