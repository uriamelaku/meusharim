import { ArrowLeftRight, Loader2, Search, SearchX, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
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
import { formatRelativeDay, periodRange } from '@/lib/dates'
import { tr } from '@/lib/i18n'
import { formatPeriod } from '@/lib/period'
import { useOccurrences } from '@/schedules/api'
import { OccurrenceRow } from '@/schedules/OccurrenceRow'
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

const SEARCH_LABEL = tr({
  he: 'חיפוש בתיאור או בקטגוריה',
  en: 'Search description or category',
})

const SORT_LABELS: Record<SortOrder, string> = tr({
  he: {
    date_desc: 'תאריך – מהחדש לישן',
    date_asc: 'תאריך – מהישן לחדש',
    amount_desc: 'סכום – מהגבוה לנמוך',
    amount_asc: 'סכום – מהנמוך לגבוה',
  },
  en: {
    date_desc: 'Date – newest first',
    date_asc: 'Date – oldest first',
    amount_desc: 'Amount – highest first',
    amount_asc: 'Amount – lowest first',
  },
})

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
  const [searchParams] = useSearchParams()
  // ?category=<id> opens the list already filtered, e.g. from the main screen.
  const [filters, setFilters] = useState<Filters>(() => ({
    ...NO_FILTERS,
    categoryId: searchParams.get('category') ?? '',
  }))
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
            <h2 className="font-heading text-[1.75rem] font-semibold lg:text-4xl">
              {tr({ he: 'כל התקופות', en: 'All time' })}
            </h2>
            <Button variant="ghost" onClick={() => setFilters({ ...filters, scope: 'month' })}>
              {tr({ he: 'לפי חודש', en: 'By month' })}
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
              aria-label={SEARCH_LABEL}
              placeholder={SEARCH_LABEL}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="ps-10"
            />
          </div>
          <Button variant="outline" onClick={() => setFiltersOpen(true)} className="shrink-0">
            <SlidersHorizontal aria-hidden />
            {tr({ he: 'סינון', en: 'Filter' })}
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
          title={tr({
            he: 'לא הצלחנו לטעון את ההוצאות וההכנסות',
            en: "We couldn't load your transactions",
          })}
          description={tr({ he: 'בדקו את החיבור ונסו שוב.', en: 'Check your connection and try again.' })}
          onRetry={() => void pages.refetch()}
        />
      ) : items.length === 0 ? (
        narrowed ? (
          <EmptyState
            icon={SearchX}
            title={tr({ he: 'לא נמצא כלום', en: 'Nothing found' })}
            description={tr({
              he: 'אפשר לנסות מילה אחרת, לבטל את הסינון או לבחור תקופה אחרת.',
              en: 'Try another word, clear the filters or choose another period.',
            })}
          />
        ) : (
          <EmptyState
            icon={ArrowLeftRight}
            title={
              allTime
                ? tr({ he: 'עדיין אין הוצאות והכנסות', en: 'No transactions yet' })
                : tr({
                    he: `אין הוצאות והכנסות ב${formatPeriod(period)}`,
                    en: `No transactions in ${formatPeriod(period)}`,
                  })
            }
            description={tr({
              he: 'מוסיפים הוצאה או הכנסה בכפתור הפלוס הכתום, והיא מופיעה כאן אצל שניכם.',
              en: 'Add an expense or income with the orange plus button, and it shows up here for both of you.',
            })}
          />
        )
      ) : (
        <section
          aria-label={tr({ he: 'רשימת ההוצאות וההכנסות', en: 'Transaction list' })}
          aria-busy={pages.isFetching}
        >
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total === 1
                ? tr({ he: 'נמצאה אחת', en: '1 result' })
                : tr({ he: `נמצאו ${total}`, en: `${total} results` })}
            </span>
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
                {tr({ he: 'ביטול הסינון', en: 'Clear filters' })}
              </Button>
            )}
          </div>
          {byDate ? (
            groupByDay(items).map((group) => (
              <div key={group.date} className="mb-3">
                <h3 className="sticky top-14 z-10 bg-background/90 px-2 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm lg:top-0">
                  {formatRelativeDay(group.date)}
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
              {tr({ he: 'להציג עוד', en: 'Show more' })}
            </Button>
          )}
        </section>
      )}

      {!allTime && !narrowed && <UpcomingInPeriod {...periodRange(period)} members={members} />}

      <Sheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title={tr({ he: 'סינון ומיון', en: 'Filter and sort' })}
      >
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

/** Schedule occurrences still to come in the month: planned money, not in the ledger yet. */
function UpcomingInPeriod({ from, to, members }: { from: string; to: string; members: Member[] }) {
  const occurrences = useOccurrences(from, to)
  if (!occurrences.data?.length) return null
  return (
    <section aria-labelledby="upcoming-period-title">
      <h3
        id="upcoming-period-title"
        className="px-2 py-1.5 text-sm font-medium text-muted-foreground"
      >
        {tr({ he: 'צפוי מהוראות קבע ותשלומים', en: 'Expected from recurring payments and installments' })}
      </h3>
      <ul className="rounded-2xl border border-dashed">
        {occurrences.data.map((occurrence) => (
          <li key={`${occurrence.schedule_id}-${occurrence.sequence_no}`}>
            <OccurrenceRow occurrence={occurrence} members={members} />
          </li>
        ))}
      </ul>
    </section>
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
        label={tr({ he: 'תקופה', en: 'Period' })}
        showLabel
        options={[
          { value: 'month', label: tr({ he: 'החודש שנבחר', en: 'Selected month' }) },
          { value: 'all', label: tr({ he: 'כל התקופות', en: 'All time' }) },
        ]}
        value={draft.scope}
        onChange={(scope) => set('scope', scope)}
      />
      <Segmented
        label={tr({ he: 'סוג', en: 'Type' })}
        showLabel
        options={[
          { value: '', label: tr({ he: 'הכל', en: 'All' }) },
          { value: 'expense', label: tr({ he: 'הוצאות', en: 'Expenses' }) },
          { value: 'income', label: tr({ he: 'הכנסות', en: 'Income' }) },
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
        label={tr({ he: 'סטטוס', en: 'Status' })}
        showLabel
        options={[
          { value: '', label: tr({ he: 'הכל', en: 'All' }) },
          { value: 'completed', label: tr({ he: 'שולם / התקבל', en: 'Paid / received' }) },
          { value: 'planned', label: tr({ he: 'עוד לא', en: 'Not yet' }) },
        ]}
        value={draft.status}
        onChange={(status) => set('status', status)}
      />
      <SelectField
        label={tr({ he: 'קטגוריה', en: 'Category' })}
        value={draft.categoryId}
        onChange={(event) => set('categoryId', event.target.value)}
      >
        <option value="">{tr({ he: 'כל הקטגוריות', en: 'All categories' })}</option>
        {categoryOptions.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
            {category.archived ? tr({ he: ' (נמחקה)', en: ' (deleted)' }) : ''}
          </option>
        ))}
      </SelectField>
      <SelectField
        label={tr({ he: 'מי שילם / קיבל', en: 'Paid / received by' })}
        value={draft.party}
        onChange={(event) => set('party', event.target.value)}
      >
        <option value="">{tr({ he: 'כולם', en: 'Everyone' })}</option>
        {members.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {member.display_name}
          </option>
        ))}
        <option value="joint">{tr({ he: 'משותף', en: 'Joint' })}</option>
      </SelectField>
      <SelectField
        label={tr({ he: 'מיון', en: 'Sort' })}
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
          {tr({ he: 'הצגת התוצאות', en: 'Show results' })}
        </Button>
        <Button size="lg" variant="ghost" onClick={() => setDraft(NO_FILTERS)}>
          {tr({ he: 'ביטול הסינון', en: 'Clear filters' })}
        </Button>
      </div>
    </div>
  )
}
