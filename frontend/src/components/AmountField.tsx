import { useId } from 'react'
import { cn } from '@/lib/utils'

type AmountFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  autoFocus?: boolean
  tone?: 'income' | 'expense'
  disabled?: boolean
}

/** A large amount input with the shekel sign, using the phone's decimal keypad. */
export function AmountField({
  label,
  value,
  onChange,
  error,
  autoFocus,
  tone,
  disabled,
}: AmountFieldProps) {
  const id = useId()
  return (
    <div className="group flex flex-col items-center gap-1">
      <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <div
        dir="ltr"
        className={cn(
          'flex items-baseline justify-center gap-1 font-heading font-semibold',
          tone === 'income' && 'text-income',
          tone === 'expense' && 'text-expense',
        )}
      >
        <span aria-hidden className="text-2xl">
          ₪
        </span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="field-sizing-content min-w-[3ch] max-w-full bg-transparent text-center text-5xl tabular-nums outline-none placeholder:text-muted-foreground/50 disabled:opacity-60"
        />
      </div>
      <span
        aria-hidden
        className="h-0.5 w-32 rounded-full bg-border transition-colors group-focus-within:bg-primary"
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
