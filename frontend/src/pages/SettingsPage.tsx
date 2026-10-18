import { LogOut, Moon, Sun } from 'lucide-react'
import { DeleteAccountCard } from '@/account/DeleteAccountCard'
import { signOut } from '@/auth/signOut'
import { PageHeader } from '@/components/PageHeader'
import { CategoriesCard } from '@/categories/CategoriesCard'
import { partnerOf, useShellContext } from '@/components/shellContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HouseholdCard } from '@/household/HouseholdCard'
import { Segmented } from '@/components/Segmented'
import { useTheme } from '@/lib/theme'

export function SettingsPage() {
  const { user, household } = useShellContext()
  return (
    <>
      <PageHeader title="הגדרות" />
      <div className="flex flex-col gap-4">
        <AppearanceCard />
        <HouseholdCard household={household} userId={user.id} />
        <CategoriesCard />
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">החשבון שלי</CardTitle>
            <CardDescription>המייל שאיתו נכנסים</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="truncate text-base font-medium" dir="ltr">
              {user.email}
            </p>
            <Button variant="outline" onClick={signOut}>
              <LogOut aria-hidden />
              התנתקות
            </Button>
          </CardContent>
        </Card>
        <DeleteAccountCard partner={partnerOf({ user, household })?.display_name ?? null} />
      </div>
    </>
  )
}

function AppearanceCard() {
  const [theme, setTheme] = useTheme()
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {theme === 'dark' ? <Moon className="size-5" aria-hidden /> : <Sun className="size-5" aria-hidden />}
          תצוגה
        </CardTitle>
        <CardDescription>נשמר במכשיר הזה בלבד.</CardDescription>
      </CardHeader>
      <CardContent>
        <Segmented
          label="ערכת צבעים"
          options={[
            { value: 'light', label: 'בהיר' },
            { value: 'dark', label: 'כהה' },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </CardContent>
    </Card>
  )
}
