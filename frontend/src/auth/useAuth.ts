import type { Session } from '@supabase/supabase-js'
import { createContext, use } from 'react'

export type AuthState = { session: Session | null; isLoading: boolean }

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const state = use(AuthContext)
  if (!state) throw new Error('useAuth must be used inside AuthProvider')
  return state
}
