import { Wallet } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/states'

export function BudgetPage() {
  return (
    <>
      <PageHeader title="תקציב" description="כמה מתכננים להוציא בכל קטגוריה בחודש." />
      <EmptyState
        icon={Wallet}
        title="עדיין לא הוגדר תקציב"
        description="כאן תגדירו תקציב חודשי לכל קטגוריה ותעקבו אחרי מה שנשאר."
      />
    </>
  )
}
