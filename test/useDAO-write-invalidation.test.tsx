import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useMemberRegistration,
  useVoting,
  useStaking,
  useAttachDocument,
} from '@/hooks/useDAO'

const mockRegisterMember = vi.fn()
const mockVoteOnLoanProposal = vi.fn()
const mockStake = vi.fn()
const mockAttachDocument = vi.fn()

vi.mock('@/lib/wallet', () => ({
  useWallet: () => ({
    address: 'GALICE',
    isConnected: true,
    signXDR: vi.fn(),
  }),
}))

vi.mock('@/lib/dao-client', () => ({
  daoWrite: () => ({
    registerMember: (...args: unknown[]) => mockRegisterMember(...args),
    voteOnLoanProposal: (...args: unknown[]) => mockVoteOnLoanProposal(...args),
    stake: (...args: unknown[]) => mockStake(...args),
    attachDocument: (...args: unknown[]) => mockAttachDocument(...args),
  }),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => 'id') },
}))

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function Harness<T>({ useHook, onRender }: { useHook: () => T; onRender: (h: T) => void }) {
  const hook = useHook()
  onRender(hook)
  return null
}

function renderWithClient<T>(client: QueryClient, useHook: () => T, onRender: (h: T) => void) {
  render(
    <QueryClientProvider client={client}>
      <Harness useHook={useHook} onRender={onRender} />
    </QueryClientProvider>
  )
}

describe('write-hook query invalidation', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.clearAllMocks())

  it('a successful registerMember invalidates userData and daoStats, and nothing else', async () => {
    mockRegisterMember.mockResolvedValue({ hash: 'tx1', returnValue: null })
    const client = makeClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

    let latest: ReturnType<typeof useMemberRegistration> | undefined
    renderWithClient(client, useMemberRegistration, (h) => { latest = h })

    await act(async () => {
      await latest!.registerMember()
    })

    await waitFor(
      () => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['userData', 'GALICE'] }),
      { timeout: 2000 }
    )
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['daoStats'] })
    expect(invalidateSpy).toHaveBeenCalledTimes(2)
  })

  it('a failed registerMember invalidates nothing', async () => {
    mockRegisterMember.mockRejectedValue(new Error('NotEligible'))
    const client = makeClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

    let latest: ReturnType<typeof useMemberRegistration> | undefined
    renderWithClient(client, useMemberRegistration, (h) => { latest = h })

    await expect(
      act(async () => {
        await latest!.registerMember()
      })
    ).rejects.toThrow('NotEligible')

    // Give the (skipped) invalidation window a chance to fire if it were
    // going to, then confirm it never did.
    await new Promise((r) => setTimeout(r, 600))
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('voting invalidates the specific proposal, the proposal list, and daoStats (a vote can trigger disbursement)', async () => {
    mockVoteOnLoanProposal.mockResolvedValue({ hash: 'tx2', returnValue: null })
    const client = makeClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

    let latest: ReturnType<typeof useVoting> | undefined
    renderWithClient(client, useVoting, (h) => { latest = h })

    await act(async () => {
      await latest!.voteOnProposal(7, true)
    })

    await waitFor(
      () => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['loanProposal', 7] }),
      { timeout: 2000 }
    )
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['loanProposals'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['daoStats'] })
  })

  it('staking invalidates the connected address\'s own stake and daoStats', async () => {
    mockStake.mockResolvedValue({ hash: 'tx3', returnValue: null })
    const client = makeClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

    let latest: ReturnType<typeof useStaking> | undefined
    renderWithClient(client, useStaking, (h) => { latest = h })

    await act(async () => {
      await latest!.stake(BigInt(100))
    })

    await waitFor(
      () => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['stake', 'GALICE'] }),
      { timeout: 2000 }
    )
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['daoStats'] })
  })

  it('attaching a document invalidates only that document\'s cache entry', async () => {
    mockAttachDocument.mockResolvedValue({ hash: 'tx4', returnValue: null })
    const client = makeClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

    let latest: ReturnType<typeof useAttachDocument> | undefined
    renderWithClient(client, useAttachDocument, (h) => { latest = h })

    await act(async () => {
      await latest!.attach('Loan', 3, 'QmHash')
    })

    await waitFor(
      () =>
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['document', 'Loan', 3] }),
      { timeout: 2000 }
    )
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
  })
})
