import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Segmented } from '@/components/Segmented'
import { ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { describeError } from '@/lib/errors'
import { tr } from '@/lib/i18n'
import { type Category, KIND_OPTIONS, type Kind, useCategories, useDeleteCategory } from './api'
import { CategoryIconBadge } from './CategoryBadge'
import { CategoryDialog } from './CategoryDialog'

type Editing = { category?: Category } | null

export function CategoriesCard() {
  const categories = useCategories()
  const [kind, setKind] = useState<Kind>('expense')
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const deleteCategory = useDeleteCategory()

  const visible = (categories.data ?? []).filter((c) => c.kind === kind && !c.archived)

  function confirmDelete() {
    if (!deleting) return
    deleteCategory.mutate(deleting.id, {
      onSuccess: ({ result }) => {
        toast.success(
          result === 'archived'
            ? tr({
                he: `"${deleting.name}" הוסרה מהרשימה. מה שכבר נרשם בה נשאר כמו שהוא.`,
                en: `"${deleting.name}" was removed from the list. What's already recorded in it stays as it is.`,
              })
            : tr({ he: `"${deleting.name}" נמחקה`, en: `"${deleting.name}" was deleted` }),
        )
        setDeleting(null)
      },
      onError: (error) => toast.error(describeError(error)),
    })
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">{tr({ he: 'קטגוריות', en: 'Categories' })}</CardTitle>
        <CardDescription>
          {tr({
            he: 'שניכם רואים ועורכים את אותן קטגוריות.',
            en: 'You both see and edit the same categories.',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Segmented
          label={tr({ he: 'סוג הקטגוריות', en: 'Category type' })}
          options={KIND_OPTIONS}
          value={kind}
          onChange={setKind}
        />

        {categories.isPending ? (
          <LoadingState className="py-8" />
        ) : categories.isError ? (
          <ErrorState
            className="py-8"
            title={tr({ he: 'לא הצלחנו לטעון את הקטגוריות', en: "We couldn't load the categories" })}
            description={tr({ he: 'בדקו את החיבור ונסו שוב.', en: 'Check your connection and try again.' })}
            onRetry={() => void categories.refetch()}
          />
        ) : (
          <ul
            className="-mx-2 flex flex-col"
            aria-label={
              kind === 'expense'
                ? tr({ he: 'קטגוריות הוצאה', en: 'Expense categories' })
                : tr({ he: 'קטגוריות הכנסה', en: 'Income categories' })
            }
          >
            {visible.map((category) => (
              <li key={category.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                <CategoryIconBadge color={category.color} icon={category.icon} />
                <span className="min-w-0 flex-1 truncate font-medium">{category.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={tr({ he: `עריכת ${category.name}`, en: `Edit ${category.name}` })}
                  onClick={() => setEditing({ category })}
                >
                  <Pencil className="size-4.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={tr({ he: `מחיקת ${category.name}`, en: `Delete ${category.name}` })}
                  onClick={() => setDeleting(category)}
                >
                  <Trash2 className="size-4.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Button variant="outline" className="self-start" onClick={() => setEditing({})}>
          <Plus aria-hidden />
          {kind === 'expense'
            ? tr({ he: 'קטגוריית הוצאה חדשה', en: 'New expense category' })
            : tr({ he: 'קטגוריית הכנסה חדשה', en: 'New income category' })}
        </Button>
      </CardContent>

      <CategoryDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        category={editing?.category}
        kind={kind}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={tr({
          he: `למחוק את "${deleting?.name ?? ''}"?`,
          en: `Delete "${deleting?.name ?? ''}"?`,
        })}
        description={tr({
          he: 'הוצאות, הכנסות, הוראות קבע ותקציבים שכבר משויכים לקטגוריה יישמרו עם השם שלה. היא רק לא תופיע יותר לבחירה.',
          en: "Expenses, income, recurring payments and budgets already in this category keep its name. It just won't be offered as a choice anymore.",
        })}
        confirmLabel={tr({ he: 'מחיקה', en: 'Delete' })}
        onConfirm={confirmDelete}
        pending={deleteCategory.isPending}
      />
    </Card>
  )
}
