import { describe, expect, it } from 'vitest'
import {
  buildProfitDistributionSummary,
  normalizeCompanySharePct,
  resolveEffectiveCompanySharePct
} from './profit-distribution'

describe('profit distribution business logic', () => {
  it('uses project default share when no query percentage is provided', () => {
    expect(resolveEffectiveCompanySharePct(undefined, 4500)).toBe(45)
  })

  it('falls back to 30 percent when project default is unavailable', () => {
    expect(resolveEffectiveCompanySharePct(undefined, undefined)).toBe(30)
  })

  it('clamps available profit to zero when project is in loss or already fully distributed', () => {
    const summary = buildProfitDistributionSummary({
      totalRevenue: 100_000,
      directExpense: 120_000,
      companyExpenseAllocation: 10_000,
      previouslyDistributed: 5_000
    }, 30)

    expect(summary.netProfit).toBe(-30_000)
    expect(summary.availableProfit).toBe(0)
    expect(summary.companyShareAmount).toBe(0)
    expect(summary.investorPool).toBe(0)
  })

  it('splits available profit between company and investors', () => {
    const summary = buildProfitDistributionSummary({
      totalRevenue: 1_000_000,
      directExpense: 200_000,
      companyExpenseAllocation: 0,
      previouslyDistributed: 0
    }, 30)

    expect(summary.availableProfit).toBe(800_000)
    expect(summary.companyShareAmount).toBe(240_000)
    expect(summary.investorPool).toBe(560_000)
  })

  it('normalizes invalid percentages into a safe 0-100 range', () => {
    expect(normalizeCompanySharePct(-5)).toBe(0)
    expect(normalizeCompanySharePct(140)).toBe(100)
  })
})
