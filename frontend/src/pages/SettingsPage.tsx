import { LogOut } from 'lucide-react'
import { useOutletContext } from 'react-router'
import { signOut } from '@/auth/signOut'
import type { CurrentUser } from '@/auth/useCurrentUser'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SettingsPage() {
  const user = useOutletContext<CurrentUser>()
  return (
    <>
      <PageHeader title="הגדרות" />
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
    </>
  )
}
