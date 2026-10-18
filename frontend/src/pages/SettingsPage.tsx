import { LogOut } from 'lucide-react'
import { DeleteAccountCard } from '@/account/DeleteAccountCard'
import { signOut } from '@/auth/signOut'
import { PageHeader } from '@/components/PageHeader'
import { CategoriesCard } from '@/categories/CategoriesCard'
import { useShellContext } from '@/components/shellContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HouseholdCard } from '@/household/HouseholdCard'

export function SettingsPage() {
  const { user, household } = useShellContext()
  return (
    <>
      <PageHeader title="הגדרות" />
      <div className="flex flex-col gap-4">
        <HouseholdCard household={household} userId={user.id} />
        <CategoriesCard />
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">החשבון שלי</CardTitle>
            <CardDescription>מחובר/ת עם המייל</CardDescription>
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
        <DeleteAccountCard hasPartner={household.members.length > 1} />
      </div>
    </>
  )
}
