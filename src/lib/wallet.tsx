'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  isAllowed,
  requestAccess,
  getAddress,
  getNetwork,
  signTransaction,
  WatchWalletChanges,
} from '@stellar/freighter-api'
import { Networks } from '@stellar/stellar-sdk'
import toast from 'react-hot-toast'
import { NETWORK_PASSPHRASE } from './stellar'

interface WalletContextValue {
  address: string | null
  isConnected: boolean
  connecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  /** Signs a base64 transaction XDR with Freighter and returns the signed XDR. */
  signXDR: (xdr: string) => Promise<string>
  /** True when the connected Freighter wallet's active network differs from this app's configured NETWORK_PASSPHRASE. */
  networkMismatch: boolean
  /** Freighter's own network label (e.g. "PUBLIC", "TESTNET"), null until known. */
  walletNetwork: string | null
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined)

// Freighter's API has shifted return shapes across versions (bare string vs.
// `{ address }` vs. `{ address, error }`). These normalize both worlds.
function readAddress(res: unknown): { address: string; error?: string } {
  if (typeof res === 'string') return { address: res }
  const r = (res || {}) as { address?: string; error?: unknown }
  return { address: r.address || '', error: r.error ? String(r.error) : undefined }
}

function readSigned(res: unknown): { signedTxXdr: string; error?: string } {
  if (typeof res === 'string') return { signedTxXdr: res }
  const r = (res || {}) as { signedTxXdr?: string; error?: unknown }
  return {
    signedTxXdr: r.signedTxXdr || '',
    error: r.error ? String(r.error) : undefined,
  }
}

/** Friendly label for a network passphrase, for the mismatch banner. */
function passphraseLabel(passphrase: string): string {
  switch (passphrase) {
    case Networks.PUBLIC:
      return 'Mainnet'
    case Networks.TESTNET:
      return 'Testnet'
    case Networks.FUTURENET:
      return 'Futurenet'
    default:
      return passphrase
  }
}

// Poll interval for Freighter's own watcher (address/network changes aren't
// pushed as DOM events — this is the API's own polling mechanism).
const WALLET_WATCH_INTERVAL_MS = 2000

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [walletNetworkPassphrase, setWalletNetworkPassphrase] = useState<string | null>(null)
  const [walletNetwork, setWalletNetwork] = useState<string | null>(null)
  const watcherRef = useRef<WatchWalletChanges | null>(null)

  const networkMismatch =
    !!address && !!walletNetworkPassphrase && walletNetworkPassphrase !== NETWORK_PASSPHRASE

  // Watch Freighter's active network continuously (on connect and on any
  // later change) rather than only checking once at connect time — the
  // user can switch networks in the extension without reloading the app.
  useEffect(() => {
    if (!address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting derived wallet state on disconnect is a legitimate sync pattern
      setWalletNetworkPassphrase(null)
      setWalletNetwork(null)
      return
    }

    const watcher = new WatchWalletChanges(WALLET_WATCH_INTERVAL_MS)
    watcherRef.current = watcher
    watcher.watch(params => {
      if (params.error) return
      setWalletNetworkPassphrase(params.networkPassphrase || null)
      setWalletNetwork(params.network || null)
    })

    return () => {
      watcher.stop()
      watcherRef.current = null
    }
  }, [address])

  // Restore a previously-authorized session on load (no popup if already allowed).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const allowed = await isAllowed()
        const ok = typeof allowed === 'boolean' ? allowed : allowed?.isAllowed
        if (ok && !cancelled) {
          const { address: addr } = readAddress(await getAddress())
          if (addr && !cancelled) setAddress(addr)
        }
      } catch {
        /* Freighter not installed — stay disconnected. */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const connect = useCallback(async () => {
    setConnecting(true)
    try {
      const { address: addr, error } = readAddress(await requestAccess())
      if (error || !addr) {
        toast.error(
          error
            ? `Wallet connection failed: ${error}`
            : 'Could not connect. Is the Freighter extension installed?'
        )
        return
      }
      setAddress(addr)
      try {
        const net = await getNetwork()
        if (!net.error) {
          setWalletNetworkPassphrase(net.networkPassphrase || null)
          setWalletNetwork(net.network || null)
        }
      } catch {
        /* Network check will be retried by the watcher effect above. */
      }
      toast.success('Wallet connected')
    } catch {
      toast.error('Freighter wallet not found. Install it at freighter.app')
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    // Freighter has no revoke API; we simply forget the session in-app.
    setAddress(null)
    toast('Wallet disconnected')
  }, [])

  const signXDR = useCallback(
    async (xdr: string): Promise<string> => {
      if (!address) throw new Error('Wallet not connected')
      if (networkMismatch) {
        throw new Error(
          `Wallet network mismatch: Freighter is on ${passphraseLabel(
            walletNetworkPassphrase || ''
          )}, this app is configured for ${passphraseLabel(NETWORK_PASSPHRASE)}. Switch Freighter's network to continue.`
        )
      }
      const { signedTxXdr, error } = readSigned(
        await signTransaction(xdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address,
        })
      )
      if (error || !signedTxXdr) {
        throw new Error(error || 'Transaction signing was rejected')
      }
      return signedTxXdr
    },
    [address, networkMismatch, walletNetworkPassphrase]
  )

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        connecting,
        connect,
        disconnect,
        signXDR,
        networkMismatch,
        walletNetwork,
      }}
    >
      {networkMismatch && (
        <div
          role="alert"
          className="fixed top-0 inset-x-0 z-[100] bg-red-600 text-white text-sm font-medium px-4 py-2 text-center shadow-md"
        >
          Wallet network mismatch: Freighter is set to{' '}
          <strong>{walletNetwork || passphraseLabel(walletNetworkPassphrase || '')}</strong>,
          this app expects <strong>{passphraseLabel(NETWORK_PASSPHRASE)}</strong>. Switch
          Freighter&apos;s network — transactions are blocked until it matches.
        </div>
      )}
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider')
  return ctx
}
