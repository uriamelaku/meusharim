export class ApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`API request failed with status ${status}`)
    this.status = status
  }
}

export async function apiGet<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(path, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) throw new ApiError(response.status)
  return response.json() as Promise<T>
}
