import { ArrowLeftRight, Loader2, Search, SearchX, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { type Kind, useCategories } from '@/categories/api'
import { PeriodPicker } from '@/components/PeriodPicker'
import { SelectField } from '@/components/SelectField'
import { Sheet } from '@/components/Sheet'
import { Segmented } from '@/components/Segmented'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Member } from '@/household/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useSelectedPeriod } from '@/hooks/useSelectedPeriod'
import { useDataPages } from '@/lib/data'
import { formatDayHeading, periodRange } from '@/lib/dates'
import { formatPeriod } from '@/lib/period'
import type { SortOrder, Transaction, TransactionStatus } from './api'
import { PendingConfirmations } from './PendingConfirmations'
import { useQuickAdd } from './quickAdd'
import { TransactionRow } from './TransactionRow'

const PAGE_SIZE = 50

type Filters = {
  /** The selected month, or all time (e.g. to search the whole history). */
  scope: 'month' | 'all'
  kind: Kind | ''
  status: TransactionStatus | ''
  categoryId: string
  party: string
  sort: SortOrder
}

const NO_FILTERS: Filters = {
  scope: 'month',
  kind: '',
  status: '',
  categoryId: '',
  party: '',
  sort: 'date_desc',
}

const SORT_LABELS: Record<SortOrder, string> = {
  date_desc: 'תאריך – מהחדש לישן',
  date_asc: 'תאריך – מהישן לחדש',
  amount_desc: 'סכום – מהגבוה לנמוך',
  amount_asc: 'סכום – מהנמוך לגבוה',
}

function activeFilterCount(filters: Filters): number {
  return (
    [filters.kind, filters.status, filters.categoryId, filters.party].filter(Boolean).length +
    (filters.sort === NO_FILTERS.sort ? 0 : 1) +
    (filters.scope === NO_FILTERS.scope ? 0 : 1)
  )
}

/** Consecutive rows with the same date, for day headings when sorted by date. */
function groupByDay(items: Transaction[]): { date: string; items: Transaction[] }[] {
  const groups: { date: string; items: Transaction[] }[] = []
  for (const item of items) {
    const last = groups.at(-1)
    if (last?.date === item.occurred_on) last.items.push(item)
    else groups.push({ date: item.occurred_on, items: [item] })
  }
  return groups
}

export function TransactionList({ members }: { members: Member[] }) {
  const { period, today, setPeriod } = useSelectedPeriod()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const query = useDebouncedValue(search.trim())
  const { edit } = useQuickAdd()

  const allTime = filters.scope === 'all'
  const range = allTime ? {} : periodRange(period)
  const pages = useDataPages<Transaction>(
    '/api/transactions',
    {
      ...range,
      q: query,
      kind: filters.kind,
      status: filters.status,
      category_id: filters.categoryId,
      party: filters.party,
      sort: filters.sort,
    },
    PAGE_SIZE,
  )
  const items = pages.data?.pages.flatMap((page) => page.items) ?? []
  const total = pages.data?.pages[0]?.total ?? 0
  const filterCount = activeFilterCount(filters)
  const byDate = filters.sort.startsWith('date')
  const narrowed = Boolean(query) || filterCount > 0

  return (
    <div className="flex flex-col gap-5">
      <PendingConfirmations members={members} />

      <div className="flex flex-col gap-3">
        {allTime ? (
          <div className="flex min-h-12 items-center justify-between gap-2">
            <h2 className="font-heading text-[1.75rem] font-semibold lg:text-4xl">כל התקופות</h2>
            <Button variant="ghost" onClick={() => setFilters({ ...filters, scope: 'month' })}>
              לפי חודש
            </Button>
          </div>
        ) : (
          <div className="-ms-3">
            <PeriodPicker period={period} today={today} onChange={setPeriod} />
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="חיפוש בתיאור או בקטגוריה"
              placeholder="חיפוש בתיאור או בקטגוריה"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="ps-10"
            />
          </div>
          <Button variant="outline" onClick={() => setFiltersOpen(true)} className="shrink-0">
            <SlidersHorizontal aria-hidden />
            סינון
            {filterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {filterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {pages.isPending ? (
        <LoadingState />
      ) : pages.isError ? (
        <ErrorState
          title="לא הצלחנו לטעון את התנועות"
          description="בדקו את החיבור ונסו שוב."
          onRetry={() => void pages.refetch()}
        />
      ) : items.length === 0 ? (
        narrowed ? (
          <EmptyState
            icon={SearchX}
            title="לא נמצאו תנועות"
            description="נסו מילת חיפוש אחרת, הסירו מסננים או בחרו תקופה אחרת."
          />
        ) : (
          <EmptyState
            icon={ArrowLeftRight}
            title={allTime ? 'עדיין אין תנועות' : `אין תנועות ב${formatPeriod(period)}`}
            description="הוסיפו הכנסה או הוצאה עם כפתור הפלוס, והיא תופיע כאן אצל שניכם."
          />
        )
      ) : (
        <section aria-label="רשימת התנועות" aria-busy={pages.isFetching}>
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>{total === 1 ? 'תנועה אחת' : `${total} תנועות`}</span>
            {narrowed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setFilters(NO_FILTERS)
                }}
              >
                <X aria-hidden />
                ניקוי סינון
              </Button>
            )}
          </div>
          {byDate ? (
            groupByDay(items).map((group) => (
              <div key={group.date} className="mb-3">
                <h3 className="sticky top-14 z-10 bg-background/90 px-2 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm lg:top-0">
                  {formatDayHeading(group.date)}
                </h3>
                <ul>
                  {group.items.map((transaction) => (
                    <li key={transaction.id}>
                      <TransactionRow transaction={transaction} members={members} onSelect={edit} />
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <ul>
              {items.map((transaction) => (
                <li key={transaction.id}>
                  <TransactionRow
                    transaction={transaction}
                    members={members}
                    onSelect={edit}
                    showDate
                  />
                </li>
              ))}
            </ul>
          )}
          {pages.hasNextPage && (
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={() => void pages.fetchNextPage()}
              disabled={pages.isFetchingNextPage}
            >
              {pages.isFetchingNextPage && <Loader2 className="animate-spin" aria-hidden />}
              טעינת תנועות נוספות
            </Button>
          )}
        </section>
      )}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen} title="סינון ומיון">
        <FilterForm
          filters={filters}
          members={members}
          onApply={(next) => {
            setFilters(next)
            setFiltersOpen(false)
          }}
        />
      </Sheet>
    </div>
  )
}

type FilterFormProps = { filters: Filters; members: Member[]; onApply: (filters: Filters) => void }

function FilterForm({ filters, members, onApply }: FilterFormProps) {
  const categories = useCategories()
  const [draft, setDraft] = useState(filters)
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))
  const categoryOptions = (categories.data ?? []).filter(
    (c) => !draft.kind || c.kind === draft.kind,
  )

  return (
    <div className="flex flex-col gap-5">
      <Segmented
        label="תקופה"
        showLabel
        options={[
          { value: 'month', label: 'החודש שנבחר' },
          { value: 'all', label: 'כל התקופות' },
        ]}
        value={draft.scope}
        onChange={(scope) => set('scope', scope)}
      />
      <Segmented
        label="סוג"
        showLabel
        options={[
          { value: '', label: 'הכל' },
          { value: 'expense', label: 'הוצאות' },
          { value: 'income', label: 'הכנסות' },
        ]}
        value={draft.kind}
        onChange={(kind) => {
          const category = categories.data?.find((c) => c.id === draft.categoryId)
          setDraft((current) => ({
            ...current,
            kind,
            categoryId: category && kind && category.kind !== kind ? '' : current.categoryId,
          }))
        }}
      />
      <Segmented
        label="סטטוס"
        showLabel
        options={[
          { value: '', label: 'הכל' },
          { value: 'completed', label: 'בוצעו' },
          { value: 'planned', label: 'מתוכננות' },
        ]}
        value={draft.status}
        onChange={(status) => set('status', status)}
      />
      <SelectField
        label="קטגוריה"
        value={draft.categoryId}
        onChange={(event) => set('categoryId', event.target.value)}
      >
        <option value="">כל הקטגוריות</option>
        {categoryOptions.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
            {category.archived ? ' (נמחקה)' : ''}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="מי שילם / קיבל"
        value={draft.party}
        onChange={(event) => set('party', event.target.value)}
      >
        <option value="">כולם</option>
        {members.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {member.display_name}
          </option>
        ))}
        <option value="joint">משותף</option>
      </SelectField>
      <SelectField
        label="מיון"
        value={draft.sort}
        onChange={(event) => set('sort', event.target.value as SortOrder)}
      >
        {Object.entries(SORT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      <div className="flex gap-2">
        <Button size="lg" className="flex-1" onClick={() => onApply(draft)}>
          הצגת התוצאות
        </Button>
        <Button size="lg" variant="ghost" onClick={() => setDraft(NO_FILTERS)}>
          איפוס
        </Button>
      </div>
    </div>
  )
}
