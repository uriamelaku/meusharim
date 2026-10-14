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

type RequestOptions = { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown }

export async function apiRequest<T>(
  path: string,
  accessToken: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(path, {
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
