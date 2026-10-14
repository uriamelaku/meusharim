import { useId } from 'react'
import { cn } from '@/lib/utils'

type Option<T extends string> = { value: T; label: string }

type SegmentedProps<T extends string> = {
  label: string
  /** Show the label above the control; otherwise it is for screen readers only. */
  showLabel?: boolean
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/** A row of mutually exclusive choices, built on native radios for keyboard support. */
export function Segmented<T extends string>({
  label,
  showLabel = false,
  options,
  value,
  onChange,
  className,
}: SegmentedProps<T>) {
  const name = useId()
  return (
    <fieldset className={className}>
      <legend className={showLabel ? 'mb-2 text-sm font-medium' : 'sr-only'}>{label}</legend>
      <div className="flex rounded-xl bg-muted p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'relative flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors',
              'has-checked:bg-card has-checked:text-foreground has-checked:shadow-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="truncate">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
