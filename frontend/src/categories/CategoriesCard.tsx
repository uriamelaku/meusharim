import { ArrowUpDown, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Segmented } from '@/components/Segmented'
import { ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { describeError } from '@/lib/errors'
import { tr } from '@/lib/i18n'
import {
  type Category,
  KIND_OPTIONS,
  type Kind,
  useCategories,
  useDeleteCategory,
  useReorderCategories,
} from './api'
import { CategoryIconBadge } from './CategoryBadge'
import { CategoryDialog } from './CategoryDialog'

type Editing = { category?: Category } | null

/** Returns `ids` with the item at `index` moved one place up (-1) or down (+1). */
function moveId(ids: string[], index: number, step: -1 | 1): string[] {
  const moved = [...ids]
  ;[moved[index], moved[index + step]] = [moved[index + step], moved[index]]
  return moved
}

export function CategoriesCard() {
  const categories = useCategories()
  const [kind, setKind] = useState<Kind>('expense')
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const deleteCategory = useDeleteCategory()
  /** Ids in the order being arranged, or null when not arranging. */
  const [order, setOrder] = useState<string[] | null>(null)
  const reorder = useReorderCategories()

  const active = (categories.data ?? []).filter((c) => c.kind === kind && !c.archived)
  const byId = new Map(active.map((c) => [c.id, c]))
  const visible = order
    ? order.map((id) => byId.get(id)).filter((c): c is Category => c !== undefined)
    : active

  function changeKind(next: Kind) {
    setOrder(null)
    setKind(next)
  }

  function saveOrder() {
    if (!order) return
    reorder.mutate(
      { kind, ids: visible.map((c) => c.id) },
      {
        onSuccess: () => {
          toast.success(tr({ he: 'הסדר נשמר', en: 'Order saved' }))
          setOrder(null)
        },
        onError: (error) => toast.error(describeError(error)),
      },
    )
  }

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
            : tr({
                he: `"${deleting.name}" נמחקה`,
                en: `"${deleting.name}" was deleted`,
              }),
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
          onChange={changeKind}
        />
        {order && (
          <p className="text-sm text-muted-foreground">
            {tr({
              he: 'הזיזו בעזרת החצים. זה גם הסדר של העיגולים במסך הבית.',
              en: 'Move them with the arrows. This is also the order of the circles on the home screen.',
            })}
          </p>
        )}

        {categories.isPending ? (
          <LoadingState className="py-8" />
        ) : categories.isError ? (
          <ErrorState
            className="py-8"
            title={tr({
              he: 'לא הצלחנו לטעון את הקטגוריות',
              en: "We couldn't load the categories",
            })}
            description={tr({
              he: 'בדקו את החיבור ונסו שוב.',
              en: 'Check your connection and try again.',
            })}
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
            {visible.map((category, index) => (
              <li key={category.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                <CategoryIconBadge color={category.color} icon={category.icon} />
                <span className="min-w-0 flex-1 truncate font-medium">{category.name}</span>
                {order ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={tr({
                        he: `הזזת ${category.name} למעלה`,
                        en: `Move ${category.name} up`,
                      })}
                      disabled={index === 0}
                      onClick={() =>
                        setOrder(
                          moveId(
                            visible.map((c) => c.id),
                            index,
                            -1,
                          ),
                        )
                      }
                    >
                      <ChevronUp className="size-4.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={tr({
                        he: `הזזת ${category.name} למטה`,
                        en: `Move ${category.name} down`,
                      })}
                      disabled={index === visible.length - 1}
                      onClick={() =>
                        setOrder(
                          moveId(
                            visible.map((c) => c.id),
                            index,
                            1,
                          ),
                        )
                      }
                    >
                      <ChevronDown className="size-4.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={tr({
                        he: `עריכת ${category.name}`,
                        en: `Edit ${category.name}`,
                      })}
                      onClick={() => setEditing({ category })}
                    >
                      <Pencil className="size-4.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={tr({
                        he: `מחיקת ${category.name}`,
                        en: `Delete ${category.name}`,
                      })}
                      onClick={() => setDeleting(category)}
                    >
                      <Trash2 className="size-4.5" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {order ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveOrder} disabled={reorder.isPending}>
              {tr({ he: 'שמירת הסדר', en: 'Save order' })}
            </Button>
            <Button variant="outline" onClick={() => setOrder(null)} disabled={reorder.isPending}>
              {tr({ he: 'ביטול', en: 'Cancel' })}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditing({})}>
              <Plus aria-hidden />
              {kind === 'expense'
                ? tr({ he: 'קטגוריית הוצאה חדשה', en: 'New expense category' })
                : tr({ he: 'קטגוריית הכנסה חדשה', en: 'New income category' })}
            </Button>
            {active.length > 1 && (
              <Button variant="outline" onClick={() => setOrder(active.map((c) => c.id))}>
                <ArrowUpDown aria-hidden />
                {tr({ he: 'שינוי סדר', en: 'Reorder' })}
              </Button>
            )}
          </div>
        )}
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
