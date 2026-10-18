import { AlertCircle, Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { signOut } from '@/auth/signOut'
import { FocusLayout } from '@/components/FocusLayout'
import { TextField } from '@/components/TextField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { type Gender, useCreateHousehold } from './api'
import { describeHouseholdError } from './errors'
import { GenderField } from './GenderField'

export function CreateHouseholdScreen() {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const createHousehold = useCreateHousehold()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!gender) return
    createHousehold.mutate({ name, display_name: displayName, gender })
  }

  return (
    <FocusLayout
      footer={
        <>
          קיבלת קישור הזמנה? אפשר לפתוח אותו ולהצטרף לבית קיים.
          <Button variant="link" className="mx-auto mt-1 block h-auto" onClick={signOut}>
            התנתקות
          </Button>
        </>
      }
    >
      <p className="text-sm font-medium text-brass-strong">ברוכים הבאים</p>
      <h1 className="mt-1 font-heading text-3xl leading-tight font-semibold">
        בואו ניצור את הבית שלכם
      </h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        כאן מנהלים יחד הכנסות, הוצאות ותקציב. אחר כך אפשר להזמין את בן או בת הזוג.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        <TextField
          label="שם הבית"
          placeholder="למשל: הבית שלנו"
          maxLength={60}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label="השם שלך"
          hint="כך יופיע השם שלך באפליקציה."
          autoComplete="given-name"
          maxLength={40}
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <GenderField value={gender} onChange={setGender} showError={submitted} />
        {createHousehold.isError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{describeHouseholdError(createHousehold.error)}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={createHousehold.isPending}>
          {createHousehold.isPending && <Loader2 className="animate-spin" aria-hidden />}
          {createHousehold.isPending ? 'יוצרים…' : 'יצירת הבית'}
        </Button>
      </form>
    </FocusLayout>
  )
}
