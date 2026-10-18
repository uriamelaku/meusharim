import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { AppShell } from '@/components/AppShell'
import { LoadingState } from '@/components/states'
import { AuthPage } from '@/pages/AuthPage'
import { BudgetPage } from '@/pages/BudgetPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { HelpPage } from '@/pages/HelpPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TransactionsPage } from '@/pages/TransactionsPage'

function App() {
  const { session, isLoading } = useAuth()

  if (isLoading) return <LoadingState className="min-h-dvh" />
  if (!session) return <AuthPage />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="budget" element={<BudgetPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
