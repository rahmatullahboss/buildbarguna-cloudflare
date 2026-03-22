import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { ok, getPagination, paginate } from '../lib/response'
import {
  calcEarningBySharePrice,
  calcInvestmentValue,
  calcROI,
  calcAnnualizedROI,
  calcConcentrationRisk,
  calcWeight,
  toPercent
} from '../lib/money'
import type {
  Bindings,
  Variables,
  PortfolioProjectRow,
  ProjectPortfolioItem,
  ProjectMonthlyEarning,
  PortfolioSummary
} from '../types'

export const earningRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

earningRoutes.use('*', authMiddleware)

// GET /api/earnings/summary — total balance
earningRoutes.get('/summary', async (c) => {
  const userId = c.get('userId')

  const [totalRow, thisMonthRow] = await Promise.all([
    c.env.DB.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM earnings WHERE user_id = ?'
    ).bind(userId).first<{ total: number }>(),
    c.env.DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM earnings
       WHERE user_id = ? AND month = strftime('%Y-%m', 'now')`
    ).bind(userId).first<{ total: number }>()
  ])

  return ok(c, {
    total_paisa: totalRow?.total ?? 0,
    this_month_paisa: thisMonthRow?.total ?? 0
  })
})

// GET /api/earnings/portfolio — full portfolio summary with per-project breakdown
//
// Returns PortfolioSummary: total invested, total earned, ROI, annualized ROI,
// concentration risk, and per-project details with monthly earning history.
earningRoutes.get('/portfolio', async (c) => {
  const userId = c.get('userId')
  const currentMonth = new Date().toISOString().slice(0, 7)  // YYYY-MM
  const lastMonth = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 7)
  })()

  // 1. Fetch all projects user has shares in, with aggregated earnings
  //    Single query using JOIN + GROUP BY — no N+1
  const [projectRows, thisMonthRow, lastMonthRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT
         us.project_id,
         p.title        AS project_title,
         p.status       AS project_status,
         p.share_price,
         us.quantity    AS shares_owned,
         COALESCE(SUM(e.amount), 0)  AS total_earned_paisa,
         COUNT(e.id)                 AS months_active,
         (
           SELECT e2.rate
           FROM earnings e2
           WHERE e2.project_id = us.project_id AND e2.user_id = us.user_id
           ORDER BY e2.month DESC
           LIMIT 1
         ) AS latest_rate_bps
       FROM user_shares us
       JOIN projects p ON p.id = us.project_id
       LEFT JOIN earnings e ON e.project_id = us.project_id AND e.user_id = us.user_id
       WHERE us.user_id = ?
       GROUP BY us.project_id, p.title, p.status, p.share_price, us.quantity
       ORDER BY us.project_id`
    ).bind(userId).all<PortfolioProjectRow>(),

    // This month earnings total
    c.env.DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM earnings WHERE user_id = ? AND month = ?`
    ).bind(userId, currentMonth).first<{ total: number }>(),

    // Last month earnings total
    c.env.DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM earnings WHERE user_id = ? AND month = ?`
    ).bind(userId, lastMonth).first<{ total: number }>(),
  ])

  const rows = projectRows.results

  // 2. Fetch monthly history for each project in a single batch
  // ⚡ Bolt: Replaced Promise.all with db.batch to avoid N+1 per-query HTTP network overhead in D1
  let monthlyHistories: { results: { month: string; rate_bps: number; earned_paisa: number }[] }[] = []
  if (rows.length > 0) {
    const historyStmts = rows.map(row =>
      c.env.DB.prepare(
        `SELECT e.month, e.rate AS rate_bps, e.amount AS earned_paisa
         FROM earnings e
         WHERE e.user_id = ? AND e.project_id = ?
         ORDER BY e.month DESC
         LIMIT 24`
      ).bind(userId, row.project_id) // Do not chain .all() on prepared statements for batch()
    )
    monthlyHistories = await c.env.DB.batch<{ month: string; rate_bps: number; earned_paisa: number }>(historyStmts)
  }

  // 3. Compute portfolio-level totals
  let totalInvestedPaisa = 0
  let totalEarnedPaisa = 0

  const projectItems: ProjectPortfolioItem[] = rows.map((row, i) => {
    const investmentValue = calcInvestmentValue(row.shares_owned, row.share_price)
    const latestRateBps = row.latest_rate_bps ?? 0
    const expectedThisMonth = calcEarningBySharePrice(row.shares_owned, row.share_price, latestRateBps)

    totalInvestedPaisa += investmentValue
    totalEarnedPaisa += row.total_earned_paisa

    const history: ProjectMonthlyEarning[] = monthlyHistories[i].results.map(h => ({
      month: h.month,
      rate_bps: h.rate_bps,
      rate_percent: toPercent(h.rate_bps),
      earned_paisa: h.earned_paisa
    }))

    return {
      project_id: row.project_id,
      project_title: row.project_title,
      project_status: row.project_status as ProjectPortfolioItem['project_status'],
      share_price: row.share_price,
      shares_owned: row.shares_owned,
      investment_value_paisa: investmentValue,
      weight_percent: 0,  // computed below after totals known
      total_earned_paisa: row.total_earned_paisa,
      roi_percent: calcROI(row.total_earned_paisa, investmentValue),
      latest_rate_bps: latestRateBps,
      expected_this_month_paisa: expectedThisMonth,
      months_active: row.months_active,
      monthly_history: history
    }
  })

  // 4. Compute weights and concentration risk now that total is known
  let largestPositionPaisa = 0
  for (const item of projectItems) {
    item.weight_percent = calcWeight(item.investment_value_paisa, totalInvestedPaisa)
    if (item.investment_value_paisa > largestPositionPaisa) {
      largestPositionPaisa = item.investment_value_paisa
    }
  }

  // 5. Portfolio-level metrics
  const overallROI = calcROI(totalEarnedPaisa, totalInvestedPaisa)
  const totalMonthsActive = rows.length > 0
    ? Math.max(...rows.map(r => r.months_active))
    : 0
  const expectedThisMonthTotal = projectItems.reduce(
    (sum, item) => sum + item.expected_this_month_paisa, 0
  )

  const summary: PortfolioSummary = {
    total_invested_paisa: totalInvestedPaisa,
    total_earned_paisa: totalEarnedPaisa,
    this_month_earned_paisa: thisMonthRow?.total ?? 0,
    last_month_earned_paisa: lastMonthRow?.total ?? 0,
    expected_this_month_paisa: expectedThisMonthTotal,
    roi_percent: overallROI,
    annualized_roi_percent: calcAnnualizedROI(overallROI, totalMonthsActive),
    projects_count: rows.length,
    concentration_risk_percent: calcConcentrationRisk(largestPositionPaisa, totalInvestedPaisa),
    projects: projectItems
  }

  return ok(c, summary)
})

// GET /api/earnings — earnings history, paginated
earningRoutes.get('/', async (c) => {
  const { page, limit, offset } = getPagination(c.req.query())
  const userId = c.get('userId')

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT e.*, p.title as project_title
       FROM earnings e
       JOIN projects p ON p.id = e.project_id
       WHERE e.user_id = ?
       ORDER BY e.month DESC, e.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(userId, limit, offset).all(),
    c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM earnings WHERE user_id = ?'
    ).bind(userId).first<{ total: number }>()
  ])

  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})
