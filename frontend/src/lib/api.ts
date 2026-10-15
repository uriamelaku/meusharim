export class ApiError extends Error {
  readonly status: number
  /** Machine-readable error code from the backend's `detail`, e.g. "household_full". */
  readonly code: string | null

  constructor(status: number, code: string | null) {
    super(`API request failed with status ${status}${code ? ` (${code})` : ''}`)
    this.status = status
    this.code = code
  }
}

async function readErrorCode(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json()
    const detail = (body as { detail?: unknown } | null)?.detail
    return typeof detail === 'string' ? detail : null
  } catch {
    return null // Not a JSON error body (e.g. a proxy error page).
  }
}

/**
 * Where the backend lives. Empty (the default) means the same origin as the app, which
 * is how local development works through the Vite proxy. Set VITE_API_BASE_URL when the
 * API is on its own domain, e.g. "https://api.example.com".
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

type RequestOptions = { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown }

export async function apiRequest<T>(
  path: string,
  accessToken: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new ApiError(response.status, await readErrorCode(response))
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
