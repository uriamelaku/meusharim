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

/**
 * A new idempotency key for a create request. `crypto.randomUUID` exists only in secure
 * contexts (https or localhost), so opening the dev server by LAN IP (e.g. from a phone)
 * falls back to a v4 UUID built from `crypto.getRandomValues`, which works everywhere.
 */
export function newRequestId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // RFC 4122 variant
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
