import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PeriodPicker } from '@/components/PeriodPicker'
import { Segmented } from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { periodRange } from '@/lib/dates'
import { describeError } from '@/lib/errors'
import { tr } from '@/lib/i18n'
import { currentPeriod } from '@/lib/period'
import { exportFilename, useExportTransactions } from './api'

type Scope = 'all' | 'month'

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: 'all', label: tr({ he: 'כל התקופות', en: 'All time' }) },
  { value: 'month', label: tr({ he: 'חודש אחד', en: 'One month' }) },
]

/** Downloads every transaction, or one month's, as a CSV file. */
export function ExportCard() {
  const today = currentPeriod()
  const [scope, setScope] = useState<Scope>('all')
  const [period, setPeriod] = useState(today)
  const exportCsv = useExportTransactions()
  const month = scope === 'month' ? period : null

  function download() {
    exportCsv.mutate(
      { query: month ? periodRange(month) : {}, filename: exportFilename(month) },
      { onError: (error) => toast.error(describeError(error)) },
    )
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Download className="size-5" aria-hidden />
          {tr({ he: 'ייצוא לקובץ', en: 'Export to a file' })}
        </CardTitle>
        <CardDescription>
          {tr({
            he: 'כל ההוצאות וההכנסות בקובץ CSV, שנפתח באקסל ובגוגל שיטס.',
            en: 'All expenses and income as a CSV file, for Excel or Google Sheets.',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Segmented
          label={tr({ he: 'תקופה', en: 'Period' })}
          options={SCOPE_OPTIONS}
          value={scope}
          onChange={setScope}
        />
        {month && <PeriodPicker period={month} today={today} onChange={setPeriod} compact />}
        <Button variant="outline" onClick={download} disabled={exportCsv.isPending}>
          {exportCsv.isPending ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Download aria-hidden />
          )}
          {tr({ he: 'הורדת קובץ CSV', en: 'Download CSV file' })}
        </Button>
      </CardContent>
    </Card>
  )
}
