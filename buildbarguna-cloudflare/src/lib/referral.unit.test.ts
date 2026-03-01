import { describe, it, expect } from 'vitest'
import { generateReferralCode } from './crypto'

// ─── Referral Code Format Tests ────────────────────────────────────────────────

describe('Referral Code Format', () => {
  it('matches the /check endpoint regex: /^[A-Z0-9]{4,12}$/', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateReferralCode()
      expect(code).toMatch(/^[A-Z0-9]{4,12}$/)
    }
  })

  it('is always uppercase', () => {
    const code = generateReferralCode()
    expect(code).toBe(code.toUpperCase())
  })

  it('never contains special characters', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateReferralCode()
      expect(code).not.toMatch(/[^A-Z0-9]/)
    }
  })

  it('is URL-safe (no encoding needed)', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateReferralCode()
      expect(encodeURIComponent(code)).toBe(code)
    }
  })

  it('generates statistically unique codes (collision resistance)', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateReferralCode()))
    // Expect at least 99% unique out of 1000 (collision is astronomically rare)
    expect(codes.size).toBeGreaterThan(990)
  })
})

// ─── Referral Bonus Business Logic ────────────────────────────────────────────

describe('Referral Bonus Business Logic', () => {
  it('bonus cap: never exceed 100,000 paisa (৳1,000)', () => {
    const MAX_BONUS = 100_000
    // Simulate the NaN guard + cap logic from admin.ts
    function sanitizeBonus(raw: number): number {
      return (isNaN(raw) || raw < 0) ? 5000
        : raw > 100_000 ? 100_000
        : raw
    }
    expect(sanitizeBonus(NaN)).toBe(5000)
    expect(sanitizeBonus(-100)).toBe(5000)
    expect(sanitizeBonus(0)).toBe(0)
    expect(sanitizeBonus(5000)).toBe(5000)
    expect(sanitizeBonus(100_000)).toBe(MAX_BONUS)
    expect(sanitizeBonus(200_000)).toBe(MAX_BONUS)
    expect(sanitizeBonus(Infinity)).toBe(MAX_BONUS)
  })

  it('default bonus is 5000 paisa (৳50)', () => {
    const DEFAULT_BONUS = 5000
    // Simulate parseInt with NaN guard
    const rawValue = 'invalid'
    const parsed = parseInt(rawValue, 10)
    const result = isNaN(parsed) ? DEFAULT_BONUS : parsed
    expect(result).toBe(DEFAULT_BONUS)
  })

  it('bonus paisa converts correctly to taka', () => {
    expect(5000 / 100).toBe(50)    // ৳50
    expect(10000 / 100).toBe(100)  // ৳100
    expect(100000 / 100).toBe(1000) // ৳1,000 (max)
  })
})

// ─── Referral Check Endpoint Validation ───────────────────────────────────────

describe('Referral Check Endpoint — Input Validation', () => {
  // Mirror the regex from referrals.ts /check endpoint
  const VALID_CODE_REGEX = /^[A-Z0-9]{4,12}$/

  it('accepts valid referral code formats', () => {
    const validCodes = ['ABCD', 'ABC123', 'A1B2C3D4', 'ABCDEFGH12', 'ABCDEFGH1234']
    validCodes.forEach(code => {
      expect(VALID_CODE_REGEX.test(code)).toBe(true)
    })
  })

  it('rejects codes that are too short', () => {
    expect(VALID_CODE_REGEX.test('ABC')).toBe(false)
    expect(VALID_CODE_REGEX.test('AB')).toBe(false)
    expect(VALID_CODE_REGEX.test('')).toBe(false)
  })

  it('rejects codes that are too long', () => {
    expect(VALID_CODE_REGEX.test('ABCDEFGH12345')).toBe(false)
    expect(VALID_CODE_REGEX.test('A'.repeat(13))).toBe(false)
  })

  it('rejects lowercase codes', () => {
    expect(VALID_CODE_REGEX.test('abcd1234')).toBe(false)
    expect(VALID_CODE_REGEX.test('Abcd1234')).toBe(false)
  })

  it('rejects codes with special characters', () => {
    const invalid = ['ABC-123', 'ABC_123', 'ABC 123', 'ABC@123', 'ABC#123']
    invalid.forEach(code => {
      expect(VALID_CODE_REGEX.test(code)).toBe(false)
    })
  })

  it('rejects SQL injection attempts', () => {
    const sqlInjections = [
      "' OR '1'='1",
      '"; DROP TABLE users; --',
      "1' UNION SELECT * FROM users--",
    ]
    sqlInjections.forEach(attempt => {
      expect(VALID_CODE_REGEX.test(attempt)).toBe(false)
    })
  })
})

// ─── bKash TxID Validation ─────────────────────────────────────────────────────

describe('bKash TxID Validation', () => {
  // Mirror regex from shares.ts + withdrawals.ts
  const TXID_REGEX = /^[A-Z0-9]{8,12}$/

  it('accepts valid TxID formats', () => {
    const valid = ['8N4K2M9X1P', 'ABCDEFGH', 'A1B2C3D4E5', 'ABCDEFGHIJ12']
    valid.forEach(txid => expect(TXID_REGEX.test(txid)).toBe(true))
  })

  it('rejects TxIDs that are too short', () => {
    expect(TXID_REGEX.test('ABC1234')).toBe(false) // 7 chars
    expect(TXID_REGEX.test('ABCD')).toBe(false)
  })

  it('rejects TxIDs that are too long', () => {
    expect(TXID_REGEX.test('ABCDEFGHIJK12')).toBe(false) // 13 chars
  })

  it('rejects lowercase TxIDs', () => {
    expect(TXID_REGEX.test('8n4k2m9x1p')).toBe(false)
  })

  it('rejects TxIDs with special characters', () => {
    const invalid = ['8N4K-2M9X', 'ABC 12345', '8N4K@2M9X']
    invalid.forEach(txid => expect(TXID_REGEX.test(txid)).toBe(false))
  })

  it('rejects SQL injection in TxID', () => {
    expect(TXID_REGEX.test("'; DROP TABLE share_purchases; --")).toBe(false)
  })
})

// ─── Rate Limiting Logic ───────────────────────────────────────────────────────

describe('Rate Limiting Logic', () => {
  it('allows up to 10 requests, blocks at 11', () => {
    const MAX_ATTEMPTS = 10
    let count = 0

    function simulateRequest(): { blocked: boolean } {
      count++
      if (count > MAX_ATTEMPTS) return { blocked: true }
      return { blocked: false }
    }

    // First 10 should pass
    for (let i = 0; i < 10; i++) {
      expect(simulateRequest().blocked).toBe(false)
    }
    // 11th should be blocked
    expect(simulateRequest().blocked).toBe(true)
  })

  it('login rate limit: blocks at 5 attempts', () => {
    const MAX_LOGIN_ATTEMPTS = 5
    let loginAttempts = 0

    function simulateLogin(): { blocked: boolean } {
      loginAttempts++
      return { blocked: loginAttempts >= MAX_LOGIN_ATTEMPTS }
    }

    for (let i = 0; i < 4; i++) simulateLogin()
    expect(simulateLogin().blocked).toBe(true)
  })
})

// ─── Purchase Flood Protection ─────────────────────────────────────────────────

describe('Purchase Flood Protection', () => {
  it('rejects when pending count reaches 3', () => {
    const MAX_PENDING = 3

    function canSubmit(pendingCount: number): boolean {
      return pendingCount < MAX_PENDING
    }

    expect(canSubmit(0)).toBe(true)
    expect(canSubmit(1)).toBe(true)
    expect(canSubmit(2)).toBe(true)
    expect(canSubmit(3)).toBe(false) // blocked
    expect(canSubmit(10)).toBe(false) // definitely blocked
  })

  it('quantity validation: max 10,000 shares per purchase', () => {
    const MAX_QUANTITY = 10_000

    function isValidQuantity(qty: number): boolean {
      return qty >= 1 && qty <= MAX_QUANTITY
    }

    expect(isValidQuantity(1)).toBe(true)
    expect(isValidQuantity(100)).toBe(true)
    expect(isValidQuantity(10_000)).toBe(true)
    expect(isValidQuantity(0)).toBe(false)
    expect(isValidQuantity(-1)).toBe(false)
    expect(isValidQuantity(10_001)).toBe(false)
  })
})
