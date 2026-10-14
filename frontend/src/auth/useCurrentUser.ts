import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { useAuth } from './useAuth'

export type CurrentUser = { id: string; email: string | null }

type CurrentUserState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; user: CurrentUser }

/** Loads the signed-in user as verified by the backend (not just the local Supabase session). */
export function useCurrentUser() {
  const { session } = useAuth()
  const accessToken = session?.access_token
  const [state, setState] = useState<CurrentUserState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    apiGet<CurrentUser>('/api/me', accessToken)
      .then((user) => !cancelled && setState({ status: 'ready', user }))
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [accessToken, attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((count) => count + 1)
  }, [])

  return { ...state, retry }
}
