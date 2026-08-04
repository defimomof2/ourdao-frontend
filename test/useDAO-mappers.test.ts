import { describe, expect, it } from 'vitest'
import {
  toLoan,
  toMemberStatus,
  asBigInt,
  tag,
  loanStatusCode,
  mapLoanProposal,
  mapTreasuryProposal,
} from '@/hooks/useDAO'
import { MemberStatus } from '@/types/dao'
import type { BackendLoan } from '@/lib/backend'

describe('toLoan', () => {
  it('derives amountPaid from amount minus outstanding', () => {
    const l: BackendLoan = {
      id: 1,
      borrower: 'GA',
      amount: '1000',
      outstanding: '400',
      status: 'active',
      approved_ledger: 50,
      repaid_ledger: null,
      updated_at: '',
    }
    const loan = toLoan(l)
    expect(loan.amount).toBe(BigInt(1000))
    expect(loan.amountPaid).toBe(BigInt(600))
    expect(loan.isActive).toBe(true)
    expect(loan.startTime).toBe(50)
  })

  it('clamps amountPaid to zero rather than going negative', () => {
    const l: BackendLoan = {
      id: 2,
      borrower: 'GA',
      amount: '100',
      outstanding: '150', // shouldn't happen, but must not produce a negative paid amount
      status: 'active',
      approved_ledger: null,
      repaid_ledger: null,
      updated_at: '',
    }
    expect(toLoan(l).amountPaid).toBe(BigInt(0))
  })

  it('marks a repaid loan as not active', () => {
    const l: BackendLoan = {
      id: 3,
      borrower: 'GA',
      amount: '100',
      outstanding: '0',
      status: 'repaid',
      approved_ledger: 1,
      repaid_ledger: 2,
      updated_at: '',
    }
    expect(toLoan(l).isActive).toBe(false)
  })
})

describe('toMemberStatus', () => {
  it('maps a bare "ActiveMember" symbol to ACTIVE_MEMBER', () => {
    expect(toMemberStatus('ActiveMember')).toBe(MemberStatus.ACTIVE_MEMBER)
  })

  it('maps a one-element array form (as some Soroban enums decode) the same way', () => {
    expect(toMemberStatus(['ActiveMember'])).toBe(MemberStatus.ACTIVE_MEMBER)
  })

  it('maps anything else to INACTIVE_MEMBER', () => {
    expect(toMemberStatus('Inactive')).toBe(MemberStatus.INACTIVE_MEMBER)
    expect(toMemberStatus(undefined)).toBe(MemberStatus.INACTIVE_MEMBER)
  })
})

describe('asBigInt', () => {
  it('passes bigints through', () => {
    expect(asBigInt(BigInt(5))).toBe(BigInt(5))
  })
  it('coerces numbers and numeric strings', () => {
    expect(asBigInt(5)).toBe(BigInt(5))
    expect(asBigInt('5')).toBe(BigInt(5))
  })
  it('falls back to 0 for null/undefined/unparseable input instead of throwing', () => {
    expect(asBigInt(undefined)).toBe(BigInt(0))
    expect(asBigInt(null)).toBe(BigInt(0))
    expect(asBigInt('not a number')).toBe(BigInt(0))
  })
})

describe('tag', () => {
  it('unwraps a one-element array form of a unit enum', () => {
    expect(tag(['Approved'])).toBe('Approved')
  })
  it('stringifies a bare value', () => {
    expect(tag('Approved')).toBe('Approved')
  })
})

describe('loanStatusCode', () => {
  it('maps Approved status to 3', () => {
    expect(loanStatusCode({ status: 'Approved', phase: 'Executed' })).toBe(3)
  })
  it('maps Executed status to 5', () => {
    expect(loanStatusCode({ status: 'Executed', phase: 'Executed' })).toBe(5)
  })
  it('maps Rejected status, or an Expired phase, to 4', () => {
    expect(loanStatusCode({ status: 'Rejected', phase: 'Voting' })).toBe(4)
    expect(loanStatusCode({ status: 'Pending', phase: 'Expired' })).toBe(4)
  })
  it('maps a Voting phase (still pending) to 2', () => {
    expect(loanStatusCode({ status: 'Pending', phase: 'Voting' })).toBe(2)
  })
  it('maps an Editing phase to 1', () => {
    expect(loanStatusCode({ status: 'Pending', phase: 'Editing' })).toBe(1)
  })
  it('defaults to 0 for anything else', () => {
    expect(loanStatusCode({ status: 'Pending', phase: 'SomethingNew' })).toBe(0)
  })
})

describe('mapLoanProposal', () => {
  it('derives votingStartTime/votingEndTime from editing_period_end + a fixed 7-day window', () => {
    const raw = {
      id: 1,
      borrower: 'GA',
      amount: BigInt(1000),
      interest_rate: 500,
      status: 'Pending',
      phase: 'Voting',
      for_votes: 2,
      against_votes: 1,
      created_at: 100,
      editing_period_end: 1000,
    }
    const p = mapLoanProposal(raw)
    expect(p.votingStartTime).toBe(1000)
    expect(p.votingEndTime).toBe(1000 + 7 * 24 * 60 * 60)
    expect(p.status).toBe(2)
    expect(p.votesFor).toBe(2)
  })
})

describe('mapTreasuryProposal', () => {
  it('falls back to a generated title when reason is empty', () => {
    const p = mapTreasuryProposal({ id: 7, amount: BigInt(1), destination: 'GD', status: 'Pending' })
    expect(p.title).toBe('Treasury withdrawal #7')
  })
  it('uses the reason as the title when present', () => {
    const p = mapTreasuryProposal({ id: 7, amount: BigInt(1), destination: 'GD', status: 'Pending', reason: 'Pay contractor' })
    expect(p.title).toBe('Pay contractor')
  })
  it('maps Executed/Rejected/else to the right status code', () => {
    expect(mapTreasuryProposal({ id: 1, amount: BigInt(1), destination: 'GD', status: 'Executed' }).status).toBe(5)
    expect(mapTreasuryProposal({ id: 1, amount: BigInt(1), destination: 'GD', status: 'Rejected' }).status).toBe(4)
    expect(mapTreasuryProposal({ id: 1, amount: BigInt(1), destination: 'GD', status: 'Pending' }).status).toBe(2)
  })
})
