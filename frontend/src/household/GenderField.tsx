import { Segmented } from '@/components/Segmented'
import { GENDER_OPTIONS } from '@/lib/gender'
import type { Gender } from './api'

type GenderFieldProps = {
  value: Gender | null
  onChange: (gender: Gender) => void
  /** Show "choose one" when the form was submitted without a choice. */
  showError?: boolean
}

/** Hebrew only: English has no gendered forms of address. */
export function GenderField({ value, onChange, showError = false }: GenderFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Segmented
        label="איך לפנות אליך?"
        showLabel
        options={GENDER_OPTIONS}
        value={value}
        onChange={onChange}
      />
      {showError && value === null ? (
        <p role="alert" className="text-sm text-destructive">
          צריך לבחור אחת מהאפשרויות.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">אפשר לשנות אחר כך בהגדרות.</p>
      )}
    </div>
  )
}
