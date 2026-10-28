import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiDownload, newRequestId } from '@/lib/api'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('newRequestId', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns a v4 UUID', () => {
    expect(newRequestId()).toMatch(UUID_V4)
  })

  it('works without crypto.randomUUID (plain http on a LAN IP)', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })
    const first = newRequestId()
    expect(first).toMatch(UUID_V4)
    expect(newRequestId()).not.toBe(first)
  })
})

describe('apiDownload', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns the file and sends the access token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('a,b\r\n', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const blob = await apiDownload('/api/transactions/export', 'token-1')
    expect(await blob.text()).toBe('a,b\r\n')
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer token-1' })
  })

  it('throws an ApiError with the server code', async () => {
    const body = JSON.stringify({ detail: 'no_household' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 409 })))
    await expect(apiDownload('/api/transactions/export', 'token-1')).rejects.toMatchObject({
      status: 409,
      code: 'no_household',
    })
  })
})
