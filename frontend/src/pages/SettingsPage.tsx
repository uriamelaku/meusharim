import { ChevronLeft, CircleHelp, LogOut, Moon, Sun } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { DeleteAccountCard } from '@/account/DeleteAccountCard'
import { signOut } from '@/auth/signOut'
import { PageHeader } from '@/components/PageHeader'
import { CategoriesCard } from '@/categories/CategoriesCard'
import { myGender, partnerOf, useShellContext } from '@/components/shellContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type Gender, useUpdateMyGender } from '@/household/api'
import { HouseholdCard } from '@/household/HouseholdCard'
import { Segmented } from '@/components/Segmented'
import { describeError } from '@/lib/errors'
import { GENDER_OPTIONS } from '@/lib/gender'
import { changeLanguage, isHebrew, language, LANGUAGE_OPTIONS, tr } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

export function SettingsPage() {
  const { user, household } = useShellContext()
  return (
    <>
      <PageHeader title={tr({ he: 'הגדרות', en: 'Settings' })} />
      <div className="flex flex-col gap-4">
        <HelpLink />
        <AppearanceCard />
        <HouseholdCard household={household} userId={user.id} />
        <CategoriesCard />
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">{tr({ he: 'החשבון שלי', en: 'My account' })}</CardTitle>
            <CardDescription>
              {tr({ he: 'המייל שאיתו נכנסים', en: 'The email you sign in with' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="truncate text-base font-medium" dir="ltr">
                {user.email}
              </p>
              <Button variant="outline" onClick={signOut}>
                <LogOut aria-hidden />
                {tr({ he: 'התנתקות', en: 'Sign out' })}
              </Button>
            </div>
            {isHebrew && <GenderSetting gender={myGender({ user, household })} />}
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
          {theme === 'dark' ? (
            <Moon className="size-5" aria-hidden />
          ) : (
            <Sun className="size-5" aria-hidden />
          )}
          {tr({ he: 'תצוגה', en: 'Display' })}
        </CardTitle>
        <CardDescription>
          {tr({ he: 'נשמר במכשיר הזה בלבד.', en: 'Saved on this device only.' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Segmented
          label={tr({ he: 'ערכת צבעים', en: 'Color theme' })}
          options={[
            { value: 'light', label: tr({ he: 'בהיר', en: 'Light' }) },
            { value: 'dark', label: tr({ he: 'כהה', en: 'Dark' }) },
          ]}
          value={theme}
          onChange={setTheme}
        />
        <Segmented
          label={tr({ he: 'שפה', en: 'Language' })}
          showLabel
          options={LANGUAGE_OPTIONS}
          value={language}
          onChange={changeLanguage}
        />
      </CardContent>
    </Card>
  )
}

function GenderSetting({ gender }: { gender: Gender | null }) {
  const update = useUpdateMyGender()
  return (
    <Segmented
      label="איך לפנות אליך?"
      showLabel
      options={GENDER_OPTIONS}
      value={update.isPending ? update.variables : gender}
      onChange={(value) =>
        update.mutate(value, {
          onSuccess: () => toast.success(tr({ he: 'נשמר', en: 'Saved' })),
          onError: (error) => toast.error(describeError(error)),
        })
      }
    />
  )
}

function HelpLink() {
  return (
    <Link
      to="/help"
      data-tour="help"
      className="flex items-center gap-3 rounded-2xl bg-secondary p-4 text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-primary">
        <CircleHelp className="size-5" aria-hidden />
      </span>
      <span className="flex-1">
        <span className="block font-heading text-lg font-semibold">
          {tr({ he: 'איך זה עובד?', en: 'How it works' })}
        </span>
        <span className="block text-sm text-muted-foreground">
          {tr({
            he: 'הסברים קצרים על כל מה שיש באפליקציה',
            en: 'Short explanations of everything in the app',
          })}
        </span>
      </span>
      <ChevronLeft className="size-5 text-muted-foreground ltr:-scale-x-100" aria-hidden />
    </Link>
  )
}
