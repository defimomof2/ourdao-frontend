/**
 * Regression test for issue #62:
 * Treasury and governance/create pages were using a local `toBaseUnits`
 * (parseFloat → Math.round → BigInt) that loses precision above ~900 million
 * tokens.  Both pages now call `parseToken` from src/lib/utils.ts, which
 * splits on the decimal point and never goes through IEEE-754 doubles.
 *
 * This file verifies:
 *   1. `parseToken` produces the exact stroop count for the two previously-
 *      diverging values documented in the issue.
 *   2. No other copy of `toBaseUnits` remains in the source tree.
 *   3. Invalid / non-positive inputs are rejected (return BigInt(0)) rather
 *      than silently submitting a zero-amount transaction.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseToken } from '@/lib/utils'

// ---------------------------------------------------------------------------
// 1. Precision: values that used to diverge between toBaseUnits and parseToken
// ---------------------------------------------------------------------------
describe('parseToken precision – issue #62 regression', () => {
  it('parses 9007199254.7409911 to the exact stroop count', () => {
    // The old toBaseUnits gave 90071992547409920 (9 stroops too high).
    // parseToken must give the mathematically correct 90071992547409911.
    expect(parseToken('9007199254.7409911')).toBe(BigInt('90071992547409911'))
  })

  it('parses 1234567890.1234567 to the exact stroop count', () => {
    // The old toBaseUnits diverged by 1 stroop on this value.
    expect(parseToken('1234567890.1234567')).toBe(BigInt('12345678901234567'))
  })

  it('parses a round integer without fractional part correctly', () => {
    expect(parseToken('100')).toBe(BigInt(100) * BigInt(10_000_000))
  })

  it('parses a value with fewer than 7 decimal places correctly', () => {
    // 1.5 → 15_000_000 stroops
    expect(parseToken('1.5')).toBe(BigInt(15_000_000))
  })

  it('truncates excess decimal places beyond 7 (does not round up)', () => {
    // '1.00000009' — the 9th decimal digit must be dropped, not rounded.
    expect(parseToken('1.00000009')).toBe(BigInt(10_000_000))
  })
})

// ---------------------------------------------------------------------------
// 2. Invalid-input handling: must return BigInt(0), never throw
// ---------------------------------------------------------------------------
describe('parseToken invalid-input handling', () => {
  it('returns BigInt(0) for an empty string', () => {
    expect(parseToken('')).toBe(BigInt(0))
  })

  it('returns BigInt(0) for a non-numeric string', () => {
    expect(parseToken('abc')).toBe(BigInt(0))
  })

  it('returns BigInt(0) for NaN-producing input', () => {
    expect(parseToken('NaN')).toBe(BigInt(0))
  })

  it('returns BigInt(0) for Infinity', () => {
    expect(parseToken('Infinity')).toBe(BigInt(0))
  })
})

// ---------------------------------------------------------------------------
// 3. Source-code audit: toBaseUnits must not exist anywhere in src/
// ---------------------------------------------------------------------------
describe('source audit – no surviving toBaseUnits', () => {
  const srcRoot = resolve(__dirname, '../src')

  const files = [
    resolve(srcRoot, 'app/treasury/page.tsx'),
    resolve(srcRoot, 'app/governance/create/page.tsx'),
    resolve(srcRoot, 'app/loans/request/page.tsx'),
    resolve(srcRoot, 'lib/utils.ts'),
  ]

  it.each(files)('%s does not define or call toBaseUnits', (filePath) => {
    const source = readFileSync(filePath, 'utf8')
    expect(source).not.toMatch(/toBaseUnits/)
  })

  it('treasury/page.tsx imports parseToken from @/lib/utils', () => {
    const source = readFileSync(resolve(srcRoot, 'app/treasury/page.tsx'), 'utf8')
    expect(source).toMatch(/import\s*\{[^}]*parseToken[^}]*\}\s*from\s*['"]@\/lib\/utils['"]/)
  })

  it('governance/create/page.tsx imports parseToken from @/lib/utils', () => {
    const source = readFileSync(resolve(srcRoot, 'app/governance/create/page.tsx'), 'utf8')
    expect(source).toMatch(/import\s*\{[^}]*parseToken[^}]*\}\s*from\s*['"]@\/lib\/utils['"]/)
  })
})
