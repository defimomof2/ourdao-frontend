import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RequestLoanPage from '@/app/loans/request/page'

const mockPush = vi.fn()
const mockRequestLoan = vi.fn()
const mockAttach = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
    loading: () => 'toast-id',
  },
}))

vi.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/hooks/useDAO', () => ({
  useDAOStats: () => ({
    features: { documentStorage: true },
  }),
  useUserData: () => ({
    isConnected: true,
    isMember: true,
    hasActiveLoan: false,
  }),
  useLoanRequest: () => ({
    requestLoan: (...args: unknown[]) => mockRequestLoan(...args),
    isPending: false,
    error: null,
    isSuccess: false,
  }),
  useAttachDocument: () => ({
    attach: (...args: unknown[]) => mockAttach(...args),
    isPending: false,
    error: null,
    isSuccess: false,
  }),
}))

async function fillAmountAndAdvance(amount = '10') {
  fireEvent.change(screen.getByLabelText(/Loan Amount/), { target: { value: amount } })
  fireEvent.click(screen.getByRole('button', { name: /Next/ }))
  await screen.findByText(/Supporting Documents/)
}

async function advanceToReview() {
  fireEvent.click(screen.getByRole('button', { name: /Next/ }))
  await screen.findByText(/Review & Submit/)
}

describe('RequestLoanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequestLoan.mockResolvedValue(42)
    mockAttach.mockResolvedValue({ hash: 'txhash' })
  })
  afterEach(() => vi.useRealTimers())

  it('does not render a purpose field, privacy toggle, or privacy secret anywhere in the flow', async () => {
    render(<RequestLoanPage />)
    await fillAmountAndAdvance()
    await advanceToReview()

    expect(screen.queryByLabelText(/Loan Purpose/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Privacy Mode/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Privacy Secret/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Enable Privacy Mode/)).not.toBeInTheDocument()
  })

  it('validation: a zero amount is rejected client-side and never reaches requestLoan', async () => {
    render(<RequestLoanPage />)
    // '0' is a non-empty string, so the Next button's `!formData.amount`
    // guard doesn't catch it — the numeric check in handleSubmit must.
    await fillAmountAndAdvance('0')
    await advanceToReview()

    fireEvent.click(screen.getByRole('button', { name: /Submit Request/ }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Please enter a valid loan amount'))
    expect(mockRequestLoan).not.toHaveBeenCalled()
  })

  it('requests the loan with only the parsed amount', async () => {
    render(<RequestLoanPage />)
    await fillAmountAndAdvance('10')
    await advanceToReview()

    fireEvent.click(screen.getByRole('button', { name: /Submit Request/ }))

    await waitFor(() => expect(mockRequestLoan).toHaveBeenCalledTimes(1))
    expect(mockRequestLoan).toHaveBeenCalledWith(BigInt(10) * BigInt(10 ** 7))
    expect(mockAttach).not.toHaveBeenCalled()
  })

  it('attaches the manually entered document hash to the new proposal id after the loan is created', async () => {
    render(<RequestLoanPage />)
    await fillAmountAndAdvance('10')

    fireEvent.change(screen.getByLabelText(/Or enter IPFS hash manually/), {
      target: { value: 'QmTestHash' },
    })
    await advanceToReview()

    fireEvent.click(screen.getByRole('button', { name: /Submit Request/ }))

    await waitFor(() => expect(mockAttach).toHaveBeenCalledWith('Loan', 42, 'QmTestHash'))
  })

  it('reports a partial failure instead of a single atomic success when attach_document fails', async () => {
    mockAttach.mockRejectedValue(new Error('attach failed'))
    render(<RequestLoanPage />)
    await fillAmountAndAdvance('10')

    fireEvent.change(screen.getByLabelText(/Or enter IPFS hash manually/), {
      target: { value: 'QmTestHash' },
    })
    await advanceToReview()

    fireEvent.click(screen.getByRole('button', { name: /Submit Request/ }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringMatching(/loan request was submitted.*attaching the document failed/i)
      )
    )
    // The loan itself still succeeded — the page still reports success and
    // schedules the redirect rather than treating the whole submission as failed.
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Loan request submitted successfully!'))
  })
})
