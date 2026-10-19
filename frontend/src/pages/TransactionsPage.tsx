import { Upload } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { useShellContext } from '@/components/shellContext'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { tr } from '@/lib/i18n'
import { ScheduleList } from '@/schedules/ScheduleList'
import { TransactionList } from '@/transactions/TransactionList'

const TABS = [
  { value: 'list', label: tr({ he: 'רשימה', en: 'List' }) },
  { value: 'recurring', label: tr({ he: 'הוראות קבע', en: 'Recurring' }) },
  { value: 'installments', label: tr({ he: 'תשלומים', en: 'Installments' }) },
] as const

type Tab = (typeof TABS)[number]['value']

export function TransactionsPage() {
  const { household } = useShellContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const tab: Tab = TABS.some((t) => t.value === requested) ? (requested as Tab) : 'list'

  function changeTab(next: string) {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous)
      if (next === 'list') params.delete('tab')
      else params.set('tab', next)
      return params
    })
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageHeader title={tr({ he: 'הוצאות והכנסות', en: 'Transactions' })} />
        {/* Reminder of a planned feature: the server side exists, file reading does not yet. */}
        <Button variant="outline" size="sm" className="mt-1 h-9 shrink-0" disabled>
          <Upload aria-hidden />
          {tr({ he: 'ייבוא מהאשראי', en: 'Import from card' })}
          <span className="rounded-full bg-accent px-1.5 text-[11px] text-accent-foreground">
            {tr({ he: 'בקרוב', en: 'Soon' })}
          </span>
        </Button>
      </div>
      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList className="mb-4 h-11 w-full rounded-xl">
          {TABS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="rounded-lg text-sm sm:text-base">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="list">
          <TransactionList members={household.members} />
        </TabsContent>
        <TabsContent value="recurring">
          <ScheduleList type="recurring" members={household.members} />
        </TabsContent>
        <TabsContent value="installments">
          <ScheduleList type="installments" members={household.members} />
        </TabsContent>
      </Tabs>
    </>
  )
}
