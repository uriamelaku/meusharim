import { AlertCircle, Loader2, MailX } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { FocusLayout } from '@/components/FocusLayout'
import { RingsMark } from '@/components/RingsMark'
import { TextField } from '@/components/TextField'
import { LoadingState } from '@/components/states'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAcceptInvitation, useInvitationPreview } from './api'
import { describeHouseholdError } from './errors'

type JoinScreenProps = {
  token: string
  /** Called when the invitation is accepted, declined or unusable. */
  onDone: () => void
}

export function JoinScreen({ token, onDone }: JoinScreenProps) {
  const preview = useInvitationPreview(token)
  const accept = useAcceptInvitation()
  const [displayName, setDisplayName] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    accept.mutate({ token, display_name: displayName }, { onSuccess: onDone })
  }

  if (preview.isPending) {
    return <LoadingState className="min-h-dvh" label="בודקים את ההזמנה…" />
  }

  if (preview.isError) {
    return (
      <FocusLayout>
        <div role="alert" className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <MailX className="size-6" aria-hidden />
          </span>
          <h1 className="font-heading text-2xl font-semibold">אי אפשר להשתמש בהזמנה</h1>
          <p className="text-muted-foreground">{describeHouseholdError(preview.error)}</p>
          <Button className="mt-2 w-full" onClick={onDone}>
            המשך
          </Button>
        </div>
      </FocusLayout>
    )
  }

  const { household_name, inviter_name } = preview.data
  return (
    <FocusLayout>
      <RingsMark className="mx-auto h-12" />
      <p className="mt-5 text-center text-sm font-medium text-brass-strong">הזמנה למשק בית</p>
      <h1 className="mt-1 text-center font-heading text-3xl leading-tight font-semibold text-balance">
        {household_name}
      </h1>
      <p className="mt-3 text-center leading-relaxed text-muted-foreground">
        {inviter_name
          ? `${inviter_name} מזמין/ה אותך לנהל יחד את התקציב המשותף.`
          : 'הוזמנת לנהל יחד את התקציב המשותף.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        <TextField
          label="השם שלך"
          hint="כך יראו אותך במשק הבית."
          autoComplete="given-name"
          maxLength={40}
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        {accept.isError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{describeHouseholdError(accept.error)}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={accept.isPending}>
          {accept.isPending && <Loader2 className="animate-spin" aria-hidden />}
          {accept.isPending ? 'מצטרפים…' : 'הצטרפות למשק הבית'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={accept.isPending}>
          לא עכשיו
        </Button>
      </form>
    </FocusLayout>
  )
}
