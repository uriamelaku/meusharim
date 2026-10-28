import { type ComponentProps, useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { tr } from '@/lib/i18n'

type TextFieldProps = ComponentProps<typeof Input> & {
  label: string
  hint?: string
  /** Shown instead of the hint, and marks the input invalid. */
  error?: string
  /** For optional fields: a "Clear" button while there is a value. */
  onClear?: () => void
}

export function TextField({ label, hint, error, onClear, ...inputProps }: TextFieldProps) {
  const id = useId()
  const message = error ?? hint
  const canClear = onClear && inputProps.value !== '' && !inputProps.disabled
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {canClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {tr({ he: 'ניקוי', en: 'Clear' })}
          </button>
        )}
      </div>
      <Input
        id={id}
        {...inputProps}
        aria-describedby={message ? `${id}-hint` : undefined}
        aria-invalid={error ? true : inputProps['aria-invalid']}
      />
      {message && (
        <p
          id={`${id}-hint`}
          role={error ? 'alert' : undefined}
          className={error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
        >
          {message}
        </p>
      )}
    </div>
  )
}
