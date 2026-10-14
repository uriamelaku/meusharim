import { AlertCircle, Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { signOut } from '@/auth/signOut'
import { FocusLayout } from '@/components/FocusLayout'
import { TextField } from '@/components/TextField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useCreateHousehold } from './api'
import { describeHouseholdError } from './errors'

export function CreateHouseholdScreen() {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const createHousehold = useCreateHousehold()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    createHousehold.mutate({ name, display_name: displayName })
  }

  return (
    <FocusLayout
      footer={
        <>
          קיבלתם קישור הזמנה? פתחו אותו כדי להצטרף למשק בית קיים.
          <Button variant="link" className="mx-auto mt-1 block h-auto" onClick={signOut}>
            התנתקות
          </Button>
        </>
      }
    >
      <p className="text-sm font-medium text-brass-strong">ברוכים הבאים</p>
      <h1 className="mt-1 font-heading text-3xl leading-tight font-semibold">
        בואו נקים את משק הבית שלכם
      </h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        כאן תנהלו יחד הכנסות, הוצאות ותקציב. אחרי ההקמה תוכלו להזמין את בן/בת הזוג.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        <TextField
          label="שם משק הבית"
          placeholder="למשל: הבית שלנו"
          maxLength={60}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label="השם שלך"
          hint="כך יראו אותך במשק הבית."
          autoComplete="given-name"
          maxLength={40}
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        {createHousehold.isError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{describeHouseholdError(createHousehold.error)}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={createHousehold.isPending}>
          {createHousehold.isPending && <Loader2 className="animate-spin" aria-hidden />}
          {createHousehold.isPending ? 'מקימים…' : 'הקמת משק הבית'}
        </Button>
      </form>
    </FocusLayout>
  )
}
