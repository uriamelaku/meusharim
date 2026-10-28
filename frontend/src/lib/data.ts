import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/auth/useAuth'
import { apiDownload, apiRequest } from '@/lib/api'

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

/** Offset-paged lists ({ items, total }) loaded page by page, e.g. with a "load more" button. */
export function useDataPages<TItem>(path: string, params: QueryParams, pageSize: number) {
  const session = useSession()
  return useInfiniteQuery({
    queryKey: [DATA_KEY, session.user.id, path, params, 'pages'],
    queryFn: ({ pageParam }) =>
      apiRequest<{ items: TItem[]; total: number }>(
        withParams(path, { ...params, limit: pageSize, offset: pageParam }),
        session.access_token,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.length * pageSize
      return loaded < lastPage.total ? loaded : undefined
    },
    refetchInterval: PARTNER_SYNC_INTERVAL_MS,
    refetchOnWindowFocus: true,
  })
}

/**
 * Downloads a file of household data and saves it on the device. A plain link cannot
 * work: the API needs the access token in a header.
 */
export function useDataDownload<TVariables>(
  toRequest: (variables: TVariables) => { path: string; params?: QueryParams; filename: string },
) {
  const session = useSession()
  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const { path, params, filename } = toRequest(variables)
      saveFile(await apiDownload(withParams(path, params), session.access_token), filename)
    },
  })
}

function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  // Some browsers (Safari) read the file after the click returns; free it a little later.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
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
