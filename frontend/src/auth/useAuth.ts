import type { Session } from '@supabase/supabase-js'
import { createContext, use } from 'react'

export type AuthState = { session: Session | null; isLoading: boolean }

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const state = use(AuthContext)
  if (!state) throw new Error('useAuth must be used inside AuthProvider')
  return state
}

/** The signed-in session. Only for components rendered behind the sign-in screen. */
export function useSession(): Session {
  const { session } = useAuth()
  if (!session) throw new Error('useSession requires a signed-in user')
  return session
}
