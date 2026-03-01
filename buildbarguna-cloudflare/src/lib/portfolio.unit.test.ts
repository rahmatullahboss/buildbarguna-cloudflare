import { describe, it, expect } from 'vitest'
import {
  calcEarningBySharePrice, calcInvestmentValue,
  calcROI, calcAnnualizedROI, calcConcentrationRisk, calcWeight
} from './money'

/**
 * Portfolio Calculation Unit Tests
 *
 * Tests the complete portfolio summary calculations as they would be
 * assembled in the /api/earnings/portfolio endpoint.
 * Pure math — no D1 bindings needed.
 */

// ─── Test Data Factories ──────────────────────────────────────────────────────

type ProjectPosition = {
  project_id: number
  share_price: number       // paisa per share
  shares_owned: number
  latest_rate_bps: number
  total_earned_paisa: number
  months_active: number
}

function buildPortfolio(positions: ProjectPosition[]) {
  let totalInvested = 0
  let totalEarned = 0
  let largestPosition = 0

  const items = positions.map(pos => {
    const investmentValue = calcInvestmentValue(pos.shares_owned, pos.share_price)
    const expectedThisMonth = calcEarningBySharePrice(pos.shares_owned, pos.share_price, pos.latest_rate_bps)

    totalInvested += investmentValue
    totalEarned += pos.total_earned_paisa
    if (investmentValue > largestPosition) largestPosition = investmentValue

    return { ...pos, investmentValue, expectedThisMonth }
  })

  // Compute weights
  const withWeights = items.map(item => ({
    ...item,
    weight_percent: calcWeight(item.investmentValue, totalInvested),
    roi_percent: calcROI(item.total_earned_paisa, item.investmentValue)
  }))

  const overallROI = calcROI(totalEarned, totalInvested)
  const maxMonths = positions.length > 0 ? Math.max(...positions.map(p => p.months_active)) : 0

  return {
    total_invested_paisa: totalInvested,
    total_earned_paisa: totalEarned,
    roi_percent: overallROI,
    annualized_roi_percent: calcAnnualizedROI(overallROI, maxMonths),
    concentration_risk_percent: calcConcentrationRisk(largestPosition, totalInvested),
    expected_this_month_paisa: items.reduce((s, i) => s + i.expectedThisMonth, 0),
    projects_count: positions.length,
    projects: withWeights
  }
}

// ─── Single Project Portfolio ─────────────────────────────────────────────────

describe('Single project portfolio', () => {
  const singleProject: ProjectPosition = {
    project_id: 1,
    share_price: 100_000,    // ৳1,000 per share
    shares_owned: 10,
    latest_rate_bps: 500,    // 5%
    total_earned_paisa: 50_000,  // ৳500 earned
    months_active: 1
  }

  it('calculates total invested correctly', () => {
    const portfolio = buildPortfolio([singleProject])
    // 10 shares × ৳1,000 = ৳10,000
    expect(portfolio.total_invested_paisa).toBe(1_000_000)
  })

  it('calculates expected this month correctly', () => {
    const portfolio = buildPortfolio([singleProject])
    // 10 × 100,000 × 500 / 10,000 = 50,000 paisa = ৳500
    expect(portfolio.expected_this_month_paisa).toBe(50_000)
  })

  it('single project has 100% concentration risk', () => {
    const portfolio = buildPortfolio([singleProject])
    expect(portfolio.concentration_risk_percent).toBe(100)
  })

  it('single project has 100% weight', () => {
    const portfolio = buildPortfolio([singleProject])
    expect(portfolio.projects[0].weight_percent).toBe(100)
  })

  it('ROI calculated correctly', () => {
    const portfolio = buildPortfolio([singleProject])
    // 50,000 / 1,000,000 = 5%
    expect(portfolio.roi_percent).toBe(5)
  })

  it('annualized ROI for 1 month = ROI × 12', () => {
    const portfolio = buildPortfolio([singleProject])
    // 5% over 1 month → 60% annualized
    expect(portfolio.annualized_roi_percent).toBe(60)
  })
})

// ─── Multi-Project Portfolio ──────────────────────────────────────────────────

describe('Multi-project portfolio', () => {
  const positions: ProjectPosition[] = [
    {
      project_id: 1,
      share_price: 100_000,    // ৳1,000 per share
      shares_owned: 60,        // invested ৳60,000 = 60% of portfolio
      latest_rate_bps: 500,
      total_earned_paisa: 150_000,
      months_active: 6
    },
    {
      project_id: 2,
      share_price: 100_000,
      shares_owned: 30,        // invested ৳30,000 = 30% of portfolio
      latest_rate_bps: 300,
      total_earned_paisa: 50_000,
      months_active: 3
    },
    {
      project_id: 3,
      share_price: 100_000,
      shares_owned: 10,        // invested ৳10,000 = 10% of portfolio
      latest_rate_bps: 800,
      total_earned_paisa: 20_000,
      months_active: 2
    }
  ]

  it('total invested = sum of all positions', () => {
    const portfolio = buildPortfolio(positions)
    // (60 + 30 + 10) × 100,000 = 10,000,000 paisa = ৳100,000
    expect(portfolio.total_invested_paisa).toBe(10_000_000)
  })

  it('total earned = sum of all earnings', () => {
    const portfolio = buildPortfolio(positions)
    expect(portfolio.total_earned_paisa).toBe(220_000)
  })

  it('weights sum to 100%', () => {
    const portfolio = buildPortfolio(positions)
    const totalWeight = portfolio.projects.reduce((s, p) => s + p.weight_percent, 0)
    expect(totalWeight).toBeCloseTo(100, 1)
  })

  it('weights are proportional to investment', () => {
    const portfolio = buildPortfolio(positions)
    expect(portfolio.projects[0].weight_percent).toBe(60)
    expect(portfolio.projects[1].weight_percent).toBe(30)
    expect(portfolio.projects[2].weight_percent).toBe(10)
  })

  it('concentration risk = largest position %', () => {
    const portfolio = buildPortfolio(positions)
    // Largest position is 60% of portfolio
    expect(portfolio.concentration_risk_percent).toBe(60)
  })

  it('concentration risk > 50% flags high risk', () => {
    const portfolio = buildPortfolio(positions)
    expect(portfolio.concentration_risk_percent).toBeGreaterThan(50)
  })

  it('expected this month = sum of all project expectations', () => {
    const portfolio = buildPortfolio(positions)
    // P1: 60 × 100,000 × 500/10,000 = 300,000
    // P2: 30 × 100,000 × 300/10,000 = 90,000
    // P3: 10 × 100,000 × 800/10,000 = 80,000
    // Total = 470,000 paisa
    expect(portfolio.expected_this_month_paisa).toBe(470_000)
  })

  it('projects_count is correct', () => {
    const portfolio = buildPortfolio(positions)
    expect(portfolio.projects_count).toBe(3)
  })

  it('uses max months_active for annualized ROI', () => {
    const portfolio = buildPortfolio(positions)
    // max months_active = 6
    // overall ROI = 220,000 / 10,000,000 = 2.2%
    // annualized = (2.2 / 6) × 12 = 4.4%
    expect(portfolio.annualized_roi_percent).toBe(4.4)
  })

  it('per-project ROI is correct', () => {
    const portfolio = buildPortfolio(positions)
    // P1: 150,000 / 6,000,000 = 2.5%
    expect(portfolio.projects[0].roi_percent).toBe(2.5)
    // P2: 50,000 / 3,000,000 = 1.67%
    expect(portfolio.projects[1].roi_percent).toBe(1.67)
    // P3: 20,000 / 1,000,000 = 2%
    expect(portfolio.projects[2].roi_percent).toBe(2)
  })
})

// ─── Edge Cases ───────────────────────────────────────────────────────────────

describe('Portfolio edge cases', () => {
  it('empty portfolio returns zeros', () => {
    const portfolio = buildPortfolio([])
    expect(portfolio.total_invested_paisa).toBe(0)
    expect(portfolio.total_earned_paisa).toBe(0)
    expect(portfolio.roi_percent).toBe(0)
    expect(portfolio.projects_count).toBe(0)
    expect(portfolio.concentration_risk_percent).toBe(0)
  })

  it('portfolio with no earnings yet shows 0% ROI', () => {
    const portfolio = buildPortfolio([{
      project_id: 1, share_price: 100_000, shares_owned: 10,
      latest_rate_bps: 0, total_earned_paisa: 0, months_active: 0
    }])
    expect(portfolio.roi_percent).toBe(0)
    expect(portfolio.annualized_roi_percent).toBe(0)
    expect(portfolio.expected_this_month_paisa).toBe(0)
  })

  it('two equal projects → 50% concentration risk → moderate', () => {
    const positions: ProjectPosition[] = [
      { project_id: 1, share_price: 100_000, shares_owned: 10, latest_rate_bps: 500, total_earned_paisa: 10_000, months_active: 1 },
      { project_id: 2, share_price: 100_000, shares_owned: 10, latest_rate_bps: 500, total_earned_paisa: 10_000, months_active: 1 }
    ]
    const portfolio = buildPortfolio(positions)
    expect(portfolio.concentration_risk_percent).toBe(50)
    // Weights should both be 50%
    expect(portfolio.projects[0].weight_percent).toBe(50)
    expect(portfolio.projects[1].weight_percent).toBe(50)
  })

  it('high rate project expected more earnings', () => {
    const lowRate: ProjectPosition = {
      project_id: 1, share_price: 100_000, shares_owned: 10,
      latest_rate_bps: 100, total_earned_paisa: 0, months_active: 0
    }
    const highRate: ProjectPosition = {
      project_id: 2, share_price: 100_000, shares_owned: 10,
      latest_rate_bps: 1000, total_earned_paisa: 0, months_active: 0
    }
    const low = buildPortfolio([lowRate])
    const high = buildPortfolio([highRate])
    expect(high.expected_this_month_paisa).toBeGreaterThan(low.expected_this_month_paisa)
    expect(high.expected_this_month_paisa).toBe(low.expected_this_month_paisa * 10)
  })
})
