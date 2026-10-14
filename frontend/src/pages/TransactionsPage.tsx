import { ArrowLeftRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/states'

export function TransactionsPage() {
  return (
    <>
      <PageHeader title="תנועות" description="כל ההכנסות וההוצאות של משק הבית." />
      <EmptyState
        icon={ArrowLeftRight}
        title="עדיין אין תנועות"
        description="כאן יופיעו ההכנסות וההוצאות שלכם, מהחדשה לישנה."
      />
    </>
  )
}
