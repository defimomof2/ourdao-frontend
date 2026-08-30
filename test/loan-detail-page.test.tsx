import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from './test-utils'
import LoanDetailsPage from '@/app/(app)/loans/[id]/page'

const mockIsMember = vi.fn()
const mockIsAdmin = vi.fn()
const mockGetMember = vi.fn()
const mockGetPendingYield = vi.fn()
const mockGetLoanProposal = vi.fn()
const mockGetLoan = vi.fn()
const mockGetDocument = vi.fn()
const mockGetTotalMembers = vi.fn()
const mockGetActiveMembers = vi.fn()
const mockGetConsensusThreshold = vi.fn()
const mockGetTreasuryBalance = vi.fn()
const mockGetLoanPolicy = vi.fn()
const mockIsPaused = vi.fn()
const mockGetLoans = vi.fn()
const mockGetNotifications = vi.fn()
const mockGetEvents = vi.fn()
const mockGetStats = vi.fn()
const mockToastError = vi.fn()
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/loans/1',
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: (...a: unknown[]) => mockToastError(...a), loading: vi.fn(() => 'id') },
}))

vi.mock('@/lib/wallet', () => ({
  useWallet: () => ({
    address: 'GALICE',
    isConnected: true,
    connecting: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    signXDR: vi.fn(),
  }),
}))

vi.mock('@/lib/stellar', async () => {
  const actual = await vi.importActual<typeof import('@/lib/stellar')>('@/lib/stellar')
  return { ...actual, isContractConfigured: () => true }
})

vi.mock('@/lib/dao-client', () => ({
  daoRead: {
    isMember: (...a: unknown[]) => mockIsMember(...a),
    isAdmin: (...a: unknown[]) => mockIsAdmin(...a),
    getMember: (...a: unknown[]) => mockGetMember(...a),
    getPendingYield: (...a: unknown[]) => mockGetPendingYield(...a),
    getLoanProposal: (...a: unknown[]) => mockGetLoanProposal(...a),
    getLoan: (...a: unknown[]) => mockGetLoan(...a),
    getDocument: (...a: unknown[]) => mockGetDocument(...a),
    getTotalMembers: (...a: unknown[]) => mockGetTotalMembers(...a),
    getActiveMembers: (...a: unknown[]) => mockGetActiveMembers(...a),
    getConsensusThreshold: (...a: unknown[]) => mockGetConsensusThreshold(...a),
    getTreasuryBalance: (...a: unknown[]) => mockGetTreasuryBalance(...a),
    getLoanPolicy: (...a: unknown[]) => mockGetLoanPolicy(...a),
    isPaused: (...a: unknown[]) => mockIsPaused(...a),
  },
  daoWrite: () => ({}),
}))

vi.mock('@/lib/backend', () => ({
  backend: {
    getLoans: (...a: unknown[]) => mockGetLoans(...a),
    getNotifications: (...a: unknown[]) => mockGetNotifications(...a),
    getEvents: (...a: unknown[]) => mockGetEvents(...a),
    getStats: (...a: unknown[]) => mockGetStats(...a),
    getAdminLog: vi.fn().mockResolvedValue([]),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}))

describe('LoanDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMember.mockResolvedValue(true)
    mockIsAdmin.mockResolvedValue(false)
    mockGetMember.mockResolvedValue({ status: 'ActiveMember', has_active_loan: false })
    mockGetPendingYield.mockResolvedValue(BigInt(0))
    mockGetTotalMembers.mockResolvedValue(10)
    mockGetActiveMembers.mockResolvedValue(8)
    mockGetConsensusThreshold.mockResolvedValue(5000)
    mockGetTreasuryBalance.mockResolvedValue(BigInt(0))
    mockGetLoanPolicy.mockResolvedValue({})
    mockIsPaused.mockResolvedValue(false)
    mockGetLoan.mockResolvedValue(null)
    mockGetDocument.mockResolvedValue(null)
    mockGetLoans.mockResolvedValue([])
    mockGetNotifications.mockResolvedValue([])
    mockGetEvents.mockResolvedValue([])
    mockGetStats.mockResolvedValue(null)
  })
  afterEach(() => vi.clearAllMocks())

  it('renders the real proposal fetched by the route id', async () => {
    mockGetLoanProposal.mockResolvedValue({
      id: 1,
      borrower: 'GBORROWER',
      amount: BigInt(1000_0000000),
      interest_rate: 500,
      status: 'Pending',
      phase: 'Voting',
      for_votes: 2,
      against_votes: 1,
      created_at: 1000,
      editing_period_end: 2000,
    })
    renderWithProviders(<LoanDetailsPage />)

    await waitFor(() => expect(screen.getByText(/Loan Proposal #1/)).toBeInTheDocument())
    expect(screen.queryByText('Loan Not Found')).not.toBeInTheDocument()
  })

  it('shows "Loan Not Found" — not a blank page — when the contract has no proposal at this id', async () => {
    mockGetLoanProposal.mockResolvedValue(null)
    renderWithProviders(<LoanDetailsPage />)

    await waitFor(() => expect(screen.getByText('Loan Not Found')).toBeInTheDocument())
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Loan not found'))
  })
})
