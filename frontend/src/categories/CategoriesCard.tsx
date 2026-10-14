import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Segmented } from '@/components/Segmented'
import { ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { describeError } from '@/lib/errors'
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
            ? `"${deleting.name}" הוסרה מהרשימה. התנועות הקיימות שומרות עליה.`
            : `"${deleting.name}" נמחקה`,
        )
        setDeleting(null)
      },
      onError: (error) => toast.error(describeError(error)),
    })
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">קטגוריות</CardTitle>
        <CardDescription>שניכם רואים ועורכים את אותן קטגוריות.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Segmented label="סוג הקטגוריות" options={KIND_OPTIONS} value={kind} onChange={setKind} />

        {categories.isPending ? (
          <LoadingState className="py-8" />
        ) : categories.isError ? (
          <ErrorState
            className="py-8"
            title="לא הצלחנו לטעון את הקטגוריות"
            description="בדקו את החיבור ונסו שוב."
            onRetry={() => void categories.refetch()}
          />
        ) : (
          <ul className="-mx-2 flex flex-col" aria-label={kind === 'expense' ? 'קטגוריות הוצאה' : 'קטגוריות הכנסה'}>
            {visible.map((category) => (
              <li key={category.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                <CategoryIconBadge color={category.color} icon={category.icon} />
                <span className="min-w-0 flex-1 truncate font-medium">{category.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`עריכת ${category.name}`}
                  onClick={() => setEditing({ category })}
                >
                  <Pencil className="size-4.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`מחיקת ${category.name}`}
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
          {kind === 'expense' ? 'קטגוריית הוצאה חדשה' : 'קטגוריית הכנסה חדשה'}
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
        title={`למחוק את "${deleting?.name ?? ''}"?`}
        description="תנועות, הוראות קבע ותקציבים שכבר משויכים לקטגוריה יישמרו ויוצגו עם השם שלה. היא רק לא תופיע יותר לבחירה."
        confirmLabel="מחיקה"
        onConfirm={confirmDelete}
        pending={deleteCategory.isPending}
      />
    </Card>
  )
}
