'use client'

import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useWallet } from '@/lib/wallet'
import { CONTRACT_ID, isContractConfigured } from '@/lib/stellar'
import { daoRead, daoWrite } from '@/lib/dao-client'
import { backend, type BackendEvent, type BackendLoan } from '@/lib/backend'
import type { UserData, DAOStats, Loan } from '@/types/dao'
import { MemberStatus } from '@/types/dao'

// Map an indexed backend loan onto the frontend Loan shape. The indexer tracks
// principal, outstanding balance and status; fields it doesn't yet index
// (interest rate, term, collateral) default to 0.
function toLoan(l: BackendLoan): Loan {
  const amount = asBigInt(l.amount)
  const outstanding = asBigInt(l.outstanding)
  return {
    id: l.id,
    borrower: l.borrower,
    amount,
    interestRate: 0,
    repaymentTerm: 0,
    startTime: l.approved_ledger ?? 0,
    endTime: 0,
    amountPaid: amount > outstanding ? amount - outstanding : BigInt(0),
    totalInterest: BigInt(0),
    isActive: l.status === 'active',
    collateralAmount: BigInt(0),
  }
}

// A Soroban unit-enum decodes as either a bare symbol string or a one-element
// array of it; normalize both to our numeric MemberStatus.
function toMemberStatus(raw: unknown): MemberStatus {
  const tag = Array.isArray(raw) ? raw[0] : raw
  return tag === 'ActiveMember' ? MemberStatus.ACTIVE_MEMBER : MemberStatus.INACTIVE_MEMBER
}

const asBigInt = (v: unknown): bigint => {
  try {
    return typeof v === 'bigint' ? v : BigInt((v as number | string) ?? 0)
  } catch {
    return BigInt(0)
  }
}

export function useDAOContract() {
  return { contractId: CONTRACT_ID, configured: isContractConfigured() }
}

/** Aggregated data for the connected member. */
export function useUserData(): UserData {
  const { address, isConnected } = useWallet()

  const { data } = useQuery({
    queryKey: ['userData', address],
    enabled: !!address && isContractConfigured(),
    queryFn: async () => {
      const [isMember, isAdmin, member, pendingYield] = await Promise.all([
        daoRead.isMember(address!),
        daoRead.isAdmin(address!),
        daoRead.getMember(address!),
        daoRead.getPendingYield(address!),
      ])
      return { isMember, isAdmin, member, pendingYield }
    },
  })

  // Loan history comes from the off-chain indexer (the contract keeps no
  // queryable per-member loan list). Independent of contract configuration so
  // it still resolves when only the backend URL is set.
  const { data: loans } = useQuery({
    queryKey: ['userLoans', address],
    enabled: !!address,
    queryFn: () => backend.getLoans(address!),
    refetchInterval: 15_000,
  })

  const m = data?.member
  return {
    isConnected,
    address: address || undefined,
    isMember: !!data?.isMember,
    isAdmin: !!data?.isAdmin,
    member: m
      ? {
          memberAddress: String(m.address ?? address),
          status: toMemberStatus(m.status),
          joinDate: Number(m.join_ledger ?? 0),
          contributionAmount: asBigInt(m.contribution),
          shareBalance: asBigInt(m.share_balance),
          hasActiveLoan: !!m.has_active_loan,
          lastLoanDate: Number(m.last_loan_time ?? 0),
        }
      : undefined,
    votingWeight: 1,
    pendingRewards: asBigInt(data?.pendingYield),
    pendingYield: asBigInt(data?.pendingYield),
    hasActiveLoan: !!m?.has_active_loan,
    loans: (loans ?? []).map(toLoan),
  }
}

type ExtendedStats = DAOStats & {
  initialized: boolean
  membershipFee: bigint
  consensusThreshold: number
  features: {
    ensVoting: boolean
    documentStorage: boolean
    privateVoting: boolean
    confidentialLoans: boolean
    restaking: boolean
  }
}

export function useDAOStats(): ExtendedStats {
  const { data } = useQuery({
    queryKey: ['daoStats'],
    enabled: isContractConfigured(),
    queryFn: async () => {
      const [totalMembers, activeMembers, threshold, treasury, policy] =
        await Promise.all([
          daoRead.getTotalMembers(),
          daoRead.getActiveMembers(),
          daoRead.getConsensusThreshold(),
          daoRead.getTreasuryBalance(),
          daoRead.getLoanPolicy(),
        ])
      return { totalMembers, activeMembers, threshold, treasury, policy }
    },
  })

  // Loan counts and total stake are aggregated by the off-chain indexer, which
  // sees the full event history the contract doesn't keep queryable.
  const { data: agg } = useQuery({
    queryKey: ['daoStatsBackend'],
    queryFn: () => backend.getStats(),
    refetchInterval: 15_000,
  })

  const membershipFee = asBigInt(
    (data?.policy as Record<string, unknown> | undefined)?.membership_contribution
  )

  return {
    totalMembers: Number(data?.totalMembers ?? 0),
    activeMembers: Number(data?.activeMembers ?? 0),
    totalLoans: agg?.totalLoans ?? 0,
    activeLoans: agg?.activeLoans ?? 0,
    treasuryBalance: asBigInt(data?.treasury),
    totalYieldGenerated: BigInt(0),
    totalRestaked: asBigInt(agg?.totalStaked),
    initialized: isContractConfigured() && data?.threshold != null,
    membershipFee,
    consensusThreshold: Number(data?.threshold ?? 0),
    // The Soroban port's native modules are always compiled in.
    features: {
      ensVoting: true, // name registry
      documentStorage: true, // content-hash metadata
      privateVoting: true, // commit-reveal
      confidentialLoans: false,
      restaking: true, // staking
    },
  }
}

/**
 * Shared plumbing for a write action: resolves the wallet + signer, tracks
 * pending/success/error, and surfaces toasts. Returns a runner plus state.
 */
function useWriteAction() {
  const { address, signXDR, isConnected } = useWallet()
  const [isPending, setPending] = useState(false)
  const [isSuccess, setSuccess] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const run = useCallback(
    async (
      label: string,
      fn: (w: ReturnType<typeof daoWrite>) => Promise<{ hash: string }>
    ) => {
      if (!isConnected || !address) {
        toast.error('Connect your wallet first')
        throw new Error('Wallet not connected')
      }
      setPending(true)
      setSuccess(false)
      setError(null)
      const toastId = toast.loading(`${label}…`)
      try {
        const res = await fn(daoWrite(address, signXDR))
        setSuccess(true)
        toast.success(`${label} confirmed`, { id: toastId })
        return res
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        toast.error(`${label} failed: ${e.message}`, { id: toastId })
        throw e
      } finally {
        setPending(false)
      }
    },
    [address, isConnected, signXDR]
  )

  return { run, isPending, isSuccess, error }
}

export function useMemberRegistration() {
  const { run, isPending, isSuccess, error } = useWriteAction()
  // Extra args kept for call-site compatibility; the Soroban contract pulls the
  // fee via the configured token and takes no ENS/KYC arguments.
  const registerMember = (_ensName?: string, _kycHash?: string, _fee?: bigint) =>
    run('Registering membership', (w) => w.registerMember())
  return { registerMember, isPending, error, isSuccess }
}

export function useLoanRequest() {
  const { run, isPending, isSuccess, error } = useWriteAction()
  const requestLoan = (
    amount: bigint,
    _isPrivate = false,
    _commitment?: string,
    _documentHash?: string
  ) => run('Requesting loan', (w) => w.requestLoan(amount))
  return { requestLoan, isPending, error, isSuccess }
}

export function useVoting() {
  const { run, isPending, isSuccess, error } = useWriteAction()
  const voteOnProposal = (proposalId: number, support: boolean) =>
    run('Casting vote', (w) => w.voteOnLoanProposal(proposalId, support))
  return { voteOnProposal, isPending, error, isSuccess }
}

export function useLoanRepayment() {
  const { run, isPending, isSuccess, error } = useWriteAction()
  // Repayment amount is derived on-chain (full outstanding); arg kept for compat.
  const repayLoan = (loanId: number, _amount?: bigint) =>
    run('Repaying loan', (w) => w.repayLoan(loanId))
  return { repayLoan, isPending, error, isSuccess }
}

export function useRewards() {
  const { run, isPending, isSuccess, error } = useWriteAction()
  const claimRewards = () => run('Claiming rewards', (w) => w.claimRewards())
  const claimYield = () => run('Claiming yield', (w) => w.claimRewards())
  return { claimRewards, claimYield, isPending, error, isSuccess }
}

// Contract events, indexed off-chain by ourdao-backend (which polls the RPC's
// getEvents) and served from its raw event feed. Kept read-only; `setEvents`
// remains for call-site compatibility with the previous shell.
export function useDAOEvents() {
  const { data } = useQuery({
    queryKey: ['daoEvents'],
    queryFn: () => backend.getEvents(50),
    refetchInterval: 15_000,
  })
  const events = (data ?? []) as unknown as Record<string, unknown>[]
  const setEvents = (_: Record<string, unknown>[]) => {}
  return { events, setEvents }
}

// ---------------------------------------------------------------------------
// Proposal enumeration
//
// The contract keeps no queryable list of proposals, so we read the total
// count from the off-chain indexer, then fetch each proposal by id directly
// from the contract (source of truth). In preview mode (no contract / no
// backend) the count is 0 and the lists resolve empty.
// ---------------------------------------------------------------------------

const VOTING_PERIOD = 7 * 24 * 60 * 60
const MAX_ENUMERATE = 100

const tag = (v: unknown): string => String(Array.isArray(v) ? v[0] : v)

/** Map the contract's phase+status onto the UI's numeric ProposalStatus. */
function loanStatusCode(raw: Record<string, unknown>): number {
  const status = tag(raw.status)
  const phase = tag(raw.phase)
  if (status === 'Approved') return 3
  if (status === 'Executed') return 5
  if (status === 'Rejected' || phase === 'Expired') return 4
  if (phase === 'Voting') return 2
  if (phase === 'Editing') return 1
  return 0
}

export interface UILoanProposal {
  id: number
  borrower: string
  amount: bigint
  purpose: string
  interestRate: number
  status: number
  votesFor: number
  votesAgainst: number
  creationTime: number
  votingStartTime: number
  votingEndTime: number
  isPrivate: boolean
  documentHash: string
  hasVoted: boolean
}

function mapLoanProposal(raw: Record<string, unknown>): UILoanProposal {
  const editingEnd = Number(raw.editing_period_end ?? 0)
  return {
    id: Number(raw.id ?? 0),
    borrower: String(raw.borrower ?? ''),
    amount: asBigInt(raw.amount),
    purpose: '', // not stored on-chain; attach a document hash instead
    interestRate: Number(raw.interest_rate ?? 0),
    status: loanStatusCode(raw),
    votesFor: Number(raw.for_votes ?? 0),
    votesAgainst: Number(raw.against_votes ?? 0),
    creationTime: Number(raw.created_at ?? 0),
    votingStartTime: editingEnd,
    votingEndTime: editingEnd ? editingEnd + VOTING_PERIOD : 0,
    isPrivate: false, // loan proposals are public; treasury proposals can be private
    documentHash: '',
    hasVoted: false, // not exposed as a view; write path guards double-votes
  }
}

async function fetchByIds<T>(
  count: number,
  fetchOne: (id: number) => Promise<Record<string, unknown> | null>,
  map: (raw: Record<string, unknown>) => T
): Promise<T[]> {
  const ids = Array.from({ length: Math.min(count, MAX_ENUMERATE) }, (_, i) => i)
  const raws = await Promise.all(ids.map((id) => fetchOne(id)))
  return raws.filter((r): r is Record<string, unknown> => !!r).map(map)
}

/** All loan proposals (newest first), read live from the contract. */
export function useLoanProposals() {
  const { data: stats } = useQuery({
    queryKey: ['backendStats'],
    queryFn: () => backend.getStats(),
    refetchInterval: 15_000,
  })
  const count = stats?.totalLoanProposals ?? 0

  const { data, isLoading } = useQuery({
    queryKey: ['loanProposals', count],
    enabled: isContractConfigured() && count > 0,
    queryFn: () =>
      fetchByIds(count, (id) => daoRead.getLoanProposal(id), mapLoanProposal),
  })

  // Memoize so the array keeps a stable identity across renders; consumers use
  // it as an effect/memo dependency and a fresh array each render would loop.
  const proposals = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.id - a.id),
    [data]
  )
  return { proposals, isLoading, count }
}

/** A single loan proposal by id. */
export function useLoanProposal(id: number) {
  const { data, isLoading } = useQuery({
    queryKey: ['loanProposal', id],
    enabled: isContractConfigured() && Number.isFinite(id) && id >= 0,
    queryFn: async () => {
      const raw = await daoRead.getLoanProposal(id)
      return raw ? mapLoanProposal(raw) : null
    },
  })
  return { proposal: data ?? null, isLoading }
}

export interface UITreasuryProposal {
  id: number
  proposer: string
  title: string
  description: string
  amount: bigint
  recipient: string
  status: number
  votesFor: number
  votesAgainst: number
  creationTime: number
  isPrivate: boolean
}

function mapTreasuryProposal(raw: Record<string, unknown>): UITreasuryProposal {
  const status = tag(raw.status)
  const code = status === 'Executed' ? 5 : status === 'Rejected' ? 4 : 2
  const reason = String(raw.reason ?? '')
  return {
    id: Number(raw.id ?? 0),
    proposer: String(raw.proposer ?? ''),
    title: reason || `Treasury withdrawal #${Number(raw.id ?? 0)}`,
    description: reason,
    amount: asBigInt(raw.amount),
    recipient: String(raw.destination ?? ''),
    status: code,
    votesFor: Number(raw.for_votes ?? 0),
    votesAgainst: Number(raw.against_votes ?? 0),
    creationTime: Number(raw.created_at ?? 0),
    isPrivate: !!raw.private,
  }
}

/** All treasury withdrawal proposals (newest first), read live from the contract. */
export function useTreasuryProposals() {
  const { data: stats } = useQuery({
    queryKey: ['backendStats'],
    queryFn: () => backend.getStats(),
    refetchInterval: 15_000,
  })
  const count = stats?.totalTreasuryProposals ?? 0

  const { data, isLoading } = useQuery({
    queryKey: ['treasuryProposals', count],
    enabled: isContractConfigured() && count > 0,
    queryFn: () =>
      fetchByIds(count, (id) => daoRead.getTreasuryProposal(id), mapTreasuryProposal),
  })

  const proposals = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.id - a.id),
    [data]
  )
  return { proposals, isLoading, count }
}

// ---------------------------------------------------------------------------
// Staking + treasury write hooks
// ---------------------------------------------------------------------------

/** The connected member's current stake (in token base units). */
export function useStake(): bigint {
  const { address } = useWallet()
  const { data } = useQuery({
    queryKey: ['stake', address],
    enabled: !!address && isContractConfigured(),
    queryFn: () => daoRead.getStake(address!),
    refetchInterval: 15_000,
  })
  return asBigInt(data)
}

export function useStaking() {
  const { run, isPending, isSuccess, error } = useWriteAction()
  const stake = (amount: bigint) => run('Staking', (w) => w.stake(amount))
  const unstake = (amount: bigint) => run('Unstaking', (w) => w.unstake(amount))
  return { stake, unstake, isPending, isSuccess, error }
}

export function useTreasuryVoting() {
  const { run, isPending, isSuccess, error } = useWriteAction()
  const voteOnTreasury = (proposalId: number, support: boolean) =>
    run('Casting vote', (w) => w.voteOnTreasuryProposal(proposalId, support))
  return { voteOnTreasury, isPending, isSuccess, error }
}

export function useProposeTreasury() {
  const { run, isPending, isSuccess, error } = useWriteAction()
  const propose = (
    amount: bigint,
    destination: string,
    reason: string,
    isPrivate: boolean
  ) =>
    run('Proposing withdrawal', (w) =>
      w.proposeTreasuryWithdrawal(amount, destination, reason, isPrivate)
    )
  return { propose, isPending, isSuccess, error }
}

// ---------------------------------------------------------------------------
// Proposal documents (the Filecoin-analog content hash)
//
// The contract stores an opaque byte string per proposal; the convention here
// is that it's a UTF-8 content id (an IPFS CID or digest). We encode on write
// and decode on read.
// ---------------------------------------------------------------------------

export function useProposalDocument(kind: 'Loan' | 'Treasury', id: number) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['document', kind, id],
    enabled: isContractConfigured() && Number.isFinite(id) && id >= 0,
    queryFn: async () => {
      const bytes = await daoRead.getDocument(kind, id)
      return bytes && bytes.length ? new TextDecoder().decode(bytes) : null
    },
  })
  return { cid: data ?? null, isLoading, refetch }
}

export function useAttachDocument() {
  const { run, isPending, isSuccess, error } = useWriteAction()
  const attach = (kind: 'Loan' | 'Treasury', proposalId: number, cid: string) =>
    run('Attaching document', (w) =>
      w.attachDocument(kind, proposalId, new TextEncoder().encode(cid.trim()))
    )
  return { attach, isPending, isSuccess, error }
}

// ---------------------------------------------------------------------------
// Admin actions + audit log
//
// The contract enforces admin authorization itself; these just expose the
// entrypoints. A non-admin caller gets a NotAdmin error back from the write,
// surfaced the same way any other failed write is (via the toast in
// useWriteAction).
// ---------------------------------------------------------------------------

export function useAdminActions() {
  const { run, isPending, isSuccess, error } = useWriteAction()
  const pause = () => run('Pausing the DAO', (w) => w.pause())
  const unpause = () => run('Unpausing the DAO', (w) => w.unpause())
  const addAdmin = (admin: string) => run('Adding admin', (w) => w.addAdmin(admin))
  const removeAdmin = (admin: string) => run('Removing admin', (w) => w.removeAdmin(admin))
  const setThreshold = (thresholdBps: number) =>
    run('Updating consensus threshold', (w) => w.setConsensusThreshold(thresholdBps))
  return { pause, unpause, addAdmin, removeAdmin, setThreshold, isPending, isSuccess, error }
}

export interface AdminLogEntry {
  id: string
  symbol: string
  ledger: number
  closedAt: string
  data: unknown
}

function toAdminLogEntry(ev: BackendEvent): AdminLogEntry {
  return { id: ev.id, symbol: ev.symbol, ledger: ev.ledger, closedAt: ev.closed_at, data: ev.data }
}

/** The admin/governance event history (init, admin add/remove, threshold,
 *  policy, pause/unpause), indexed off-chain since the contract keeps no
 *  queryable log of its own admin actions. */
export function useAdminLog(limit = 50) {
  const { data, isLoading } = useQuery({
    queryKey: ['adminLog', limit],
    queryFn: () => backend.getAdminLog(limit),
    refetchInterval: 15_000,
  })
  const entries = useMemo(() => (data ?? []).map(toAdminLogEntry), [data])
  return { entries, isLoading }
}
