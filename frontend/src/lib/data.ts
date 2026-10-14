import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/auth/useAuth'
import { apiRequest } from '@/lib/api'

/**
 * Household data (categories, transactions, budgets, reports) shares one query key
 * prefix, so any change invalidates every screen at once.
 */
const DATA_KEY = 'household-data'

/** Partners edit the same data from two devices; refresh while the page is in use. */
const PARTNER_SYNC_INTERVAL_MS = 60_000

type QueryParams = Record<string, string | number | undefined>

function withParams(path: string, params?: QueryParams): string {
  if (!params) return path
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export function useDataQuery<T>(path: string, params?: QueryParams, enabled = true) {
  const session = useSession()
  return useQuery({
    queryKey: [DATA_KEY, session.user.id, path, params ?? {}],
    queryFn: () => apiRequest<T>(withParams(path, params), session.access_token),
    enabled,
    refetchInterval: PARTNER_SYNC_INTERVAL_MS,
    refetchOnWindowFocus: true,
  })
}

type MutationRequest = {
  path: string
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  params?: QueryParams
}

/** A change to household data. On success, every household data query is refetched. */
export function useDataMutation<TResult = unknown, TVariables = void>(
  toRequest: (variables: TVariables) => MutationRequest,
) {
  const session = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: TVariables) => {
      const { path, method, body, params } = toRequest(variables)
      return apiRequest<TResult>(withParams(path, params), session.access_token, { method, body })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DATA_KEY] }),
  })
}
