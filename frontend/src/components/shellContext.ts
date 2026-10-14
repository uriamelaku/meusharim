import { useOutletContext } from 'react-router'
import type { CurrentUser } from '@/auth/useCurrentUser'
import type { Household } from '@/household/api'

/** What every page inside the app shell can rely on: a verified user with a household. */
export type ShellContext = { user: CurrentUser; household: Household }

export function useShellContext(): ShellContext {
  return useOutletContext<ShellContext>()
}
