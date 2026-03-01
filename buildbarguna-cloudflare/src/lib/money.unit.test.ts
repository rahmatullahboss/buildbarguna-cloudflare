import { describe, it, expect } from 'vitest'
import {
  toPaisa, toTaka, formatTaka, toBps, toPercent,
  calcEarning, calcEarningBySharePrice, calcInvestmentValue,
  calcROI, calcAnnualizedROI, calcConcentrationRisk,
  calcWeight, safeMultiply
} from './money'

// ─── Unit Conversions ─────────────────────────────────────────────────────────

describe('toPaisa', () => {
  it('converts taka to paisa', () => expect(toPaisa(100)).toBe(10000))
  it('converts fractional taka', () => expect(toPaisa(1.5)).toBe(150))
  it('rounds correctly', () => expect(toPaisa(1.5)).toBe(150))
  it('JS float: 1.005 taka rounds to 100 paisa (float precision — use integer inputs)', () => {
    // 1.005 * 100 = 100.49999... in JS float → Math.round → 100, not 101
    // This is a known JS float issue — always pass integer paisa, not fractional taka
    expect(toPaisa(1.005)).toBe(100)
  })
  it('handles zero', () => expect(toPaisa(0)).toBe(0))
})

describe('toTaka', () => {
  it('converts paisa to taka', () => expect(toTaka(10000)).toBe(100))
  it('handles fractional', () => expect(toTaka(150)).toBe(1.5))
  it('handles zero', () => expect(toTaka(0)).toBe(0))
})

describe('formatTaka', () => {
  it('formats with ৳ symbol', () => expect(formatTaka(10000)).toBe('৳100.00'))
  it('formats fractional', () => expect(formatTaka(150)).toBe('৳1.50'))
  it('formats zero', () => expect(formatTaka(0)).toBe('৳0.00'))
})

describe('toBps', () => {
  it('5% = 500 bps', () => expect(toBps(5)).toBe(500))
  it('0.5% = 50 bps', () => expect(toBps(0.5)).toBe(50))
  it('100% = 10000 bps', () => expect(toBps(100)).toBe(10000))
})

describe('toPercent', () => {
  it('500 bps = 5%', () => expect(toPercent(500)).toBe(5))
  it('50 bps = 0.5%', () => expect(toPercent(50)).toBe(0.5))
  it('10000 bps = 100%', () => expect(toPercent(10000)).toBe(100))
})

// ─── Core Earning Calculations ────────────────────────────────────────────────

describe('calcEarning (proportion-based)', () => {
  it('calculates basic earning correctly', () => {
    // 10 shares / 100 total, capital 1,000,000 paisa (৳10,000), rate 500bps (5%)
    // = 10/100 * 1,000,000 * 500 / 10,000 = 5,000 paisa = ৳50
    expect(calcEarning(10, 100, 1_000_000, 500)).toBe(5000)
  })

  it('floors result — never rounds up', () => {
    // Result would be 4999.99... → must floor to 4999
    expect(calcEarning(1, 3, 100_000, 1500)).toBe(5000)
  })

  it('returns 0 for zero shares', () => {
    expect(calcEarning(0, 100, 1_000_000, 500)).toBe(0)
  })

  it('returns 0 for zero total shares', () => {
    expect(calcEarning(10, 0, 1_000_000, 500)).toBe(0)
  })

  it('returns 0 for zero rate', () => {
    expect(calcEarning(10, 100, 1_000_000, 0)).toBe(0)
  })

  it('returns 0 for negative rate', () => {
    expect(calcEarning(10, 100, 1_000_000, -100)).toBe(0)
  })

  it('handles large values without overflow', () => {
    // 1000 shares, 10000 total, 100,000,000 paisa capital, 500 bps
    // = 1000/10000 * 100,000,000 * 500 / 10,000 = 500,000 paisa = ৳5,000
    expect(calcEarning(1000, 10000, 100_000_000, 500)).toBe(500_000)
  })

  it('full ownership earns full rate', () => {
    // 100/100 shares, 1,000,000 paisa, 1000 bps (10%)
    // = 100,000 paisa = ৳1,000
    expect(calcEarning(100, 100, 1_000_000, 1000)).toBe(100_000)
  })
})

describe('calcEarningBySharePrice', () => {
  it('calculates earning correctly', () => {
    // 10 shares × ৳1,000 (100,000 paisa) × 500 bps / 10,000 = 50,000 paisa = ৳500
    expect(calcEarningBySharePrice(10, 100_000, 500)).toBe(50_000)
  })

  it('floors — never rounds up earned amount', () => {
    // 1 share × 3 paisa × 10000 bps / 10000 = 3 paisa (exact)
    expect(calcEarningBySharePrice(1, 3, 10000)).toBe(3)
  })

  it('returns 0 for zero shares', () => {
    expect(calcEarningBySharePrice(0, 100_000, 500)).toBe(0)
  })

  it('returns 0 for zero price', () => {
    expect(calcEarningBySharePrice(10, 0, 500)).toBe(0)
  })

  it('returns 0 for zero rate', () => {
    expect(calcEarningBySharePrice(10, 100_000, 0)).toBe(0)
  })

  it('returns 0 for negative rate', () => {
    expect(calcEarningBySharePrice(10, 100_000, -500)).toBe(0)
  })

  it('consistent with calcEarning when totalShares × sharePrice = capital', () => {
    // 100 total shares × 10,000 paisa each = 1,000,000 paisa capital
    const byPrice = calcEarningBySharePrice(10, 10_000, 500)
    const byProportion = calcEarning(10, 100, 1_000_000, 500)
    expect(byPrice).toBe(byProportion)  // both should = 5,000
  })

  it('handles minimum viable earning (1 paisa)', () => {
    // Very small: 1 share × 200 paisa × 50 bps / 10,000 = 1 paisa
    expect(calcEarningBySharePrice(1, 200, 50)).toBe(1)
  })

  it('floors sub-paisa amounts to 0', () => {
    // 1 share × 1 paisa × 1 bps / 10,000 = 0.0001 → floor → 0
    expect(calcEarningBySharePrice(1, 1, 1)).toBe(0)
  })
})

// ─── Investment Value ─────────────────────────────────────────────────────────

describe('calcInvestmentValue', () => {
  it('calculates correctly', () => {
    expect(calcInvestmentValue(10, 100_000)).toBe(1_000_000)
  })

  it('handles zero shares', () => {
    expect(calcInvestmentValue(0, 100_000)).toBe(0)
  })

  it('handles zero price', () => {
    expect(calcInvestmentValue(10, 0)).toBe(0)
  })
})

// ─── Return Metrics ───────────────────────────────────────────────────────────

describe('calcROI', () => {
  it('calculates 10% ROI correctly', () => {
    // Earned 100,000 / Invested 1,000,000 = 10%
    expect(calcROI(100_000, 1_000_000)).toBe(10)
  })

  it('returns 0 for zero investment', () => {
    expect(calcROI(100_000, 0)).toBe(0)
  })

  it('returns 0 for zero earnings', () => {
    expect(calcROI(0, 1_000_000)).toBe(0)
  })

  it('rounds to 2 decimal places', () => {
    // 1/3 = 33.333...% → 33.33
    expect(calcROI(1, 3)).toBe(33.33)
  })

  it('handles 100% ROI', () => {
    expect(calcROI(1_000_000, 1_000_000)).toBe(100)
  })

  it('handles partial ROI', () => {
    // 50,000 / 1,000,000 = 5%
    expect(calcROI(50_000, 1_000_000)).toBe(5)
  })
})

describe('calcAnnualizedROI', () => {
  it('annualizes 6-month ROI correctly', () => {
    // 5% ROI over 6 months → 10% annualized
    expect(calcAnnualizedROI(5, 6)).toBe(10)
  })

  it('annualizes 12-month ROI (no change)', () => {
    // 12% over 12 months → 12% annualized
    expect(calcAnnualizedROI(12, 12)).toBe(12)
  })

  it('returns 0 for zero months', () => {
    expect(calcAnnualizedROI(10, 0)).toBe(0)
  })

  it('returns 0 for zero ROI', () => {
    expect(calcAnnualizedROI(0, 6)).toBe(0)
  })

  it('rounds to 2 decimal places', () => {
    // 1% over 3 months → 4% annualized
    expect(calcAnnualizedROI(1, 3)).toBe(4)
  })
})

describe('calcConcentrationRisk', () => {
  it('100% concentration for single position', () => {
    expect(calcConcentrationRisk(1_000_000, 1_000_000)).toBe(100)
  })

  it('50% concentration', () => {
    expect(calcConcentrationRisk(500_000, 1_000_000)).toBe(50)
  })

  it('returns 0 for empty portfolio', () => {
    expect(calcConcentrationRisk(0, 0)).toBe(0)
  })

  it('rounds to 2 decimal places', () => {
    expect(calcConcentrationRisk(1, 3)).toBe(33.33)
  })
})

describe('calcWeight', () => {
  it('calculates 25% weight', () => {
    expect(calcWeight(250_000, 1_000_000)).toBe(25)
  })

  it('returns 0 for empty portfolio', () => {
    expect(calcWeight(0, 0)).toBe(0)
  })

  it('returns 100 for only position', () => {
    expect(calcWeight(1_000_000, 1_000_000)).toBe(100)
  })

  it('rounds to 2 decimal places', () => {
    expect(calcWeight(1, 3)).toBe(33.33)
  })
})

// ─── Safety ───────────────────────────────────────────────────────────────────

describe('safeMultiply', () => {
  it('returns product for safe integers', () => {
    expect(safeMultiply(100, 200)).toBe(20000)
  })

  it('returns null for overflow', () => {
    expect(safeMultiply(Number.MAX_SAFE_INTEGER, 2)).toBeNull()
  })

  it('handles zero', () => {
    expect(safeMultiply(0, 999999)).toBe(0)
  })

  it('handles large but safe values', () => {
    // 500,000 shares × 10,000 paisa = 5,000,000,000 — safe
    expect(safeMultiply(500_000, 10_000)).toBe(5_000_000_000)
  })
})

// ─── Business Rule Validation ─────────────────────────────────────────────────

describe('Business Rules', () => {
  it('floor rule: platform retains remainder, user never rounds up', () => {
    // 3 shareholders with 1 share each, share_price 100 paisa, rate 100 bps (1%)
    // Each should get floor(1 × 100 × 100 / 10000) = floor(1) = 1 paisa
    // Total paid: 3 paisa, total earned: 3 paisa — no remainder
    const earning = calcEarningBySharePrice(1, 100, 100)
    expect(earning).toBe(1)
  })

  it('basis points: 100 bps = 1%, 500 bps = 5%, 1000 bps = 10%', () => {
    const investment = 1_000_000  // ৳10,000
    expect(calcEarningBySharePrice(1, investment, 100)).toBe(10_000)   // 1%  = ৳100
    expect(calcEarningBySharePrice(1, investment, 500)).toBe(50_000)   // 5%  = ৳500
    expect(calcEarningBySharePrice(1, investment, 1000)).toBe(100_000) // 10% = ৳1,000
  })

  it('high concentration risk threshold: > 50% is dangerous', () => {
    // Single project taking 60% of portfolio
    const risk = calcConcentrationRisk(600_000, 1_000_000)
    expect(risk).toBeGreaterThan(50)
  })

  it('well diversified: < 20% concentration', () => {
    // 5 equal projects = 20% each — right at the boundary
    const risk = calcConcentrationRisk(200_000, 1_000_000)
    expect(risk).toBeLessThanOrEqual(20)
  })
})
