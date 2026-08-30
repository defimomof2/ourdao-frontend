'use client'

import { rpc, Networks } from '@stellar/stellar-sdk'

/**
 * Stellar / Soroban network configuration.
 *
 * Everything is env-driven with testnet defaults, so the app runs out of the
 * box against public testnet. Point NEXT_PUBLIC_CONTRACT_ID at a deployed
 * OurDAO contract to enable live reads/writes.
 */
export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET

export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org'

/** Deployed OurDAO contract id (C...). Empty until a deployment is configured. */
export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || ''

/** Whether a contract id is configured — the UI degrades gracefully without one. */
export const isContractConfigured = (): boolean => CONTRACT_ID.startsWith('C')

/** Shared JSON-RPC client for simulation and submission. */
export const server = new rpc.Server(SOROBAN_RPC_URL, {
  allowHttp: SOROBAN_RPC_URL.startsWith('http://'),
})

const isTestnet = NETWORK_PASSPHRASE === Networks.TESTNET
const explorerBase = isTestnet
  ? 'https://stellar.expert/explorer/testnet'
  : 'https://stellar.expert/explorer/public'

export const getContractUrl = (contractId: string = CONTRACT_ID) =>
  `${explorerBase}/contract/${contractId}`

export const getTransactionUrl = (hash: string) => `${explorerBase}/tx/${hash}`

export const getAddressUrl = (address: string) => `${explorerBase}/account/${address}`

/** Short display form for a Stellar address or contract id: `GABC…WXYZ`. */
export const formatStellarAddress = (address?: string, chars = 4): string => {
  if (!address) return ''
  if (address.length <= chars * 2 + 1) return address
  return `${address.slice(0, chars)}…${address.slice(-chars)}`
}

/**
 * Returns true when `value` is a well-formed Stellar public key or contract
 * address in canonical (uppercase) form: starts with G or C followed by
 * exactly 55 uppercase alphanumeric characters (base32 alphabet).
 *
 * This is the same pattern used in useNotifications.ts (`/^[GC][A-Z0-9]{55}$/`)
 * lifted here so every part of the codebase shares a single source of truth.
 */
export const isStellarAddress = (value: string): boolean =>
  /^[GC][A-Z0-9]{55}$/.test(value)
