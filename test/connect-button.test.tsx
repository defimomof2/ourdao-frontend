import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '@testing-library/react'
import { ConnectButton } from '@/components/ConnectButton'

const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
let mockAddress: string | undefined
let mockIsConnected = false

vi.mock('@/lib/wallet', () => ({
  useWallet: () => ({
    address: mockAddress,
    isConnected: mockIsConnected,
    connecting: false,
    connect: mockConnect,
    disconnect: mockDisconnect,
    signXDR: vi.fn(),
  }),
}))

describe('ConnectButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddress = undefined
    mockIsConnected = false
  })
  afterEach(() => vi.clearAllMocks())

  it('disconnected: shows "Connect Wallet" and calls connect() on click', () => {
    render(<ConnectButton />)
    const button = screen.getByRole('button', { name: 'Connect Wallet' })
    fireEvent.click(button)
    expect(mockConnect).toHaveBeenCalledTimes(1)
    expect(mockDisconnect).not.toHaveBeenCalled()
  })

  it('connected: shows the shortened address, not "Connect Wallet", and calls disconnect() on click', () => {
    mockAddress = 'GALICEXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    mockIsConnected = true
    render(<ConnectButton />)

    expect(screen.queryByText('Connect Wallet')).not.toBeInTheDocument()
    const button = screen.getByRole('button', { name: /GALI/ })
    fireEvent.click(button)
    expect(mockDisconnect).toHaveBeenCalledTimes(1)
    expect(mockConnect).not.toHaveBeenCalled()
  })
})
