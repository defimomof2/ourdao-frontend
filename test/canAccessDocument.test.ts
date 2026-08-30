import { describe, expect, it } from 'vitest'
import { canAccessDocument, type DocumentMetadata } from '@/lib/ipfs'

// A canonical Stellar G-address (56 uppercase chars).
const ALICE = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3MQAXRWUD'
const BOB = 'GBFZFQQ2XGKEH6EIT3KXBZPXJM7JMBQGQDLN4OTZU5GGQTQCWP3V3QY'

function makeDoc(
  overrides: Partial<DocumentMetadata['permissions']> = {}
): DocumentMetadata {
  return {
    name: 'test.pdf',
    type: 'application/pdf',
    size: 1024,
    uploadedAt: new Date(),
    encrypted: false,
    hash: 'QmTestHash',
    permissions: { public: false, ...overrides },
  }
}

describe('canAccessDocument', () => {
  it('grants access to a public document regardless of address', () => {
    const doc = makeDoc({ public: true })
    expect(canAccessDocument(doc, BOB)).toBe(true)
    expect(canAccessDocument(doc, '')).toBe(true)
  })

  it('grants access when the user address is in allowedUsers (canonical uppercase)', () => {
    const doc = makeDoc({ allowedUsers: [ALICE] })
    expect(canAccessDocument(doc, ALICE)).toBe(true)
  })

  it('denies access when the user address is NOT in allowedUsers', () => {
    const doc = makeDoc({ allowedUsers: [ALICE] })
    expect(canAccessDocument(doc, BOB)).toBe(false)
  })

  it('denies access when the needle is a lowercased version of the stored address', () => {
    // This is the regression test for issue #60: .toLowerCase() on a Stellar
    // address must not be used — lowercased needle can never match stored
    // canonical uppercase entry.
    const doc = makeDoc({ allowedUsers: [ALICE] })
    expect(canAccessDocument(doc, ALICE.toLowerCase())).toBe(false)
  })

  it('grants access via role when user holds an allowedRole', () => {
    const doc = makeDoc({ allowedRoles: ['admin', 'member'] })
    expect(canAccessDocument(doc, BOB, ['member'])).toBe(true)
  })

  it('denies access when user has no matching role and is not allowlisted', () => {
    const doc = makeDoc({ allowedRoles: ['admin'] })
    expect(canAccessDocument(doc, BOB, ['member'])).toBe(false)
  })

  it('denies access when permissions object is absent', () => {
    const doc: DocumentMetadata = {
      name: 'test.pdf',
      type: 'application/pdf',
      size: 1024,
      uploadedAt: new Date(),
      encrypted: false,
      hash: 'QmTestHash',
    }
    expect(canAccessDocument(doc, ALICE)).toBe(false)
  })
})
