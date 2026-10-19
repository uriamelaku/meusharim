import { useOutletContext } from 'react-router'
import type { CurrentUser } from '@/auth/useCurrentUser'
import type { Gender, Household, Member } from '@/household/api'
import { tr } from '@/lib/i18n'

/** What every page inside the app shell can rely on: a verified user with a household. */
export type ShellContext = { user: CurrentUser; household: Household }

export function useShellContext(): ShellContext {
  return useOutletContext<ShellContext>()
}

/** The other member of the household, once they joined. */
export function partnerOf({ user, household }: ShellContext): Member | null {
  return household.members.find((member) => member.user_id !== user.id) ?? null
}

/** The partner's name, or a neutral description before they joined. */
export function partnerName(context: ShellContext): string {
  return partnerOf(context)?.display_name ?? tr({ he: 'בן או בת הזוג', en: 'your partner' })
}

/** The signed-in member's own row. */
export function meOf({ user, household }: ShellContext): Member | undefined {
  return household.members.find((member) => member.user_id === user.id)
}

/** How the app addresses the signed-in member. */
export function myGender(context: ShellContext): Gender | null {
  return meOf(context)?.gender ?? null
}
