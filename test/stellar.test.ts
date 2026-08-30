import { describe, expect, it } from 'vitest'
import { getContractUrl, getTransactionUrl, getAddressUrl, isStellarAddress } from '@/lib/stellar'

describe('stellar explorer URL helpers', () => {
  const testContract = 'CBA2B4 Prostitutas5MFL3GBB3UMY464YPY6YP77M3FJRX'
  const testHash = 'abc123def456'
  const testAddress = 'GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234'

  it('getContractUrl returns a URL containing the contract id', () => {
    const url = getContractUrl(testContract)
    expect(url).toContain(testContract)
    expect(url).toMatch(/^https:\/\/stellar\.expert/)
  })

  it('getContractUrl defaults to CONTRACT_ID when no argument', () => {
    const url = getContractUrl()
    expect(url).toMatch(/^https:\/\/stellar\.expert/)
  })

  it('getTransactionUrl returns a URL containing the hash', () => {
    const url = getTransactionUrl(testHash)
    expect(url).toContain(testHash)
    expect(url).toContain('/tx/')
  })

  it('getAddressUrl returns a URL containing the address', () => {
    const url = getAddressUrl(testAddress)
    expect(url).toContain(testAddress)
    expect(url).toContain('/account/')
  })

  it('URLs use testnet by default', () => {
    const contractUrl = getContractUrl(testContract)
    const txUrl = getTransactionUrl(testHash)
    const addrUrl = getAddressUrl(testAddress)

    expect(contractUrl).toContain('/testnet/')
    expect(txUrl).toContain('/testnet/')
    expect(addrUrl).toContain('/testnet/')
  })
})

describe('isStellarAddress', () => {
  // Canonical Stellar addresses are uppercase base32: G or C + 55 chars [A-Z0-9]
  const validG = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3MQAXRWUDX'
  const validC = 'CA7QYNF7SOWQ3GLR2BGMZEHXR73EWBMGM7OPKJNNOHHEJLBSXMZPQNUD'

  it('returns true for a canonical G-prefixed account address', () => {
    expect(isStellarAddress(validG)).toBe(true)
  })

  it('returns true for a canonical C-prefixed contract address', () => {
    expect(isStellarAddress(validC)).toBe(true)
  })

  it('returns false for a lowercased Stellar address', () => {
    expect(isStellarAddress(validG.toLowerCase())).toBe(false)
  })

  it('returns false for an Ethereum-style hex address', () => {
    expect(isStellarAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(false)
  })

  it('returns false for an address that is too short', () => {
    expect(isStellarAddress('GABC')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isStellarAddress('')).toBe(false)
  })
})
