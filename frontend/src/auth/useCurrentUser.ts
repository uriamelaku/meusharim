import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { useSession } from './useAuth'

export type CurrentUser = { id: string; email: string | null }

/** The signed-in user as verified by the backend (not just the local Supabase session). */
export function useCurrentUser() {
  const session = useSession()
  return useQuery({
    queryKey: ['me', session.user.id],
    queryFn: () => apiRequest<CurrentUser>('/api/me', session.access_token),
  })
}
