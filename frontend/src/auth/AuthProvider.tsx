import { type ReactNode, useEffect, useState } from 'react'
import { supabase } from '@/supabase'
import { AuthContext, type AuthState } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, isLoading: true })

  useEffect(() => {
    // onAuthStateChange also fires INITIAL_SESSION, so it covers the first load.
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setState({ session, isLoading: false }),
    )
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext value={state}>{children}</AuthContext>
}
