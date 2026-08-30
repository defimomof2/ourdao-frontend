import { describe, expect, it } from 'vitest'
import { getContractUrl, getTransactionUrl, getAddressUrl } from '@/lib/stellar'

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
