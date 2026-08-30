import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from './test-utils'
import AdminPage from '@/app/(app)/admin/page'

const mockIsMember = vi.fn()
const mockIsAdmin = vi.fn()
const mockGetMember = vi.fn()
const mockGetPendingYield = vi.fn()
const mockGetAdmins = vi.fn()
const mockGetTotalMembers = vi.fn()
const mockGetActiveMembers = vi.fn()
const mockGetConsensusThreshold = vi.fn()
const mockGetTreasuryBalance = vi.fn()
const mockGetLoanPolicy = vi.fn()
const mockIsPaused = vi.fn()
const mockGetLoans = vi.fn()
const mockGetAdminLog = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ push: vi.fn() }),
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
    getAdmins: (...a: unknown[]) => mockGetAdmins(...a),
    getTotalMembers: (...a: unknown[]) => mockGetTotalMembers(...a),
    getActiveMembers: (...a: unknown[]) => mockGetActiveMembers(...a),
    getConsensusThreshold: (...a: unknown[]) => mockGetConsensusThreshold(...a),
    getTreasuryBalance: (...a: unknown[]) => mockGetTreasuryBalance(...a),
    getLoanPolicy: (...a: unknown[]) => mockGetLoanPolicy(...a),
    isPaused: (...a: unknown[]) => mockIsPaused(...a),
  },
  daoWrite: () => ({ pause: vi.fn(), unpause: vi.fn(), addAdmin: vi.fn(), removeAdmin: vi.fn() }),
}))

vi.mock('@/lib/backend', () => ({
  backend: {
    getLoans: (...a: unknown[]) => mockGetLoans(...a),
    getNotifications: vi.fn().mockResolvedValue([]),
    getEvents: vi.fn().mockResolvedValue([]),
    getStats: vi.fn().mockResolvedValue(null),
    getAdminLog: (...a: unknown[]) => mockGetAdminLog(...a),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}))

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMember.mockResolvedValue({ status: 'ActiveMember', has_active_loan: false })
    mockGetPendingYield.mockResolvedValue(BigInt(0))
    mockGetAdmins.mockResolvedValue(['GADMIN'])
    mockGetTotalMembers.mockResolvedValue(10)
    mockGetActiveMembers.mockResolvedValue(8)
    mockGetConsensusThreshold.mockResolvedValue(5000)
    mockGetTreasuryBalance.mockResolvedValue(BigInt(0))
    mockGetLoanPolicy.mockResolvedValue({})
    mockIsPaused.mockResolvedValue(false)
    mockGetLoans.mockResolvedValue([])
    mockGetAdminLog.mockResolvedValue([])
  })
  afterEach(() => vi.clearAllMocks())

  it('refuses a non-admin member: shows Access Denied, not the admin controls', async () => {
    mockIsMember.mockResolvedValue(true)
    mockIsAdmin.mockResolvedValue(false)
    renderWithProviders(<AdminPage />)

    await waitFor(() => expect(screen.getByText('Access Denied')).toBeInTheDocument())
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Governance/ })).not.toBeInTheDocument()
  })

  it('renders the admin dashboard for an actual admin', async () => {
    mockIsMember.mockResolvedValue(true)
    mockIsAdmin.mockResolvedValue(true)
    renderWithProviders(<AdminPage />)

    await waitFor(() => expect(screen.getByText('Admin Dashboard')).toBeInTheDocument())
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Governance/ })).toBeInTheDocument()
  })

  it('demonstrates the gate actually gates: flipping isAdmin from true to false changes the outcome', async () => {
    mockIsMember.mockResolvedValue(true)
    mockIsAdmin.mockResolvedValue(true)
    const { unmount } = renderWithProviders(<AdminPage />)
    await waitFor(() => expect(screen.getByText('Admin Dashboard')).toBeInTheDocument())
    unmount()

    mockIsAdmin.mockResolvedValue(false)
    renderWithProviders(<AdminPage />)
    await waitFor(() => expect(screen.getByText('Access Denied')).toBeInTheDocument())
  })
})
