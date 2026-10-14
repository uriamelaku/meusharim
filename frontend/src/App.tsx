import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import AuthForm from './AuthForm'
import { supabase } from './supabase'

type HealthState = 'loading' | 'ok' | 'error'

type CurrentUser = { id: string; email: string | null }

const statusText: Record<HealthState, string> = {
  loading: 'בודק חיבור לשרת…',
  ok: 'השרת ומסד הנתונים פעילים',
  error: 'אין חיבור לשרת או למסד הנתונים',
}

function App() {
  const [health, setHealth] = useState<HealthState>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((response) => setHealth(response.ok ? 'ok' : 'error'))
      .catch(() => setHealth('error'))
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) {
        setUser(null)
        setAuthError(null)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    fetch('/api/me', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<CurrentUser>
      })
      .then((currentUser) => {
        setUser(currentUser)
        setAuthError(null)
      })
      .catch(() => setAuthError('השרת לא אישר את ההתחברות'))
  }, [session])

  return (
    <main style={{ padding: 24 }}>
      <h1>מאושרים</h1>
      <p role="status">{statusText[health]}</p>
      {session ? (
        <>
          <p>{user ? `מחובר/ת כ-${user.email}` : 'מאמת התחברות מול השרת…'}</p>
          <button onClick={() => supabase.auth.signOut()}>התנתקות</button>
        </>
      ) : (
        <AuthForm />
      )}
      {authError && <p role="alert">{authError}</p>}
    </main>
  )
}

export default App
