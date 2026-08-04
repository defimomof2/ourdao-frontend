'use client'

/**
 * Soroban client for the OurDAO contract.
 *
 * `read` simulates a contract call and decodes the result (no wallet needed).
 * `invoke` prepares, signs (via Freighter), submits, and polls a state-changing
 * call. Typed wrappers below mirror the Rust contract's public interface.
 */
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
  xdr,
} from '@stellar/stellar-sdk'
import {
  CONTRACT_ID,
  NETWORK_PASSPHRASE,
  isContractConfigured,
  server,
} from './stellar'

// ---------------------------------------------------------------------------
// ScVal argument builders (JS value -> Soroban value with the right type)
// ---------------------------------------------------------------------------

export const sc = {
  addr: (a: string): xdr.ScVal => new Address(a).toScVal(),
  i128: (v: bigint | number | string): xdr.ScVal =>
    nativeToScVal(BigInt(v), { type: 'i128' }),
  u32: (v: number): xdr.ScVal => nativeToScVal(v, { type: 'u32' }),
  u64: (v: bigint | number): xdr.ScVal =>
    nativeToScVal(BigInt(v), { type: 'u64' }),
  // Booleans map unambiguously to scvBool; nativeToScVal needs no type hint
  // (there's no 'bool' entry in its ScValType union at all).
  bool: (v: boolean): xdr.ScVal => nativeToScVal(v),
  str: (v: string): xdr.ScVal => nativeToScVal(v, { type: 'string' }),
  bytes: (v: Uint8Array): xdr.ScVal => xdr.ScVal.scvBytes(v as Buffer),
  vecAddr: (list: string[]): xdr.ScVal =>
    xdr.ScVal.scvVec(list.map((a) => new Address(a).toScVal())),
  // ProposalKind is a unit-variant enum: encoded as a single-symbol vector.
  proposalKind: (kind: 'Loan' | 'Treasury'): xdr.ScVal =>
    xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(kind)]),
}

export interface LoanPolicyInput {
  minMembershipDuration: number | bigint
  membershipContribution: bigint | number | string
  maxLoanDuration: number | bigint
  minInterestRate: number
  maxInterestRate: number
  cooldownPeriod: number | bigint
  maxLoanToTreasuryRatio: number
}

export function policyToScVal(p: LoanPolicyInput): xdr.ScVal {
  return nativeToScVal(
    {
      min_membership_duration: BigInt(p.minMembershipDuration),
      membership_contribution: BigInt(p.membershipContribution),
      max_loan_duration: BigInt(p.maxLoanDuration),
      min_interest_rate: p.minInterestRate,
      max_interest_rate: p.maxInterestRate,
      cooldown_period: BigInt(p.cooldownPeriod),
      max_loan_to_treasury_ratio: p.maxLoanToTreasuryRatio,
    },
    {
      type: {
        min_membership_duration: ['symbol', 'u64'],
        membership_contribution: ['symbol', 'i128'],
        max_loan_duration: ['symbol', 'u64'],
        min_interest_rate: ['symbol', 'u32'],
        max_interest_rate: ['symbol', 'u32'],
        cooldown_period: ['symbol', 'u64'],
        max_loan_to_treasury_ratio: ['symbol', 'u32'],
      },
    }
  )
}

// ---------------------------------------------------------------------------
// Core read / invoke
// ---------------------------------------------------------------------------

/** Simulate a read-only call and decode the return value. Returns null when no
 * contract is configured or the call yields no value. */
export async function read<T = unknown>(
  method: string,
  ...args: xdr.ScVal[]
): Promise<T | null> {
  if (!isContractConfigured()) return null

  const contract = new Contract(CONTRACT_ID)
  // Simulation needs a source account but never touches it on-chain.
  const source = new Account(Keypair.random().publicKey(), '0')
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const sim = await server.simulateTransaction(tx)
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`simulate ${method} failed: ${sim.error}`)
  }
  const retval = sim.result?.retval
  return retval ? (scValToNative(retval) as T) : null
}

export interface InvokeResult {
  hash: string
  returnValue: unknown
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Prepare, sign, submit, and confirm a state-changing call. */
export async function invoke(
  walletAddress: string,
  signXDR: (xdr: string) => Promise<string>,
  method: string,
  ...args: xdr.ScVal[]
): Promise<InvokeResult> {
  if (!isContractConfigured()) {
    throw new Error('No contract configured (set NEXT_PUBLIC_CONTRACT_ID).')
  }

  const contract = new Contract(CONTRACT_ID)
  const account = await server.getAccount(walletAddress)
  const built = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  // Simulate + assemble auth entries and resource footprint.
  const prepared = await server.prepareTransaction(built)
  const signedXdr = await signXDR(prepared.toXDR())
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)

  const sent = await server.sendTransaction(signedTx)
  if (sent.status === 'ERROR') {
    throw new Error(`submit ${method} failed: ${JSON.stringify(sent.errorResult)}`)
  }

  let result = await server.getTransaction(sent.hash)
  for (let i = 0; i < 30 && result.status === 'NOT_FOUND'; i++) {
    await sleep(1000)
    result = await server.getTransaction(sent.hash)
  }
  if (result.status !== 'SUCCESS') {
    throw new Error(`transaction ${sent.hash} did not succeed (${result.status})`)
  }
  return {
    hash: sent.hash,
    returnValue: result.returnValue ? scValToNative(result.returnValue) : null,
  }
}

// ---------------------------------------------------------------------------
// Typed read wrappers (mirror the Rust contract views)
// ---------------------------------------------------------------------------

export const daoRead = {
  getTotalMembers: () => read<number>('get_total_members'),
  getActiveMembers: () => read<number>('get_active_members'),
  getConsensusThreshold: () => read<number>('get_consensus_threshold'),
  getTreasuryBalance: () => read<bigint>('get_treasury_balance'),
  getLoanPolicy: () => read<Record<string, unknown>>('get_loan_policy'),
  getToken: () => read<string>('get_token'),
  isPaused: () => read<boolean>('is_paused'),
  getAdmins: () => read<string[]>('get_admins'),
  isMember: (addr: string) => read<boolean>('is_member', sc.addr(addr)),
  isAdmin: (addr: string) => read<boolean>('is_admin', sc.addr(addr)),
  isEligibleForLoan: (addr: string) =>
    read<boolean>('is_eligible_for_loan', sc.addr(addr)),
  getMember: (addr: string) =>
    read<Record<string, unknown> | null>('get_member', sc.addr(addr)),
  getPendingYield: (addr: string) =>
    read<bigint>('get_pending_yield', sc.addr(addr)),
  getStake: (addr: string) => read<bigint>('get_stake', sc.addr(addr)),
  getLoan: (id: number) => read<Record<string, unknown> | null>('get_loan', sc.u32(id)),
  getLoanProposal: (id: number) =>
    read<Record<string, unknown> | null>('get_loan_proposal', sc.u32(id)),
  getTreasuryProposal: (id: number) =>
    read<Record<string, unknown> | null>('get_treasury_proposal', sc.u32(id)),
  calculateLoanTerms: (amount: bigint | number) =>
    read<Record<string, unknown>>('calculate_loan_terms', sc.i128(amount)),
  calculateExitShare: (addr: string) =>
    read<bigint>('calculate_exit_share', sc.addr(addr)),
  resolveName: (name: string) => read<string | null>('resolve_name', sc.str(name)),
  nameOf: (addr: string) => read<string | null>('name_of', sc.addr(addr)),
  getDocument: (kind: 'Loan' | 'Treasury', id: number) =>
    read<Uint8Array | null>('get_document', sc.proposalKind(kind), sc.u32(id)),
}

// ---------------------------------------------------------------------------
// Typed write wrappers — bound to a connected wallet + signer
// ---------------------------------------------------------------------------

export function daoWrite(
  address: string,
  signXDR: (xdr: string) => Promise<string>
) {
  const send = (method: string, ...args: xdr.ScVal[]) =>
    invoke(address, signXDR, method, ...args)

  return {
    registerMember: () => send('register_member', sc.addr(address)),
    exitDao: () => send('exit_dao', sc.addr(address)),
    claimRewards: () => send('claim_rewards', sc.addr(address)),

    requestLoan: (amount: bigint | number) =>
      send('request_loan', sc.addr(address), sc.i128(amount)),
    editLoanProposal: (proposalId: number, newAmount: bigint | number) =>
      send('edit_loan_proposal', sc.addr(address), sc.u32(proposalId), sc.i128(newAmount)),
    voteOnLoanProposal: (proposalId: number, support: boolean) =>
      send('vote_on_loan_proposal', sc.addr(address), sc.u32(proposalId), sc.bool(support)),
    repayLoan: (loanId: number) =>
      send('repay_loan', sc.addr(address), sc.u32(loanId)),

    proposeTreasuryWithdrawal: (
      amount: bigint | number,
      destination: string,
      reason: string,
      isPrivate: boolean
    ) =>
      send(
        'propose_treasury_withdrawal',
        sc.addr(address),
        sc.i128(amount),
        sc.addr(destination),
        sc.str(reason),
        sc.bool(isPrivate)
      ),
    voteOnTreasuryProposal: (proposalId: number, support: boolean) =>
      send('vote_on_treasury_proposal', sc.addr(address), sc.u32(proposalId), sc.bool(support)),

    stake: (amount: bigint | number) =>
      send('stake', sc.addr(address), sc.i128(amount)),
    unstake: (amount: bigint | number) =>
      send('unstake', sc.addr(address), sc.i128(amount)),

    registerName: (name: string) =>
      send('register_name', sc.addr(address), sc.str(name)),

    commitTreasuryVote: (proposalId: number, commitment: Uint8Array) =>
      send('commit_treasury_vote', sc.addr(address), sc.u32(proposalId), sc.bytes(commitment)),
    revealTreasuryVote: (proposalId: number, support: boolean, salt: Uint8Array) =>
      send(
        'reveal_treasury_vote',
        sc.addr(address),
        sc.u32(proposalId),
        sc.bool(support),
        sc.bytes(salt)
      ),

    attachDocument: (kind: 'Loan' | 'Treasury', proposalId: number, contentHash: Uint8Array) =>
      send('attach_document', sc.addr(address), sc.proposalKind(kind), sc.u32(proposalId), sc.bytes(contentHash)),

    // Admin-only entrypoints. The contract itself enforces the admin check
    // (`util::require_admin`) — `address` here is the connected wallet acting
    // as `caller`, not necessarily an admin; a non-admin call simply fails
    // on-chain with NotAdmin.
    addAdmin: (admin: string) => send('add_admin', sc.addr(address), sc.addr(admin)),
    removeAdmin: (admin: string) => send('remove_admin', sc.addr(address), sc.addr(admin)),
    setConsensusThreshold: (thresholdBps: number) =>
      send('set_consensus_threshold', sc.addr(address), sc.u32(thresholdBps)),
    setLoanPolicy: (policy: LoanPolicyInput) =>
      send('set_loan_policy', sc.addr(address), policyToScVal(policy)),
    pause: () => send('pause', sc.addr(address)),
    unpause: () => send('unpause', sc.addr(address)),
  }
}

export type DaoWrite = ReturnType<typeof daoWrite>
