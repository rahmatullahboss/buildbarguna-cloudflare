// ──────────────────────────────────────────────────────────────
// 2. DISTRIBUTE PROFIT (Send to all shareholders)
// ──────────────────────────────────────────────────────────────

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err } from '../lib/response'
import type { Bindings, Variables } from '../types'

const profitRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

profitRoutes.use('*', authMiddleware)
profitRoutes.use('*', adminMiddleware)

const distributeSchema = z.object({
  company_share_percentage: z.number().int().min(0).max(100).default(30),
  period_start: z.string().optional(),
  period_end: z.string().optional()
})

profitRoutes.post('/distribute/:projectId', zValidator('json', distributeSchema), async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const userId = c.get('userId')
  const data = c.req.valid('json')

  // Verify project
  const project = await c.env.DB.prepare(
    'SELECT id, title, share_price FROM projects WHERE id = ?'
  ).bind(projectId).first<{ id: number; title: string; share_price: number }>()

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  // M6 FIX: Duplicate distribution guard — check if same period already distributed
  const periodStart = data.period_start ?? null
  const periodEnd = data.period_end ?? null
  if (periodStart && periodEnd) {
    const existingDist = await c.env.DB.prepare(
      `SELECT id FROM profit_distributions 
       WHERE project_id = ? AND period_start = ? AND period_end = ? AND status = 'distributed'`
    ).bind(projectId, periodStart, periodEnd).first<{ id: number }>()
    
    if (existingDist) {
      return err(c, 'এই সময়ের জন্য ইতিমধ্যে প্রফিট ডিস্ট্রিবিউট করা হয়েছে', 409)
    }
  }

  // Get financials
  const financials = await c.env.DB.prepare(
    `SELECT 
      COALESCE(SUM(CASE WHEN transaction_type = 'revenue' THEN amount ELSE 0 END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
    FROM project_transactions 
    WHERE project_id = ?`
  ).bind(projectId).first<{ total_revenue: number; total_expense: number }>()

  const totalRevenue = financials?.total_revenue ?? 0
  const directExpense = financials?.total_expense ?? 0

  const companyAllocationResult = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total_allocated FROM expense_allocations WHERE project_id = ?`
  ).bind(projectId).first<{ total_allocated: number }>()

  const totalExpense = directExpense + (companyAllocationResult?.total_allocated ?? 0)
  const netProfit = totalRevenue - totalExpense

  const distributed = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(distributable_amount), 0) as total FROM profit_distributions WHERE project_id = ? AND status = 'distributed'`
  ).bind(projectId).first<{ total: number }>()

  const availableProfit = netProfit - (distributed?.total ?? 0)
  if (availableProfit <= 0) return err(c, 'ডিস্ট্রিবিউট করার মতো লাভ নেই!', 400)

  const companyShareAmount = Math.floor((availableProfit * data.company_share_percentage) / 100)
  const investorPool = availableProfit - companyShareAmount

  const shareholders = await c.env.DB.prepare(
    `SELECT user_id, quantity as shares_held FROM user_shares WHERE project_id = ? AND quantity > 0`
  ).bind(projectId).all<{ user_id: number; shares_held: number }>()

  if (shareholders.results.length === 0) return err(c, 'কোনো শেয়ারহোল্ডার নেই!', 400)

  const totalSharesSold = shareholders.results.reduce((sum, sh) => sum + sh.shares_held, 0)

  // 1. Create distribution batch record (initially 'pending' — mark 'distributed' only after success)
  const distResult = await c.env.DB.prepare(
    `INSERT INTO profit_distributions 
     (project_id, total_revenue, total_expense, net_profit, distributable_amount, 
      company_share_percentage, investor_share_percentage, period_start, period_end, 
      status, distributed_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?)`
  ).bind(
    projectId, totalRevenue, totalExpense, netProfit, investorPool,
    data.company_share_percentage * 100, (100 - data.company_share_percentage) * 100,
    periodStart, periodEnd, userId
  ).run()

  if (!distResult.success) return err(c, 'ডিস্ট্রিবিউশন রেকর্ড তৈরিতে ব্যর্থ', 500)
  const distributionId = distResult.meta.last_row_id

  // 2. Prepare Batched Statements
  const statements: D1PreparedStatement[] = []
  const currentMonth = new Date().toISOString().slice(0, 7)

  // M5 FIX: Calculate actual per-share earnings rate instead of investor allocation percentage
  // rate_bps should represent the actual return rate: (profitPerShare / sharePrice) * 10000
  const profitPerShare = totalSharesSold > 0 ? investorPool / totalSharesSold : 0
  const actualRateBps = project.share_price > 0
    ? Math.floor((profitPerShare / project.share_price) * 10000)
    : 0

  // C3 FIX: Track rounding remainder — assign to last shareholder
  let distributedTotal = 0
  for (let i = 0; i < shareholders.results.length; i++) {
    const sh = shareholders.results[i]
    const ownershipPct = Math.floor((sh.shares_held / totalSharesSold) * 10000)
    
    let profitAmount: number
    if (i === shareholders.results.length - 1) {
      // Last shareholder gets the remainder to prevent silent money loss
      profitAmount = investorPool - distributedTotal
    } else {
      profitAmount = Math.floor((investorPool * sh.shares_held) / totalSharesSold)
    }
    distributedTotal += profitAmount

    // A. Shareholder profit record
    statements.push(
      c.env.DB.prepare(`INSERT INTO shareholder_profits (distribution_id, project_id, user_id, shares_held, total_shares, ownership_percentage, profit_amount, status, credited_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'credited', datetime('now'))`)
      .bind(distributionId, projectId, sh.user_id, sh.shares_held, totalSharesSold, ownershipPct, profitAmount)
    )

    // B. Earnings record — use actual rate, not investor allocation % 
    statements.push(
      c.env.DB.prepare(`INSERT INTO earnings (user_id, project_id, month, shares, rate, amount) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, project_id, month) DO UPDATE SET amount = amount + excluded.amount`)
      .bind(sh.user_id, projectId, currentMonth, sh.shares_held, actualRateBps, profitAmount)
    )

    // C. Update Main Balance
    statements.push(
      c.env.DB.prepare(`UPDATE user_balances SET total_earned_paisa = total_earned_paisa + ?, updated_at = datetime('now') WHERE user_id = ?`)
      .bind(profitAmount, sh.user_id)
    )

    // D. Audit Log
    statements.push(
      c.env.DB.prepare(`INSERT INTO balance_audit_log (user_id, amount_paisa, change_type, reference_type, reference_id, admin_id, note) VALUES (?, ?, 'earn', 'profit_distribution', ?, ?, ?)`)
      .bind(sh.user_id, profitAmount, distributionId, userId, `Profit for project ${project.title}`)
    )
  }

  // 3. Execute in chunks of 50 users (200 statements) to respect D1 limits
  // C4 FIX: If any batch fails, revert distribution status to 'cancelled'
  let failedCount = 0
  const chunkSize = 200 
  for (let i = 0; i < statements.length; i += chunkSize) {
    const chunk = statements.slice(i, i + chunkSize)
    try {
      await c.env.DB.batch(chunk)
    } catch (e) {
      console.error(`Batch failed at chunk ${i}:`, e)
      failedCount += Math.ceil(chunk.length / 4)
    }
  }

  // If ALL shareholders failed, mark distribution as cancelled
  if (failedCount >= shareholders.results.length) {
    await c.env.DB.prepare(
      `UPDATE profit_distributions SET status = 'cancelled' WHERE id = ?`
    ).bind(distributionId).run()
    return err(c, 'প্রফিট ডিস্ট্রিবিউশন ব্যর্থ হয়েছে — কোনো শেয়ারহোল্ডারকে পেমেন্ট করা যায়নি', 500)
  }

  // Mark as distributed now that shareholders were paid
  await c.env.DB.prepare(
    `UPDATE profit_distributions SET status = 'distributed', distributed_at = datetime('now') WHERE id = ?`
  ).bind(distributionId).run()

  return ok(c, {
    message: `${shareholders.results.length - failedCount} জন শেয়ারহোল্ডারকে সফলভাবে প্রফিট পাঠানো হয়েছে!`,
    distribution_id: distributionId,
    total_distributed_paisa: distributedTotal,
    failed_count: failedCount
  }, 201)
})

// ──────────────────────────────────────────────────────────────
// GET /preview/:projectId — Profit distribution preview
// ──────────────────────────────────────────────────────────────
profitRoutes.get('/preview/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const companyPct = parseInt(c.req.query('company_pct') || '30')

  // Get project
  const project = await c.env.DB.prepare(
    'SELECT id, title, share_price FROM projects WHERE id = ?'
  ).bind(projectId).first<{ id: number; title: string; share_price: number }>()

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  // Get financials
  const financials = await c.env.DB.prepare(
    `SELECT 
      COALESCE(SUM(CASE WHEN transaction_type = 'revenue' THEN amount ELSE 0 END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
    FROM project_transactions 
    WHERE project_id = ?`
  ).bind(projectId).first<{ total_revenue: number; total_expense: number }>()

  const totalRevenue = financials?.total_revenue ?? 0
  const directExpense = financials?.total_expense ?? 0

  const companyAllocationResult = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total_allocated FROM expense_allocations WHERE project_id = ?`
  ).bind(projectId).first<{ total_allocated: number }>()

  const companyExpenseAllocation = companyAllocationResult?.total_allocated ?? 0
  const totalExpense = directExpense + companyExpenseAllocation
  const netProfit = totalRevenue - totalExpense

  const distributed = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(distributable_amount), 0) as total FROM profit_distributions WHERE project_id = ? AND status = 'distributed'`
  ).bind(projectId).first<{ total: number }>()

  const previouslyDistributed = distributed?.total ?? 0
  const availableProfit = netProfit - previouslyDistributed

  const companyShareAmount = Math.floor((availableProfit * companyPct) / 100)
  const investorPool = availableProfit - companyShareAmount

  // Get shareholders
  const shareholders = await c.env.DB.prepare(
    `SELECT us.user_id, us.quantity as shares_held, u.name as user_name, u.phone 
     FROM user_shares us
     JOIN users u ON u.id = us.user_id
     WHERE us.project_id = ? AND us.quantity > 0`
  ).bind(projectId).all<{ user_id: number; shares_held: number; user_name: string; phone: string }>()

  const totalSharesSold = shareholders.results.reduce((sum, sh) => sum + sh.shares_held, 0)

  const shareholderData = shareholders.results.map(sh => {
    const ownershipPct = totalSharesSold > 0 ? Math.floor((sh.shares_held / totalSharesSold) * 10000) : 0
    const profitAmount = totalSharesSold > 0 ? Math.floor((investorPool * sh.shares_held) / totalSharesSold) : 0
    return {
      user_id: sh.user_id,
      user_name: sh.user_name,
      phone: sh.phone,
      shares_held: sh.shares_held,
      total_shares: totalSharesSold,
      ownership_percentage: ownershipPct,
      profit_amount: profitAmount
    }
  })

  return ok(c, {
    summary: {
      total_revenue: totalRevenue,
      direct_expense: directExpense,
      company_expense_allocation: companyExpenseAllocation,
      net_profit: netProfit,
      adjusted_net_profit: netProfit,
      previously_distributed: previouslyDistributed,
      available_profit: availableProfit,
      company_share_pct: companyPct,
      company_share_amount: companyShareAmount,
      investor_share_pct: 100 - companyPct,
      investor_pool: investorPool,
      total_shareholders: shareholders.results.length,
      total_shares_sold: totalSharesSold
    },
    shareholders: shareholderData,
    has_available_profit: availableProfit > 0
  })
})

// ──────────────────────────────────────────────────────────────
// GET /history/:projectId — Distribution history for a project
// ──────────────────────────────────────────────────────────────
profitRoutes.get('/history/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT pd.*, u.name as created_by_name
       FROM profit_distributions pd
       LEFT JOIN users u ON u.id = pd.created_by
       WHERE pd.project_id = ?
       ORDER BY pd.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(projectId, limit, offset).all(),
    c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM profit_distributions WHERE project_id = ?'
    ).bind(projectId).first<{ total: number }>()
  ])

  const total = countRow?.total ?? 0

  return ok(c, {
    items: rows.results,
    pagination: { page, limit, total, hasMore: page * limit < total }
  })
})

// ──────────────────────────────────────────────────────────────
// GET /distribution/:id — Single distribution details
// ──────────────────────────────────────────────────────────────
profitRoutes.get('/distribution/:id', async (c) => {
  const distId = parseInt(c.req.param('id'))
  if (isNaN(distId)) return err(c, 'অকার্যকর আইডি')

  const distribution = await c.env.DB.prepare(
    `SELECT pd.*, p.title as project_title
     FROM profit_distributions pd
     JOIN projects p ON p.id = pd.project_id
     WHERE pd.id = ?`
  ).bind(distId).first()

  if (!distribution) return err(c, 'ডিস্ট্রিবিউশন পাওয়া যায়নি', 404)

  const shareholders = await c.env.DB.prepare(
    `SELECT sp.*, u.name as user_name, u.phone
     FROM shareholder_profits sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.distribution_id = ?
     ORDER BY sp.profit_amount DESC`
  ).bind(distId).all()

  return ok(c, {
    distribution,
    shareholders: shareholders.results
  })
})

// ──────────────────────────────────────────────────────────────
// GET /my-profits — User's own profit history (non-admin)
// ──────────────────────────────────────────────────────────────

// Create a separate router for user-accessible profit routes (no admin)
const userProfitRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
userProfitRoutes.use('*', authMiddleware)

userProfitRoutes.get('/my-profits', async (c) => {
  const userId = c.get('userId')

  const [profits, summary] = await Promise.all([
    c.env.DB.prepare(
      `SELECT sp.*, p.title as project_title, pd.distributed_at
       FROM shareholder_profits sp
       JOIN projects p ON p.id = sp.project_id
       JOIN profit_distributions pd ON pd.id = sp.distribution_id
       WHERE sp.user_id = ?
       ORDER BY pd.distributed_at DESC`
    ).bind(userId).all(),
    c.env.DB.prepare(
      `SELECT 
        COUNT(*) as total_distributions,
        COALESCE(SUM(profit_amount), 0) as total_profit_earned,
        COUNT(DISTINCT project_id) as projects_count
       FROM shareholder_profits WHERE user_id = ?`
    ).bind(userId).first<{ total_distributions: number; total_profit_earned: number; projects_count: number }>()
  ])

  return ok(c, {
    profits: profits.results,
    summary: {
      total_distributions: summary?.total_distributions ?? 0,
      total_profit_earned: summary?.total_profit_earned ?? 0,
      projects_count: summary?.projects_count ?? 0
    }
  })
})

export { profitRoutes, userProfitRoutes }