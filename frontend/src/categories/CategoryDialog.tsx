import { Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Sheet } from '@/components/Sheet'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { describeError } from '@/lib/errors'
import { tr } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { type Category, type Kind, useCreateCategory, useUpdateCategory } from './api'
import { CATEGORY_COLORS, CATEGORY_ICONS, categoryColor, ICON_LABELS } from './appearance'
import { CategoryIconBadge } from './CategoryBadge'

type CategoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Editing an existing category, or creating a new one of `kind`. */
  category?: Category
  kind: Kind
}

const NAME_MAX_LENGTH = 30

export function CategoryDialog({ open, onOpenChange, category, kind }: CategoryDialogProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        category
          ? tr({ he: 'עריכת קטגוריה', en: 'Edit category' })
          : kind === 'expense'
            ? tr({ he: 'קטגוריית הוצאה חדשה', en: 'New expense category' })
            : tr({ he: 'קטגוריית הכנסה חדשה', en: 'New income category' })
      }
    >
      {/* Remount per open so the form starts from the category's current values. */}
      {open && <CategoryForm category={category} kind={kind} onDone={() => onOpenChange(false)} />}
    </Sheet>
  )
}

function CategoryForm({
  category,
  kind,
  onDone,
}: {
  category?: Category
  kind: Kind
  onDone: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? 'plum')
  const [icon, setIcon] = useState(category?.icon ?? 'ellipsis')
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const mutation = category ? update : create
  const trimmed = name.trim()

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!trimmed) return
    const onSuccess = () => {
      toast.success(
        category
          ? tr({ he: 'הקטגוריה עודכנה', en: 'Category updated' })
          : tr({ he: 'הקטגוריה נוספה', en: 'Category added' }),
      )
      onDone()
    }
    if (category) update.mutate({ id: category.id, name: trimmed, color, icon }, { onSuccess })
    else create.mutate({ kind, name: trimmed, color, icon }, { onSuccess })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
        <CategoryIconBadge color={color} icon={icon} className="size-12" />
        <span className="truncate font-medium">
          {trimmed || tr({ he: 'שם הקטגוריה', en: 'Category name' })}
        </span>
      </div>

      <TextField
        label={tr({ he: 'שם', en: 'Name' })}
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={NAME_MAX_LENGTH}
        required
        autoFocus={!category}
      />

      <fieldset>
        <legend className="mb-3 text-sm font-medium">{tr({ he: 'צבע', en: 'Color' })}</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORY_COLORS).map(([key, swatch]) => (
            <label key={key} className="relative cursor-pointer" title={swatch.label}>
              <input
                type="radio"
                name="category-color"
                value={key}
                checked={color === key}
                onChange={() => setColor(key)}
                className="peer sr-only"
              />
              <span className="sr-only">{swatch.label}</span>
              <span
                aria-hidden
                className="flex size-11 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-shadow peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
                style={{ backgroundColor: swatch.solid }}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">{tr({ he: 'אייקון', en: 'Icon' })}</legend>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
            <label key={key} className="cursor-pointer">
              <input
                type="radio"
                name="category-icon"
                value={key}
                checked={icon === key}
                onChange={() => setIcon(key)}
                className="peer sr-only"
                aria-label={ICON_LABELS[key]}
              />
              <span
                aria-hidden
                className={cn(
                  'flex aspect-square items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted',
                  'peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50',
                )}
                style={
                  icon === key
                    ? {
                        backgroundColor: categoryColor(color).tint,
                        color: categoryColor(color).ink,
                      }
                    : undefined
                }
              >
                <Icon className="size-5" />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {describeError(mutation.error)}
        </p>
      )}

      <Button type="submit" size="lg" disabled={!trimmed || mutation.isPending}>
        {mutation.isPending && <Loader2 className="animate-spin" aria-hidden />}
        {category
          ? tr({ he: 'שמירת השינויים', en: 'Save changes' })
          : tr({ he: 'הוספת הקטגוריה', en: 'Add category' })}
      </Button>
    </form>
  )
}
