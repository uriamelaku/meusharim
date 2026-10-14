import { ChevronDown } from 'lucide-react'
import { type ComponentProps, useId } from 'react'
import { Label } from '@/components/ui/label'

type SelectFieldProps = ComponentProps<'select'> & { label: string }

/** A native select: the best picker on phones, styled like our inputs. */
export function SelectField({ label, children, ...selectProps }: SelectFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <select
          id={id}
          className="h-11 w-full appearance-none rounded-xl border border-input bg-card ps-3.5 pe-10 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          {...selectProps}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>
  )
}
