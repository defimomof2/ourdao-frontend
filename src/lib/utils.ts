import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// clsx alone only concatenates — it doesn't know that e.g. bg-white and
// bg-primary conflict, so which one visually wins depends on Tailwind's
// generated stylesheet order, not on which is later in the className
// string. twMerge resolves same-property conflicts by source order
// instead, so a caller's override classes reliably win over a component's
// own defaults (e.g. Button's default variant bg-primary/text-primary-foreground).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format a Soroban token amount (Stellar assets use 7 decimals) for display.
// Keeps full integer precision via BigInt; trims trailing fractional zeros.
export function formatToken(
  value: bigint | string | number,
  decimals: number = 7
): string {
  try {
    const v = typeof value === 'bigint' ? value : BigInt(String(value).split('.')[0] || '0')
    const neg = v < BigInt(0)
    const abs = neg ? -v : v
    const base = BigInt(10) ** BigInt(decimals)
    const whole = (abs / base).toString()
    const frac = (abs % base)
      .toString()
      .padStart(decimals, '0')
      .slice(0, 4)
      .replace(/0+$/, '')
    return `${neg ? '-' : ''}${whole}${frac ? '.' + frac : ''}`
  } catch {
    return '0'
  }
}

// Format dates to readable format
export function formatDate(timestamp: number | string | Date): string {
  try {
    let date: Date
    if (typeof timestamp === 'number') {
      // If it's a unix timestamp (seconds), convert to milliseconds
      date = timestamp < 10000000000 ? new Date(timestamp * 1000) : new Date(timestamp)
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp)
    } else {
      date = timestamp
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Invalid date'
  }
}

// Format an address to shortened form
export function formatAddress(address: string, startLength: number = 6, endLength: number = 4): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}

// Calculate percentage for voting results
export function calculatePercentage(votes: number, totalVotes: number): number {
  if (totalVotes === 0) return 0
  return Math.round((votes / totalVotes) * 100)
}

// Parse a decimal string into a Soroban token amount (BigInt, 7-decimal default).
// Inverse of formatToken; splits on the decimal point instead of doing
// floating-point math, so precision isn't lost for large amounts.
export function parseToken(value: string, decimals: number = 7): bigint {
  try {
    const cleanValue = value.trim()
    if (!cleanValue || isNaN(Number(cleanValue))) {
      throw new Error('Invalid number')
    }
    const [wholePart, fracPart = ''] = cleanValue.split('.')
    const base = BigInt(10) ** BigInt(decimals)
    const whole = BigInt(wholePart || '0') * base
    const frac = BigInt((fracPart + '0'.repeat(decimals)).slice(0, decimals) || '0')
    return whole + frac
  } catch {
    return BigInt(0)
  }
}

/**
 * Compute a SHA-256 commitment matching the contract's `privacy.rs`:
 *   sha256(support_byte ++ salt)
 *
 * `support` – true = aye, false = nay
 * `salt`    – 32 cryptographically random bytes (via crypto.getRandomValues)
 *
 * Returns { commitment: Uint8Array (32 bytes), salt: Uint8Array (32 bytes) }.
 */
export async function generateCommitment(support: boolean): Promise<{
  commitment: Uint8Array
  salt: Uint8Array
}> {
  const salt = new Uint8Array(32)
  crypto.getRandomValues(salt)

  const preimage = new Uint8Array(33)
  preimage[0] = support ? 1 : 0
  preimage.set(salt, 1)

  const hashBuffer = await crypto.subtle.digest('SHA-256', preimage)
  const commitment = new Uint8Array(hashBuffer)

  return { commitment, salt }
}

const SALT_STORAGE_KEY = 'ourdao-commit-salt'

/**
 * Persist the salt for a proposal so the voter can reveal later.
 * Losing this salt forfeits the vote permanently.
 */
export function storeCommitSalt(proposalId: number, salt: Uint8Array): void {
  const map = loadSaltMap()
  map[proposalId] = Array.from(salt)
  localStorage.setItem(SALT_STORAGE_KEY, JSON.stringify(map))
}

/** Retrieve a previously stored salt for a proposal, or null. */
export function loadCommitSalt(proposalId: number): Uint8Array | null {
  const map = loadSaltMap()
  const arr = map[proposalId]
  return arr ? new Uint8Array(arr) : null
}

function loadSaltMap(): Record<number, number[]> {
  try {
    const raw = localStorage.getItem(SALT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}
