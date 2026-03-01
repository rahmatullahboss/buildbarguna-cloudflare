import { describe, it, expect } from 'vitest'

/**
 * Withdrawal Business Logic Unit Tests
 *
 * These test the pure business rules for withdrawal validation.
 * No D1 or Cloudflare bindings needed — pure functions only.
 *
 * The getAvailableBalance and validation logic is extracted here
 * as pure functions for testability.
 */

// ─── Pure business logic (extracted from withdrawals.ts) ─────────────────────

type AvailableBalance = {
  total_earned_paisa: number
  total_withdrawn_paisa: number
  pending_paisa: number
  available_paisa: number
}

type WithdrawalSettings = {
  min_paisa: number
  max_paisa: number
  cooldown_days: number
}

/** Pure function: compute available balance */
function computeAvailableBalance(
  totalEarned: number,
  totalWithdrawn: number,
  pendingReserved: number
): AvailableBalance {
  return {
    total_earned_paisa: totalEarned,
    total_withdrawn_paisa: totalWithdrawn,
    pending_paisa: pendingReserved,
    available_paisa: totalEarned - totalWithdrawn - pendingReserved
  }
}

/** Pure function: validate withdrawal request */
function validateWithdrawalRequest(
  amountPaisa: number,
  bkashNumber: string,
  balance: AvailableBalance,
  settings: WithdrawalSettings
): { valid: true } | { valid: false; error: string } {
  if (amountPaisa < settings.min_paisa) {
    return { valid: false, error: `সর্বনিম্ন উত্তোলনের পরিমাণ ৳${settings.min_paisa / 100}` }
  }
  if (amountPaisa > settings.max_paisa) {
    return { valid: false, error: `সর্বোচ্চ উত্তোলনের পরিমাণ ৳${settings.max_paisa / 100}` }
  }
  if (amountPaisa > balance.available_paisa) {
    return { valid: false, error: `অপর্যাপ্ত ব্যালেন্স। উপলব্ধ: ৳${(balance.available_paisa / 100).toFixed(2)}` }
  }
  if (!/^01[3-9]\d{8}$/.test(bkashNumber)) {
    return { valid: false, error: 'সঠিক bKash নম্বর দিন (01XXXXXXXXX)' }
  }
  return { valid: true }
}

const defaultSettings: WithdrawalSettings = {
  min_paisa: 10000,    // ৳100
  max_paisa: 500000,   // ৳5,000
  cooldown_days: 7
}

// ─── Available Balance Computation ───────────────────────────────────────────

describe('computeAvailableBalance', () => {
  it('available = earned - withdrawn - pending', () => {
    const balance = computeAvailableBalance(100_000, 30_000, 20_000)
    expect(balance.available_paisa).toBe(50_000)
  })

  it('available is zero when fully reserved', () => {
    const balance = computeAvailableBalance(100_000, 60_000, 40_000)
    expect(balance.available_paisa).toBe(0)
  })

  it('available can be zero when nothing earned', () => {
    const balance = computeAvailableBalance(0, 0, 0)
    expect(balance.available_paisa).toBe(0)
  })

  it('pending reduces available even before completion', () => {
    // This is the anti-overdraft mechanism — pending is RESERVED
    const withPending = computeAvailableBalance(100_000, 0, 50_000)
    const withoutPending = computeAvailableBalance(100_000, 0, 0)
    expect(withPending.available_paisa).toBeLessThan(withoutPending.available_paisa)
    expect(withPending.available_paisa).toBe(50_000)
  })

  it('returns correct totals', () => {
    const balance = computeAvailableBalance(100_000, 30_000, 20_000)
    expect(balance.total_earned_paisa).toBe(100_000)
    expect(balance.total_withdrawn_paisa).toBe(30_000)
    expect(balance.pending_paisa).toBe(20_000)
  })
})

// ─── Withdrawal Validation ────────────────────────────────────────────────────

describe('validateWithdrawalRequest — amount validation', () => {
  const balance = computeAvailableBalance(1_000_000, 0, 0)  // ৳10,000 available

  it('accepts valid amount within limits', () => {
    const result = validateWithdrawalRequest(50_000, '01712345678', balance, defaultSettings)
    expect(result.valid).toBe(true)
  })

  it('rejects amount below minimum', () => {
    const result = validateWithdrawalRequest(5_000, '01712345678', balance, defaultSettings)
    expect(result.valid).toBe(false)
    expect(result).toHaveProperty('error')
    expect((result as any).error).toContain('সর্বনিম্ন')
  })

  it('rejects amount equal to zero', () => {
    const result = validateWithdrawalRequest(0, '01712345678', balance, defaultSettings)
    expect(result.valid).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = validateWithdrawalRequest(-10_000, '01712345678', balance, defaultSettings)
    expect(result.valid).toBe(false)
  })

  it('rejects amount above maximum', () => {
    const result = validateWithdrawalRequest(600_000, '01712345678', balance, defaultSettings)
    expect(result.valid).toBe(false)
    expect((result as any).error).toContain('সর্বোচ্চ')
  })

  it('accepts amount exactly at minimum', () => {
    const result = validateWithdrawalRequest(10_000, '01712345678', balance, defaultSettings)
    expect(result.valid).toBe(true)
  })

  it('accepts amount exactly at maximum', () => {
    const result = validateWithdrawalRequest(500_000, '01712345678', balance, defaultSettings)
    expect(result.valid).toBe(true)
  })

  it('rejects amount exceeding available balance', () => {
    const lowBalance = computeAvailableBalance(20_000, 0, 0)  // only ৳200 available
    const result = validateWithdrawalRequest(50_000, '01712345678', lowBalance, defaultSettings)
    expect(result.valid).toBe(false)
    expect((result as any).error).toContain('অপর্যাপ্ত')
  })

  it('rejects when pending reservation makes balance insufficient', () => {
    // Earned ৳5,000 but ৳4,000 is pending → only ৳1,000 available
    const balance = computeAvailableBalance(500_000, 0, 400_000)
    const result = validateWithdrawalRequest(200_000, '01712345678', balance, defaultSettings)
    expect(result.valid).toBe(false)
    expect((result as any).error).toContain('অপর্যাপ্ত')
  })
})

describe('validateWithdrawalRequest — bKash number validation', () => {
  const balance = computeAvailableBalance(1_000_000, 0, 0)

  it('accepts valid Bangladeshi numbers — 013x', () => {
    expect(validateWithdrawalRequest(50_000, '01312345678', balance, defaultSettings).valid).toBe(true)
  })

  it('accepts valid Bangladeshi numbers — 017x', () => {
    expect(validateWithdrawalRequest(50_000, '01712345678', balance, defaultSettings).valid).toBe(true)
  })

  it('accepts valid Bangladeshi numbers — 019x', () => {
    expect(validateWithdrawalRequest(50_000, '01912345678', balance, defaultSettings).valid).toBe(true)
  })

  it('rejects 010x — not a valid Bangladeshi prefix', () => {
    const result = validateWithdrawalRequest(50_000, '01012345678', balance, defaultSettings)
    expect(result.valid).toBe(false)
  })

  it('rejects 011x — not a valid Bangladeshi prefix', () => {
    const result = validateWithdrawalRequest(50_000, '01112345678', balance, defaultSettings)
    expect(result.valid).toBe(false)
  })

  it('rejects 012x — not a valid Bangladeshi prefix', () => {
    const result = validateWithdrawalRequest(50_000, '01212345678', balance, defaultSettings)
    expect(result.valid).toBe(false)
  })

  it('rejects too short number', () => {
    const result = validateWithdrawalRequest(50_000, '0171234567', balance, defaultSettings)
    expect(result.valid).toBe(false)
  })

  it('rejects too long number', () => {
    const result = validateWithdrawalRequest(50_000, '017123456789', balance, defaultSettings)
    expect(result.valid).toBe(false)
  })

  it('rejects non-numeric characters', () => {
    const result = validateWithdrawalRequest(50_000, '0171234567X', balance, defaultSettings)
    expect(result.valid).toBe(false)
  })

  it('rejects empty string', () => {
    const result = validateWithdrawalRequest(50_000, '', balance, defaultSettings)
    expect(result.valid).toBe(false)
  })
})

// ─── Anti-overdraft: the critical financial safety property ───────────────────

describe('Anti-overdraft Safety', () => {
  it('CRITICAL: cannot withdraw more than available even with pending', () => {
    // User earned ৳1,000, has ৳600 pending, ৳200 withdrawn
    // Available = 1000 - 600 - 200 = ৳200
    const balance = computeAvailableBalance(100_000, 20_000, 60_000)
    expect(balance.available_paisa).toBe(20_000)  // only ৳200

    // Trying to withdraw ৳500 must fail
    const result = validateWithdrawalRequest(50_000, '01712345678', balance, defaultSettings)
    // Fails because 50,000 < min_paisa (10,000) is actually OK for amount
    // but 50,000 > available (20,000) → fails on balance check
    // Wait: 50,000 > available (20,000) → balance check fails
    expect(result.valid).toBe(false)
  })

  it('CRITICAL: zero available balance always rejects', () => {
    const balance = computeAvailableBalance(50_000, 30_000, 20_000)
    expect(balance.available_paisa).toBe(0)
    const result = validateWithdrawalRequest(10_000, '01712345678', balance, defaultSettings)
    expect(result.valid).toBe(false)
  })

  it('CRITICAL: negative available (over-reserved) always rejects', () => {
    // Edge case: if somehow pending > earned (should not happen but be safe)
    const balance = computeAvailableBalance(10_000, 0, 20_000)
    expect(balance.available_paisa).toBe(-10_000)
    const result = validateWithdrawalRequest(10_000, '01712345678', balance, defaultSettings)
    expect(result.valid).toBe(false)
  })
})

// ─── Settings configurability ─────────────────────────────────────────────────

describe('Configurable Settings', () => {
  it('custom min_paisa is enforced', () => {
    const customSettings = { ...defaultSettings, min_paisa: 50_000 }  // ৳500 min
    const balance = computeAvailableBalance(1_000_000, 0, 0)
    // ৳200 should fail with ৳500 minimum
    expect(validateWithdrawalRequest(20_000, '01712345678', balance, customSettings).valid).toBe(false)
    // ৳500 should pass
    expect(validateWithdrawalRequest(50_000, '01712345678', balance, customSettings).valid).toBe(true)
  })

  it('custom max_paisa is enforced', () => {
    const customSettings = { ...defaultSettings, max_paisa: 100_000 }  // ৳1,000 max
    const balance = computeAvailableBalance(10_000_000, 0, 0)
    // ৳2,000 should fail with ৳1,000 maximum
    expect(validateWithdrawalRequest(200_000, '01712345678', balance, customSettings).valid).toBe(false)
    // ৳1,000 exactly should pass
    expect(validateWithdrawalRequest(100_000, '01712345678', balance, customSettings).valid).toBe(true)
  })
})
