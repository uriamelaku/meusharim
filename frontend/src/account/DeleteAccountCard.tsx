import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { signOut } from '@/auth/signOut'
import { useSession } from '@/auth/useAuth'
import { TextField } from '@/components/TextField'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiRequest } from '@/lib/api'
import { describeError } from '@/lib/errors'

type Step = 'closed' | 'warning' | 'credentials'

function useDeleteAccount() {
  const session = useSession()
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiRequest<void>('/api/account/delete', session.access_token, { method: 'POST', body }),
  })
}

/**
 * Account deletion behind two confirmations: a warning that says what will happen,
 * then the email and password typed again (checked by the server) plus an explicit
 * acknowledgement.
 */
export function DeleteAccountCard({ partner }: { partner: string | null }) {
  const hasPartner = partner !== null
  const [step, setStep] = useState<Step>('closed')
  const remove = useDeleteAccount()
  const close = (open: boolean) => {
    if (!open && !remove.isPending) {
      setStep('closed')
      remove.reset()
    }
  }

  return (
    <Card className="rounded-2xl border-destructive/30">
      <CardHeader>
        <CardTitle className="text-lg text-destructive">מחיקת חשבון</CardTitle>
        <CardDescription>
          {hasPartner
            ? `החשבון שלך יימחק. הבית וכל ההוצאות וההכנסות יישארו אצל ${partner}.`
            : 'החשבון שלך וכל הנתונים של הבית יימחקו לצמיתות.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="text-destructive" onClick={() => setStep('warning')}>
          <Trash2 aria-hidden />
          מחיקת החשבון
        </Button>
      </CardContent>

      <AlertDialog open={step !== 'closed'} onOpenChange={close}>
        <AlertDialogContent className="rounded-2xl p-5">
          {step === 'warning' ? (
            <WarningStep partner={partner} onContinue={() => setStep('credentials')} />
          ) : (
            <CredentialsStep
              pending={remove.isPending}
              error={remove.isError ? describeError(remove.error) : null}
              onSubmit={(body) =>
                remove.mutate(body, {
                  onSuccess: () => {
                    toast.success('החשבון נמחק')
                    signOut()
                  },
                })
              }
            />
          )}
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function WarningStep({ partner, onContinue }: { partner: string | null; onContinue: () => void }) {
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 font-heading text-lg">
          <AlertTriangle className="size-5 text-destructive" aria-hidden />
          למחוק את החשבון?
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="flex flex-col gap-2 text-start leading-relaxed">
            <p>זו פעולה שאי אפשר לבטל.</p>
            <ul className="list-disc ps-5">
              <li>אי אפשר יהיה להתחבר יותר עם המייל והסיסמה האלה.</li>
              {partner ? (
                <>
                  <li>ל{partner} יישארו כל ההוצאות, ההכנסות והתקציבים.</li>
                  <li>מה שרשום על שמך יעבור ל"משותף".</li>
                </>
              ) : (
                <li>כל הקטגוריות, ההוצאות, ההכנסות, הוראות הקבע והתקציבים יימחקו.</li>
              )}
            </ul>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="-mx-5 -mb-5 rounded-b-2xl">
        <AlertDialogCancel>ביטול</AlertDialogCancel>
        <Button variant="destructive" onClick={onContinue}>
          כן, להמשיך
        </Button>
      </AlertDialogFooter>
    </>
  )
}

function CredentialsStep({
  pending,
  error,
  onSubmit,
}: {
  pending: boolean
  error: string | null
  onSubmit: (body: { email: string; password: string }) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [understood, setUnderstood] = useState(false)
  const ready = email.trim() !== '' && password !== '' && understood

  function submit(event: FormEvent) {
    event.preventDefault()
    if (ready) onSubmit({ email: email.trim(), password })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <AlertDialogHeader>
        <AlertDialogTitle className="font-heading text-lg">אישור אחרון</AlertDialogTitle>
        <AlertDialogDescription>
          כדי לוודא שזה באמת החשבון שלך, צריך להקליד שוב את המייל והסיסמה.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <TextField
        label="מייל"
        type="email"
        dir="ltr"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="סיסמה"
        type="password"
        dir="ltr"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-5 accent-destructive"
          checked={understood}
          onChange={(event) => setUnderstood(event.target.checked)}
        />
        הבנתי שהמחיקה סופית ואי אפשר לשחזר את החשבון.
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <AlertDialogFooter className="-mx-5 -mb-5 rounded-b-2xl">
        <AlertDialogCancel disabled={pending}>ביטול</AlertDialogCancel>
        <Button type="submit" variant="destructive" disabled={!ready || pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          מחיקה לצמיתות
        </Button>
      </AlertDialogFooter>
    </form>
  )
}
