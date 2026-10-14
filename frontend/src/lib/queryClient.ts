import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

const MAX_RETRIES = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Client errors (401, 404, 409...) will not change on retry; network and 5xx errors might.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < MAX_RETRIES,
      refetchOnWindowFocus: false,
    },
  },
})
