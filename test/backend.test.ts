import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backend, BACKEND_URL } from '@/lib/backend'

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as Response
}

describe('backend fetch wrappers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getStats fetches /api/stats and returns the parsed body', async () => {
    const stats = { totalMembers: 5 }
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(stats))
    const result = await backend.getStats()
    expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/api/stats`, expect.objectContaining({ cache: 'no-store' }))
    expect(result).toEqual(stats)
  })

  it('getStats falls back to null when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(null, false))
    expect(await backend.getStats()).toBeNull()
  })

  it('getStats falls back to null when fetch itself throws (backend unreachable)', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network error'))
    expect(await backend.getStats()).toBeNull()
  })

  it('getLoans without a borrower hits /api/loans with no query string', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]))
    await backend.getLoans()
    expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/api/loans`, expect.anything())
  })

  it('getLoans with a borrower URL-encodes it into the query string', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]))
    await backend.getLoans('GA BC') // space to prove encoding happens
    expect(fetch).toHaveBeenCalledWith(
      `${BACKEND_URL}/api/loans?borrower=GA%20BC`,
      expect.anything()
    )
  })

  it('getLoans falls back to an empty array, not null, on failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(null, false))
    expect(await backend.getLoans()).toEqual([])
  })

  it('getEvents composes symbol + limit query params', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]))
    await backend.getEvents(25, 'loan_req')
    expect(fetch).toHaveBeenCalledWith(
      `${BACKEND_URL}/api/events?symbol=loan_req&limit=25`,
      expect.anything()
    )
  })

  it('getAdminLog hits /api/admin/log with the limit', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]))
    await backend.getAdminLog(10)
    expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/api/admin/log?limit=10`, expect.anything())
  })

  it('markNotificationRead PATCHes the right URL and reports success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response)
    const ok = await backend.markNotificationRead(42)
    expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/api/notifications/42/read`, { method: 'PATCH' })
    expect(ok).toBe(true)
  })

  it('markNotificationRead returns false on a non-ok response or a thrown error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response)
    expect(await backend.markNotificationRead(1)).toBe(false)

    vi.mocked(fetch).mockRejectedValueOnce(new Error('down'))
    expect(await backend.markNotificationRead(1)).toBe(false)
  })

  it('markAllNotificationsRead URL-encodes the address', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response)
    await backend.markAllNotificationsRead('GA BC')
    expect(fetch).toHaveBeenCalledWith(
      `${BACKEND_URL}/api/notifications/read-all?address=GA%20BC`,
      { method: 'PATCH' }
    )
  })
})
