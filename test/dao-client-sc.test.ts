// @vitest-environment node
//
// jsdom's crypto polyfill isn't compatible with @noble/ed25519's random-byte
// generation (used by Keypair.random()), so this pure-logic suite (no DOM
// interaction) opts back into the real Node environment.
import { describe, expect, it } from 'vitest'
import { Keypair, scValToNative, xdr } from '@stellar/stellar-sdk'
import { sc, policyToScVal, type LoanPolicyInput } from '@/lib/dao-client'

const ADDR = Keypair.random().publicKey()

describe('sc ScVal builders', () => {
  it('addr round-trips a Stellar address', () => {
    expect(scValToNative(sc.addr(ADDR))).toBe(ADDR)
  })

  it('i128 round-trips bigint, number, and string forms to the same value', () => {
    expect(scValToNative(sc.i128(BigInt(1_000_000_000_000)))).toBe(BigInt(1_000_000_000_000))
    expect(scValToNative(sc.i128(42))).toBe(BigInt(42))
    expect(scValToNative(sc.i128('7'))).toBe(BigInt(7))
  })

  it('u32 round-trips a plain number', () => {
    expect(scValToNative(sc.u32(5100))).toBe(5100)
  })

  it('u64 round-trips bigint and number forms', () => {
    expect(scValToNative(sc.u64(BigInt(100)))).toBe(BigInt(100))
    expect(scValToNative(sc.u64(100))).toBe(BigInt(100))
  })

  it('bool round-trips true and false', () => {
    expect(scValToNative(sc.bool(true))).toBe(true)
    expect(scValToNative(sc.bool(false))).toBe(false)
  })

  it('str round-trips a string', () => {
    expect(scValToNative(sc.str('alice.our'))).toBe('alice.our')
  })

  it('bytes round-trips a Uint8Array', () => {
    const bytes = new Uint8Array([1, 2, 3, 255])
    const decoded = scValToNative(sc.bytes(bytes)) as Buffer
    expect(Array.from(decoded)).toEqual([1, 2, 3, 255])
  })

  it('vecAddr round-trips a list of addresses in order', () => {
    const other = Keypair.random().publicKey()
    const decoded = scValToNative(sc.vecAddr([ADDR, other])) as string[]
    expect(decoded).toEqual([ADDR, other])
  })

  it('proposalKind encodes as a single-symbol vector matching the Rust unit-variant enum', () => {
    const loanKind = sc.proposalKind('Loan')
    expect(loanKind.switch()).toBe(xdr.ScValType.scvVec())
    const vec = loanKind.vec()!
    expect(vec).toHaveLength(1)
    expect(vec[0].sym().toString()).toBe('Loan')

    const treasuryKind = sc.proposalKind('Treasury')
    expect(treasuryKind.vec()![0].sym().toString()).toBe('Treasury')
  })
})

describe('policyToScVal', () => {
  const policy: LoanPolicyInput = {
    minMembershipDuration: 86_400,
    membershipContribution: BigInt(1_000_000),
    maxLoanDuration: 30 * 86_400,
    minInterestRate: 500,
    maxInterestRate: 2_000,
    cooldownPeriod: 7 * 86_400,
    maxLoanToTreasuryRatio: 2_000,
  }

  it('round-trips every field with the exact Rust field names and types', () => {
    const decoded = scValToNative(policyToScVal(policy)) as Record<string, unknown>
    expect(decoded.min_membership_duration).toBe(BigInt(86_400))
    expect(decoded.membership_contribution).toBe(BigInt(1_000_000))
    expect(decoded.max_loan_duration).toBe(BigInt(30 * 86_400))
    expect(decoded.min_interest_rate).toBe(500)
    expect(decoded.max_interest_rate).toBe(2_000)
    expect(decoded.cooldown_period).toBe(BigInt(7 * 86_400))
    expect(decoded.max_loan_to_treasury_ratio).toBe(2_000)
  })
})
