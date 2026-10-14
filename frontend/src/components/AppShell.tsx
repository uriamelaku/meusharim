import { ArrowLeftRight, LayoutDashboard, LogOut, Settings, Wallet } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { signOut } from '@/auth/signOut'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { Wordmark } from '@/components/RingsMark'
import { ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'סקירה', icon: LayoutDashboard },
  { to: '/transactions', label: 'תנועות', icon: ArrowLeftRight },
  { to: '/budget', label: 'תקציב', icon: Wallet },
  { to: '/settings', label: 'הגדרות', icon: Settings },
]

export function AppShell() {
  const currentUser = useCurrentUser()

  if (currentUser.status === 'loading') {
    return <LoadingState className="min-h-dvh" />
  }
  if (currentUser.status === 'error') {
    return (
      <ErrorState
        className="min-h-dvh justify-center"
        title="לא הצלחנו לאמת את החשבון"
        description="השרת לא אישר את ההתחברות. בדקו את החיבור ונסו שוב, או התחברו מחדש."
        onRetry={currentUser.retry}
      >
        <Button variant="outline" onClick={signOut}>
          התחברות מחדש
        </Button>
      </ErrorState>
    )
  }

  return (
    <div className="min-h-dvh">
      <DesktopSidebar email={currentUser.user.email} />

      <header className="sticky top-0 z-20 flex h-14 items-center border-b bg-background/85 px-4 backdrop-blur-md lg:hidden">
        <Wordmark />
      </header>

      <main className="lg:ps-64">
        <div className="mx-auto max-w-3xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-10 lg:pt-12 lg:pb-12">
          <Outlet context={currentUser.user} />
        </div>
      </main>

      <MobileTabBar />
    </div>
  )
}

function DesktopSidebar({ email }: { email: string | null }) {
  return (
    <aside className="fixed inset-y-0 start-0 z-20 hidden w-64 flex-col border-e bg-card px-4 py-6 lg:flex">
      <Wordmark className="px-3" />
      <nav aria-label="ניווט ראשי" className="mt-10 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex h-11 items-center gap-3 rounded-xl px-3 font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t pt-4">
        <p className="truncate px-3 text-sm text-muted-foreground" dir="ltr" title={email ?? ''}>
          {email}
        </p>
        <Button variant="ghost" className="mt-2 w-full justify-start" onClick={signOut}>
          <LogOut aria-hidden />
          התנתקות
        </Button>
      </div>
    </aside>
  )
}

function MobileTabBar() {
  return (
    <nav
      aria-label="ניווט ראשי"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brass" aria-hidden />
                  )}
                  <Icon className="size-6" aria-hidden />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
