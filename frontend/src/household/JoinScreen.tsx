import { AlertCircle, Loader2, MailX } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { FocusLayout } from '@/components/FocusLayout'
import { RingsMark } from '@/components/RingsMark'
import { TextField } from '@/components/TextField'
import { LoadingState } from '@/components/states'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { isHebrew, tr } from '@/lib/i18n'
import { type Gender, useAcceptInvitation, useInvitationPreview } from './api'
import { describeHouseholdError } from './errors'
import { GenderField } from './GenderField'

type JoinScreenProps = {
  token: string
  /** Called when the invitation is accepted, declined or unusable. */
  onDone: () => void
}

export function JoinScreen({ token, onDone }: JoinScreenProps) {
  const preview = useInvitationPreview(token)
  const accept = useAcceptInvitation()
  const [displayName, setDisplayName] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    // Gender sets the Hebrew form of address, so it is asked in Hebrew only.
    if (isHebrew && !gender) return
    accept.mutate(
      { token, display_name: displayName, gender: gender ?? undefined },
      { onSuccess: onDone },
    )
  }

  if (preview.isPending) {
    return (
      <LoadingState
        className="min-h-dvh"
        label={tr({ he: 'בודקים את ההזמנה…', en: 'Checking the invitation…' })}
      />
    )
  }

  if (preview.isError) {
    return (
      <FocusLayout>
        <div role="alert" className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <MailX className="size-6" aria-hidden />
          </span>
          <h1 className="font-heading text-2xl font-semibold">
            {tr({ he: 'אי אפשר להשתמש בהזמנה', en: "This invitation can't be used" })}
          </h1>
          <p className="text-muted-foreground">{describeHouseholdError(preview.error)}</p>
          <Button className="mt-2 w-full" onClick={onDone}>
            {tr({ he: 'המשך', en: 'Continue' })}
          </Button>
        </div>
      </FocusLayout>
    )
  }

  const { household_name, inviter_name } = preview.data
  return (
    <FocusLayout>
      <RingsMark className="mx-auto h-12" />
      <p className="mt-5 text-center text-sm font-medium text-brass-strong">
        {tr({ he: 'הזמנה לבית משותף', en: 'Invitation to a shared household' })}
      </p>
      <h1 className="mt-1 text-center font-heading text-3xl leading-tight font-semibold text-balance">
        {household_name}
      </h1>
      <p className="mt-3 text-center leading-relaxed text-muted-foreground">
        {inviter_name
          ? tr({
              he: `הזמנה מ${inviter_name} לנהל יחד את התקציב המשותף.`,
              en: `${inviter_name} invited you to manage your shared budget together.`,
            })
          : tr({
              he: 'הוזמנת לנהל יחד את התקציב המשותף.',
              en: "You've been invited to manage a shared budget together.",
            })}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        <TextField
          label={tr({ he: 'השם שלך', en: 'Your name' })}
          hint={tr({ he: 'כך יופיע השם שלך באפליקציה.', en: 'This is how your name appears in the app.' })}
          autoComplete="given-name"
          maxLength={40}
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        {isHebrew && <GenderField value={gender} onChange={setGender} showError={submitted} />}
        {accept.isError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{describeHouseholdError(accept.error)}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={accept.isPending}>
          {accept.isPending && <Loader2 className="animate-spin" aria-hidden />}
          {accept.isPending
            ? tr({ he: 'מצטרפים…', en: 'Joining…' })
            : tr({ he: 'הצטרפות לבית', en: 'Join household' })}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={accept.isPending}>
          {tr({ he: 'לא עכשיו', en: 'Not now' })}
        </Button>
      </form>
    </FocusLayout>
  )
}
