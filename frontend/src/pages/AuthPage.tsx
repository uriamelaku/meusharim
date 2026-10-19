import type { AuthError } from '@supabase/supabase-js'
import { AlertCircle, Eye, EyeOff, Loader2, MailCheck, Users } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'
import { RingsMark, Wordmark } from '@/components/RingsMark'
import { LanguageToggle } from '@/components/LanguageToggle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { hasPendingInvitation } from '@/household/pendingInvitation'
import { tr } from '@/lib/i18n'
import { supabase } from '@/supabase'

type Mode = 'signIn' | 'signUp'

const MIN_PASSWORD_LENGTH = 8

const TAGLINE = tr({
  he: 'התקציב של שניכם, במקום אחד.',
  en: 'Your shared budget, in one place.',
})

const FAILED = tr({
  he: 'הפעולה לא הצליחה. בדקו את החיבור ונסו שוב.',
  en: 'Something went wrong. Check your connection and try again.',
})

const errorMessages: Record<string, string> = tr({
  he: {
    invalid_credentials: 'המייל או הסיסמה שגויים.',
    email_not_confirmed: 'צריך לאשר את המייל לפני ההתחברות. כדאי לבדוק את תיבת הדואר.',
    user_already_exists: 'כבר יש חשבון עם המייל הזה. אפשר פשוט להתחבר.',
    weak_password: 'הסיסמה חלשה מדי. צריך סיסמה ארוכה יותר.',
    over_email_send_rate_limit: 'נשלחו יותר מדי מיילים. אפשר לנסות שוב מאוחר יותר.',
    over_request_rate_limit: 'יותר מדי ניסיונות. אפשר לנסות שוב בעוד כמה דקות.',
  },
  en: {
    invalid_credentials: 'Incorrect email or password.',
    email_not_confirmed: 'Please confirm your email before signing in. Check your inbox.',
    user_already_exists: 'There is already an account with this email. You can just sign in.',
    weak_password: 'This password is too weak. Please choose a longer one.',
    over_email_send_rate_limit: 'Too many emails were sent. Please try again later.',
    over_request_rate_limit: 'Too many attempts. Please try again in a few minutes.',
  },
})

function describeError(error: AuthError): string {
  return (error.code && errorMessages[error.code]) || FAILED
}

export function AuthPage() {
  const invited = hasPendingInvitation()
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />
      <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
        <LanguageToggle className="absolute end-4 top-4" />
        <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
          <Wordmark />
          <p className="font-heading text-xl text-muted-foreground">{TAGLINE}</p>
        </div>
        <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
          {invited && (
            <Alert className="mb-5 border-brass/40 bg-accent text-accent-foreground">
              <Users aria-hidden />
              <AlertDescription className="text-accent-foreground">
                {tr({
                  he: 'הוזמנת להצטרף לבית משותף. כדי להמשיך, צריך להירשם או להתחבר.',
                  en: "You've been invited to join a shared household. To continue, sign up or sign in.",
                })}
              </AlertDescription>
            </Alert>
          )}
          {/* Someone opening an invitation link most likely has no account yet. */}
          <Tabs defaultValue={invited ? 'signUp' : 'signIn'}>
            <TabsList className="h-11 w-full rounded-xl">
              <TabsTrigger value="signIn" className="rounded-lg text-base">
                {tr({ he: 'התחברות', en: 'Sign in' })}
              </TabsTrigger>
              <TabsTrigger value="signUp" className="rounded-lg text-base">
                {tr({ he: 'הרשמה', en: 'Sign up' })}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="signIn" className="pt-4">
              <CredentialsForm mode="signIn" />
            </TabsContent>
            <TabsContent value="signUp" className="pt-4">
              <CredentialsForm mode="signUp" />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

function BrandPanel() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
      <span className="inline-flex items-center gap-2.5">
        <RingsMark className="h-7" firstRing="#ffffff" />
        <span className="font-heading text-2xl font-semibold">
          {tr({ he: 'מאושרים', en: 'Meusharim' })}
        </span>
      </span>
      <div className="relative z-10 max-w-md">
        <h1 className="font-heading text-5xl leading-tight font-semibold text-balance">{TAGLINE}</h1>
        <p className="mt-5 text-lg leading-relaxed text-primary-foreground/75">
          {tr({
            he: 'הכנסות, הוצאות ותקציב חודשי – משותף, שקוף ופשוט לשניכם.',
            en: 'Income, expenses and a monthly budget – shared, clear and simple for both of you.',
          })}
        </p>
      </div>
      <RingsMark
        className="pointer-events-none absolute -end-32 -top-28 h-[28rem] opacity-15"
        firstRing="#ffffff"
      />
    </aside>
  )
}

function CredentialsForm({ mode }: { mode: Mode }) {
  const isSignIn = mode === 'signIn'
  const fieldId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      if (isSignIn) {
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
      else if (!data.session) {
        setNotice(
          tr({
            he: 'שלחנו מייל אישור. אחרי שמאשרים אותו, אפשר להתחבר.',
            en: "We've sent you a confirmation email. Once you confirm it, you can sign in.",
          }),
        )
      }
    } catch {
      setError(FAILED)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${fieldId}-email`}>{tr({ he: 'מייל', en: 'Email' })}</Label>
        <Input
          id={`${fieldId}-email`}
          type="email"
          inputMode="email"
          dir="ltr"
          autoComplete="email"
          placeholder="name@example.com"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${fieldId}-password`}>{tr({ he: 'סיסמה', en: 'Password' })}</Label>
        <div className="relative">
          <Input
            id={`${fieldId}-password`}
            type={showPassword ? 'text' : 'password'}
            dir="ltr"
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            minLength={MIN_PASSWORD_LENGTH}
            required
            aria-describedby={isSignIn ? undefined : `${fieldId}-password-hint`}
            className="pe-12"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={
              showPassword
                ? tr({ he: 'הסתרת הסיסמה', en: 'Hide password' })
                : tr({ he: 'הצגת הסיסמה', en: 'Show password' })
            }
            aria-pressed={showPassword}
            className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        {!isSignIn && (
          <p id={`${fieldId}-password-hint`} className="text-sm text-muted-foreground">
            {tr({
              he: `לפחות ${MIN_PASSWORD_LENGTH} תווים.`,
              en: `At least ${MIN_PASSWORD_LENGTH} characters.`,
            })}
          </p>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert role="status">
          <MailCheck aria-hidden />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="animate-spin" aria-hidden />}
        {isSignIn
          ? submitting
            ? tr({ he: 'מתחברים…', en: 'Signing in…' })
            : tr({ he: 'התחברות', en: 'Sign in' })
          : submitting
            ? tr({ he: 'יוצרים חשבון…', en: 'Creating account…' })
            : tr({ he: 'יצירת חשבון', en: 'Create account' })}
      </Button>
    </form>
  )
}
