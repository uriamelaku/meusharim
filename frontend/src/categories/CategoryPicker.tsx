import { createElement } from 'react'
import { cn } from '@/lib/utils'
import type { Category, Kind } from './api'
import { categoryColor, categoryIcon } from './appearance'

type CategoryPickerProps = {
  categories: Category[]
  kind: Kind
  value: string | null
  onChange: (categoryId: string) => void
  invalid?: boolean
}

/** Category chips for forms. Shows active categories, plus the selected one if it was archived. */
export function CategoryPicker({
  categories,
  kind,
  value,
  onChange,
  invalid,
}: CategoryPickerProps) {
  const options = categories.filter((c) => c.kind === kind && (!c.archived || c.id === value))
  return (
    <fieldset aria-invalid={invalid || undefined}>
      <legend className="mb-3 text-sm font-medium">קטגוריה</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {options.map((category) => {
          const selected = category.id === value
          const { tint, ink } = categoryColor(category.color)
          return (
            <label
              key={category.id}
              className={cn(
                'flex min-h-[4.5rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-2 text-center text-xs font-medium transition-colors',
                'has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                selected ? 'border-transparent' : 'border-border hover:bg-muted',
              )}
              style={selected ? { backgroundColor: tint, color: ink, borderColor: ink } : undefined}
            >
              <input
                type="radio"
                name="category"
                value={category.id}
                checked={selected}
                onChange={() => onChange(category.id)}
                className="sr-only"
              />
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-full"
                style={{ backgroundColor: selected ? 'transparent' : tint, color: ink }}
              >
                {createElement(categoryIcon(category.icon), { className: 'size-4.5' })}
              </span>
              <span className="line-clamp-2 leading-tight">{category.name}</span>
            </label>
          )
        })}
      </div>
      {invalid && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          בחרו קטגוריה.
        </p>
      )}
    </fieldset>
  )
}
