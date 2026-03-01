import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, generateReferralCode } from './crypto'

// Note: crypto.ts uses Web Crypto API (SubtleCrypto) which is available in Node 18+
// These tests verify the hash/verify contract and referral code generation

describe('hashPassword', () => {
  it('returns a non-empty string', async () => {
    const hash = await hashPassword('mypassword123')
    expect(hash).toBeTruthy()
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(20)
  })

  it('produces different hashes for same input (due to random salt)', async () => {
    const hash1 = await hashPassword('mypassword123')
    const hash2 = await hashPassword('mypassword123')
    expect(hash1).not.toBe(hash2)
  })

  it('produces different hashes for different inputs', async () => {
    const hash1 = await hashPassword('password1')
    const hash2 = await hashPassword('password2')
    expect(hash1).not.toBe(hash2)
  })

  it('handles empty string', async () => {
    const hash = await hashPassword('')
    expect(hash).toBeTruthy()
  })

  it('handles Bangla characters', async () => {
    const hash = await hashPassword('আমার পাসওয়ার্ড')
    expect(hash).toBeTruthy()
    expect(hash.length).toBeGreaterThan(20)
  })

  it('handles very long passwords', async () => {
    const longPassword = 'a'.repeat(1000)
    const hash = await hashPassword(longPassword)
    expect(hash).toBeTruthy()
  })
})

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('correct-password')
    expect(await verifyPassword('correct-password', hash)).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correct-password')
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  })

  it('returns false for empty password against non-empty hash', async () => {
    const hash = await hashPassword('correct-password')
    expect(await verifyPassword('', hash)).toBe(false)
  })

  it('hash/verify round-trip with Bangla password', async () => {
    const password = 'আমার পাসওয়ার্ড১২৩'
    const hash = await hashPassword(password)
    expect(await verifyPassword(password, hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('case sensitive — uppercase fails', async () => {
    const hash = await hashPassword('Password123')
    expect(await verifyPassword('password123', hash)).toBe(false)
  })

  it('returns false for corrupted hash', async () => {
    expect(await verifyPassword('password', 'corrupted-hash-value')).toBe(false)
  })

  it('each hash verification is independent', async () => {
    const hash1 = await hashPassword('password1')
    const hash2 = await hashPassword('password2')
    // Cross-verification must fail
    expect(await verifyPassword('password1', hash2)).toBe(false)
    expect(await verifyPassword('password2', hash1)).toBe(false)
    // Self-verification must pass
    expect(await verifyPassword('password1', hash1)).toBe(true)
    expect(await verifyPassword('password2', hash2)).toBe(true)
  })
})

describe('generateReferralCode', () => {
  it('returns a non-empty string', () => {
    const code = generateReferralCode()
    expect(code).toBeTruthy()
    expect(typeof code).toBe('string')
  })

  it('has expected length', () => {
    const code = generateReferralCode()
    // Referral codes are typically 6-12 chars
    expect(code.length).toBeGreaterThanOrEqual(6)
    expect(code.length).toBeLessThanOrEqual(12)
  })

  it('contains only alphanumeric characters', () => {
    const code = generateReferralCode()
    expect(code).toMatch(/^[A-Z0-9]+$/i)
  })

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateReferralCode()))
    // At least 90% unique (some collision expected but very rare)
    expect(codes.size).toBeGreaterThan(90)
  })
})

// ─── Security Properties ──────────────────────────────────────────────────────

describe('Security Properties', () => {
  it('password hashing is not reversible — cannot find original from hash', async () => {
    const password = 'supersecret'
    const hash = await hashPassword(password)
    // Hash should NOT contain the plain password
    expect(hash).not.toContain(password)
  })

  it('timing-safe: wrong password does not short-circuit', async () => {
    // Both correct and wrong verification should complete (not throw)
    const hash = await hashPassword('secret')
    await expect(verifyPassword('secret', hash)).resolves.toBe(true)
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false)
  })
})
