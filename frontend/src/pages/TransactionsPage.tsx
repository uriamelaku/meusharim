import { PageHeader } from '@/components/PageHeader'
import { useShellContext } from '@/components/shellContext'
import { TransactionList } from '@/transactions/TransactionList'

export function TransactionsPage() {
  const { household } = useShellContext()
  return (
    <>
      <PageHeader title="תנועות" />
      <TransactionList members={household.members} />
    </>
  )
}
