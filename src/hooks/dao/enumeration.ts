// ---------------------------------------------------------------------------
// Proposal enumeration
//
// The contract keeps no queryable list of proposals, so we read the total
// count from the off-chain indexer, then fetch each proposal by id directly
// from the contract (source of truth). In preview mode (no contract / no
// backend) the count is 0 and the lists resolve empty.
//
// Enumeration walks backwards from `count - 1` (newest id first) one page at
// a time, since the list UI is newest-first and only recent proposals are
// still votable — the ones a truncated, oldest-first scan would drop first.
// Each page bounds concurrent contract reads (a public RPC endpoint can rate
// limit or flake under an unbounded burst) and settles them independently,
// so one rejected read drops a single row instead of emptying the page.
// ---------------------------------------------------------------------------

export const PROPOSAL_PAGE_SIZE = 20
export const FETCH_CONCURRENCY = 8

/** Run `fn` over `items` with at most `limit` calls in flight at once,
 *  settling each independently (unlike Promise.all, one rejection doesn't
 *  fail the whole batch). */
async function settleWithConcurrency<A, B>(
  items: A[],
  limit: number,
  fn: (item: A) => Promise<B>
): Promise<PromiseSettledResult<B>[]> {
  const results: PromiseSettledResult<B>[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i]) }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export interface ProposalPage<T> {
  items: T[]
  /** true if at least one id in this page failed to fetch and was dropped. */
  hasErrors: boolean
  /** offset to request for the next page, or null once the oldest id (0) has been reached. */
  nextOffset: number | null
}

/** Fetch one page of proposals, walking backwards from `count - 1` so the
 *  newest ids come first. `offset` is how many newest-first proposals prior
 *  pages already covered. */
export async function fetchProposalPage<T>(
  count: number,
  offset: number,
  fetchOne: (id: number) => Promise<Record<string, unknown> | null>,
  map: (raw: Record<string, unknown>) => T,
  pageSize: number = PROPOSAL_PAGE_SIZE
): Promise<ProposalPage<T>> {
  const start = count - 1 - offset
  if (start < 0) return { items: [], hasErrors: false, nextOffset: null }

  const end = Math.max(start - pageSize + 1, 0)
  const ids: number[] = []
  for (let id = start; id >= end; id--) ids.push(id)

  const settled = await settleWithConcurrency(ids, FETCH_CONCURRENCY, fetchOne)

  const items: T[] = []
  let hasErrors = false
  for (const result of settled) {
    if (result.status === 'rejected') {
      hasErrors = true
    } else if (result.value) {
      items.push(map(result.value))
    }
  }

  return { items, hasErrors, nextOffset: end > 0 ? offset + pageSize : null }
}
