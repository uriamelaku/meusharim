import { useId } from 'react'

type ToggleFieldProps = {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

/** An on/off setting: a native checkbox shown as a switch. */
export function ToggleField({ label, description, checked, onChange, disabled }: ToggleFieldProps) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-muted/60 p-3.5 has-disabled:cursor-not-allowed has-disabled:opacity-60"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <span id={`${id}-description`} className="text-sm text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={description ? `${id}-description` : undefined}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-input transition-colors peer-checked:bg-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 after:absolute after:top-1 after:start-1 after:size-5 after:rounded-full after:bg-card after:shadow-sm after:transition-transform peer-checked:after:-translate-x-5 ltr:peer-checked:after:translate-x-5"
      />
    </label>
  )
}
