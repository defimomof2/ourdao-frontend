import { describe, expect, it } from 'vitest'
import {
  fetchProposalPage,
  FETCH_CONCURRENCY,
  PROPOSAL_PAGE_SIZE,
} from '@/hooks/useDAO'

const id = (n: number) => ({ id: n })
const mapId = (raw: Record<string, unknown>) => raw.id as number

describe('fetchProposalPage', () => {
  it('walks backwards from count - 1, so the newest ids come first', async () => {
    const fetchOne = async (i: number) => id(i)
    const page = await fetchProposalPage(25, 0, fetchOne, mapId, 10)
    expect(page.items).toEqual([24, 23, 22, 21, 20, 19, 18, 17, 16, 15])
    expect(page.nextOffset).toBe(10)
    expect(page.hasErrors).toBe(false)
  })

  it('continues from the given offset on a subsequent page', async () => {
    const fetchOne = async (i: number) => id(i)
    const page = await fetchProposalPage(25, 10, fetchOne, mapId, 10)
    expect(page.items).toEqual([14, 13, 12, 11, 10, 9, 8, 7, 6, 5])
    expect(page.nextOffset).toBe(20)
  })

  it('returns a short final page and a null nextOffset once id 0 is reached', async () => {
    const fetchOne = async (i: number) => id(i)
    const page = await fetchProposalPage(25, 20, fetchOne, mapId, 10)
    expect(page.items).toEqual([4, 3, 2, 1, 0])
    expect(page.nextOffset).toBeNull()
  })

  it('resolves empty with a null nextOffset once the offset has passed every id (preview mode included, count = 0)', async () => {
    const fetchOne = async (i: number) => id(i)
    expect(await fetchProposalPage(0, 0, fetchOne, mapId, 10)).toEqual({
      items: [],
      hasErrors: false,
      nextOffset: null,
    })
    expect(await fetchProposalPage(25, 25, fetchOne, mapId, 10)).toEqual({
      items: [],
      hasErrors: false,
      nextOffset: null,
    })
  })

  it('drops a single rejected read instead of failing or emptying the whole page', async () => {
    const fetchOne = async (i: number) => {
      if (i === 22) throw new Error('RPC hiccup')
      return id(i)
    }
    const page = await fetchProposalPage(25, 0, fetchOne, mapId, 10)
    expect(page.items).toEqual([24, 23, 21, 20, 19, 18, 17, 16, 15])
    expect(page.hasErrors).toBe(true)
  })

  it('treats a null read (id has no proposal) as a silent skip, not an error', async () => {
    const fetchOne = async (i: number) => (i === 22 ? null : id(i))
    const page = await fetchProposalPage(25, 0, fetchOne, mapId, 10)
    expect(page.items).toEqual([24, 23, 21, 20, 19, 18, 17, 16, 15])
    expect(page.hasErrors).toBe(false)
  })

  it('bounds concurrent reads in flight to FETCH_CONCURRENCY', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const fetchOne = async (i: number) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight--
      return id(i)
    }
    await fetchProposalPage(50, 0, fetchOne, mapId, 50)
    expect(maxInFlight).toBeLessThanOrEqual(FETCH_CONCURRENCY)
    expect(maxInFlight).toBeGreaterThan(1)
  })

  it('uses PROPOSAL_PAGE_SIZE as the default page size', async () => {
    const fetchOne = async (i: number) => id(i)
    const page = await fetchProposalPage(PROPOSAL_PAGE_SIZE + 5, 0, fetchOne, mapId)
    expect(page.items).toHaveLength(PROPOSAL_PAGE_SIZE)
  })
})
