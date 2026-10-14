import type { AuthError } from '@supabase/supabase-js'
import { type FormEvent, useState } from 'react'
import { supabase } from './supabase'

type Mode = 'signIn' | 'signUp'

const MIN_PASSWORD_LENGTH = 8

const errorMessages: Record<string, string> = {
  invalid_credentials: 'מייל או סיסמה שגויים',
  email_not_confirmed: 'צריך לאשר את המייל לפני ההתחברות. בדקו את תיבת הדואר',
  user_already_exists: 'כבר קיים משתמש עם המייל הזה',
  weak_password: 'הסיסמה חלשה מדי',
  over_email_send_rate_limit: 'נשלחו יותר מדי מיילים. נסו שוב מאוחר יותר',
  over_request_rate_limit: 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות',
}

function describeError(error: AuthError): string {
  return (error.code && errorMessages[error.code]) || 'הפעולה נכשלה. נסו שוב'
}

function AuthForm() {
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(describeError(error))
        return
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) setError(describeError(error))
      // No session means Supabase requires email confirmation first.
      else if (!data.session) setNotice('נשלח אליכם מייל אישור. אשרו אותו ואז התחברו')
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode() {
    setMode(mode === 'signIn' ? 'signUp' : 'signIn')
    setError(null)
    setNotice(null)
  }

  const isSignIn = mode === 'signIn'

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
      <h2>{isSignIn ? 'התחברות' : 'הרשמה'}</h2>
      <label>
        מייל
        <input
          type="email"
          dir="ltr"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label>
        סיסמה
        <input
          type="password"
          dir="ltr"
          autoComplete={isSignIn ? 'current-password' : 'new-password'}
          minLength={MIN_PASSWORD_LENGTH}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button type="submit" disabled={submitting}>
        {isSignIn ? 'התחברות' : 'הרשמה'}
      </button>
      <button type="button" onClick={switchMode}>
        {isSignIn ? 'אין לך חשבון? להרשמה' : 'יש לך חשבון? להתחברות'}
      </button>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </form>
  )
}

export default AuthForm
