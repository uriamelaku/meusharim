import { AlertCircle, Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { signOut } from '@/auth/signOut'
import { FocusLayout } from '@/components/FocusLayout'
import { TextField } from '@/components/TextField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { isHebrew, language, tr } from '@/lib/i18n'
import { type Gender, useCreateHousehold } from './api'
import { describeHouseholdError } from './errors'
import { GenderField } from './GenderField'

export function CreateHouseholdScreen() {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const createHousehold = useCreateHousehold()
  const missingName = tr({ he: 'צריך למלא את השם.', en: 'Please enter a name.' })
  const errors = {
    name: !name.trim() ? missingName : undefined,
    displayName: !displayName.trim() ? missingName : undefined,
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    // Gender sets the Hebrew form of address, so it is asked in Hebrew only.
    if (errors.name || errors.displayName || (isHebrew && !gender)) return
    createHousehold.mutate({
      name: name.trim(),
      display_name: displayName.trim(),
      gender: gender ?? undefined,
      language,
    })
  }

  return (
    <FocusLayout
      footer={
        <>
          {tr({
            he: 'קיבלת קישור הזמנה? אפשר לפתוח אותו ולהצטרף לבית קיים.',
            en: 'Got an invitation link? Open it to join an existing household.',
          })}
          <Button variant="link" className="mx-auto mt-1 block h-auto" onClick={signOut}>
            {tr({ he: 'התנתקות', en: 'Sign out' })}
          </Button>
        </>
      }
    >
      <p className="text-sm font-medium text-brass-strong">{tr({ he: 'ברוכים הבאים', en: 'Welcome' })}</p>
      <h1 className="mt-1 font-heading text-3xl leading-tight font-semibold">
        {tr({ he: 'בואו ניצור את הבית שלכם', en: "Let's set up your household" })}
      </h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        {tr({
          he: 'כאן מנהלים יחד הכנסות, הוצאות ותקציב. אחר כך אפשר להזמין את בן או בת הזוג.',
          en: 'This is where you manage income, expenses and a budget together. You can invite your partner afterwards.',
        })}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
        <TextField
          label={tr({ he: 'שם הבית', en: 'Household name' })}
          placeholder={tr({ he: 'למשל: הבית שלנו', en: 'For example: Our home' })}
          maxLength={60}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={submitted ? errors.name : undefined}
        />
        <TextField
          label={tr({ he: 'השם שלך', en: 'Your name' })}
          hint={tr({ he: 'כך יופיע השם שלך באפליקציה.', en: 'This is how your name appears in the app.' })}
          autoComplete="given-name"
          maxLength={40}
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          error={submitted ? errors.displayName : undefined}
        />
        {isHebrew && <GenderField value={gender} onChange={setGender} showError={submitted} />}
        {createHousehold.isError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{describeHouseholdError(createHousehold.error)}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={createHousehold.isPending}>
          {createHousehold.isPending && <Loader2 className="animate-spin" aria-hidden />}
          {createHousehold.isPending
            ? tr({ he: 'יוצרים…', en: 'Creating…' })
            : tr({ he: 'יצירת הבית', en: 'Create household' })}
        </Button>
      </form>
    </FocusLayout>
  )
}
