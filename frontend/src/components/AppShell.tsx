import {
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Wallet,
} from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { signOut } from '@/auth/signOut'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { Wordmark } from '@/components/RingsMark'
import { myGender, partnerName, type ShellContext } from '@/components/shellContext'
import { ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useHousehold } from '@/household/api'
import { CreateHouseholdScreen } from '@/household/CreateHouseholdScreen'
import { GenderPrompt } from '@/household/GenderPrompt'
import { JoinScreen } from '@/household/JoinScreen'
import { usePendingInvitation } from '@/household/pendingInvitation'
import { isHebrew, tr } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FLAGS, hasFlag } from '@/onboarding/storage'
import { tourSteps } from '@/onboarding/steps'
import { TourProvider } from '@/onboarding/TourProvider'
import { useTour } from '@/onboarding/tourContext'
import { useQuickAdd } from '@/transactions/quickAdd'
import { QuickAddProvider } from '@/transactions/QuickAddProvider'

const NAV_ITEMS = [
  { to: '/', label: tr({ he: 'ראשי', en: 'Home' }), icon: LayoutDashboard },
  {
    to: '/transactions',
    label: tr({ he: 'הוצאות והכנסות', en: 'Transactions' }),
    icon: ArrowLeftRight,
  },
  { to: '/budget', label: tr({ he: 'תקציב', en: 'Budget' }), icon: Wallet },
  { to: '/reports', label: tr({ he: 'דוחות', en: 'Reports' }), icon: BarChart3 },
  { to: '/settings', label: tr({ he: 'הגדרות', en: 'Settings' }), icon: Settings },
]

// On phones settings move to the header, leaving room for the add button in the middle.
const MOBILE_TABS = NAV_ITEMS.filter((item) => item.to !== '/settings')

/**
 * Gate for the signed-in app: verifies the user with the backend, then sends them to
 * a pending invitation, to household setup, or into the app itself.
 */
export function AppShell() {
  const currentUser = useCurrentUser()
  const household = useHousehold()
  const pendingInvitation = usePendingInvitation()
  // The main screen has its own compact top row (month + settings) on phones.
  const isMain = useLocation().pathname === '/'

  if (currentUser.isPending || household.isPending) {
    return <LoadingState className="min-h-dvh" />
  }
  if (currentUser.isError || household.isError) {
    return (
      <ErrorState
        className="min-h-dvh justify-center"
        title={tr({ he: 'לא הצלחנו לטעון את החשבון', en: "We couldn't load your account" })}
        description={tr({
          he: 'השרת לא זמין או לא אישר את ההתחברות. אפשר לנסות שוב, או להתחבר מחדש.',
          en: "The server is unavailable or didn't accept the sign-in. Try again, or sign in again.",
        })}
        onRetry={() => {
          void currentUser.refetch()
          void household.refetch()
        }}
      >
        <Button variant="outline" onClick={signOut}>
          {tr({ he: 'התחברות מחדש', en: 'Sign in again' })}
        </Button>
      </ErrorState>
    )
  }
  if (pendingInvitation.token) {
    return <JoinScreen token={pendingInvitation.token} onDone={pendingInvitation.clear} />
  }
  if (!household.data) {
    return <CreateHouseholdScreen />
  }

  const context: ShellContext = {
    user: currentUser.data,
    household: household.data,
  }
  return (
    <QuickAddProvider household={household.data} userId={currentUser.data.id}>
      <Onboarding context={context}>
        <div className="min-h-dvh">
          <DesktopSidebar email={currentUser.data.email} />

          <header
            className={cn(
              'sticky top-0 z-20 flex h-14 items-center justify-between bg-background/85 px-4 backdrop-blur-md lg:hidden',
              isMain && 'hidden',
            )}
          >
            <Wordmark />
            <NavLink
              to="/settings"
              aria-label={tr({ he: 'הגדרות', en: 'Settings' })}
              className={({ isActive }) =>
                cn(
                  'flex size-11 items-center justify-center rounded-full transition-colors',
                  isActive ? 'bg-secondary text-primary' : 'bg-card text-muted-foreground',
                )
              }
            >
              <Settings className="size-5" aria-hidden />
            </NavLink>
          </header>

          <main className="lg:ps-64">
            <div
              className={cn(
                'mx-auto max-w-3xl px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:px-10 lg:pt-12 lg:pb-12',
                isMain && 'pt-2.5',
              )}
            >
              <Outlet context={context} />
            </div>
          </main>

          <MobileTabBar />
        </div>
      </Onboarding>
    </QuickAddProvider>
  )
}

/**
 * First steps: how to address the member (asked once, in Hebrew only: English has no
 * gendered forms of address), then the guided tour.
 */
function Onboarding({ context, children }: { context: ShellContext; children: ReactNode }) {
  const gender = myGender(context)
  const partner = partnerName(context)
  const [askGender, setAskGender] = useState(
    () => isHebrew && gender === null && !hasFlag(FLAGS.genderSkipped),
  )
  const steps = useMemo(() => tourSteps(gender, partner), [gender, partner])
  return (
    <TourProvider steps={steps} autoStart={!askGender}>
      {children}
      <GenderStep open={askGender} onClose={() => setAskGender(false)} />
    </TourProvider>
  )
}

/** After the gender question, the tour continues from there. */
function GenderStep({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tour = useTour()
  return (
    <GenderPrompt
      open={open}
      onClose={() => {
        onClose()
        tour.startOnce()
      }}
    />
  )
}

function DesktopSidebar({ email }: { email: string | null }) {
  const { add } = useQuickAdd()
  return (
    <aside className="fixed inset-y-0 start-0 z-20 hidden w-64 flex-col border-e bg-card px-4 py-6 lg:flex">
      <Wordmark className="px-3" />
      <Button className="mt-8" data-tour="add" onClick={() => add()}>
        <Plus aria-hidden />
        {tr({ he: 'הוספת הוצאה או הכנסה', en: 'Add expense or income' })}
      </Button>
      <nav aria-label={tr({ he: 'ניווט ראשי', en: 'Main navigation' })} className="mt-6 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            data-tour={`nav-${to}`}
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
          {tr({ he: 'התנתקות', en: 'Sign out' })}
        </Button>
      </div>
    </aside>
  )
}

function MobileTabBar() {
  const { add } = useQuickAdd()
  const half = MOBILE_TABS.length / 2
  const tab = ({ to, label, icon: Icon }: (typeof NAV_ITEMS)[number]) => (
    <li key={to}>
      <NavLink
        to={to}
        end={to === '/'}
        data-tour={`nav-${to}`}
        className={({ isActive }) =>
          cn(
            'mx-auto flex h-14 w-full max-w-20 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-semibold transition-colors',
            isActive ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground',
          )
        }
      >
        <Icon className="size-6" aria-hidden />
        {label}
      </NavLink>
    </li>
  )
  return (
    <nav
      aria-label={tr({ he: 'ניווט ראשי', en: 'Main navigation' })}
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-3xl bg-card px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgb(31_92_69/0.08)] lg:hidden"
    >
      <ul className="grid grid-cols-5 items-center">
        {MOBILE_TABS.slice(0, half).map(tab)}
        <li className="flex justify-center">
          <Button
            size="icon"
            aria-label={tr({ he: 'הוספת הוצאה או הכנסה', en: 'Add expense or income' })}
            data-tour="add"
            onClick={() => add()}
            className="size-14 rounded-2xl bg-brass text-foreground shadow-lg shadow-brass/35 hover:bg-brass/90"
          >
            <Plus className="size-7" strokeWidth={2.6} />
          </Button>
        </li>
        {MOBILE_TABS.slice(half).map(tab)}
      </ul>
    </nav>
  )
}
