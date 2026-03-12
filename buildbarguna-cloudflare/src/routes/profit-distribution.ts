// ──────────────────────────────────────────────────────────────
// PROFIT DISTRIBUTION — Actual P&L-based System (System A)
// ──────────────────────────────────────────────────────────────
// v2: Added company_fund_transactions, fixed re-distribution bug,
//     added period selection and notes support.

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

// ──────────────────────────────────────────────────────────────
// Helper: get financial snapshot for a project
// ──────────────────────────────────────────────────────────────
async function getProjectFinancials(db: D1Database, projectId: number) {
  const [financials, companyAlloc, distributed] = await Promise.all([
    db.prepare(
      `SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'revenue' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as direct_expense
       FROM project_transactions WHERE project_id = ?`
    ).bind(projectId).first<{ total_revenue: number; direct_expense: number }>(),

    db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expense_allocations WHERE project_id = ?`
    ).bind(projectId).first<{ total: number }>(),

    // FIX: Use total_distributed_amount (includes company share) — prevents re-distribution bug
    db.prepare(
      `SELECT COALESCE(SUM(total_distributed_amount), 0) as total 
       FROM profit_distributions WHERE project_id = ? AND status = 'distributed'`
    ).bind(projectId).first<{ total: number }>()
  ])

  const totalRevenue = financials?.total_revenue ?? 0
  const directExpense = financials?.direct_expense ?? 0
  const companyExpenseAllocation = companyAlloc?.total ?? 0
  const totalExpense = directExpense + companyExpenseAllocation
  const netProfit = totalRevenue - totalExpense
  const previouslyDistributed = distributed?.total ?? 0
  const availableProfit = netProfit - previouslyDistributed

  return {
    totalRevenue,
    directExpense,
    companyExpenseAllocation,
    totalExpense,
    netProfit,
    previouslyDistributed,
    availableProfit
  }
}

// ──────────────────────────────────────────────────────────────
// GET /preview/:projectId — Profit distribution preview
// ──────────────────────────────────────────────────────────────
profitRoutes.get('/preview/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const companyPct = parseInt(c.req.query('company_pct') || '30')

  const project = await c.env.DB.prepare(
    'SELECT id, title, share_price FROM projects WHERE id = ?'
  ).bind(projectId).first<{ id: number; title: string; share_price: number }>()

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  const fin = await getProjectFinancials(c.env.DB, projectId)

  const companyShareAmount = Math.floor((fin.availableProfit * companyPct) / 100)
  const investorPool = fin.availableProfit - companyShareAmount

  const shareholders = await c.env.DB.prepare(
    `SELECT us.user_id, us.quantity as shares_held, u.name as user_name, u.phone 
     FROM user_shares us
     JOIN users u ON u.id = us.user_id
     WHERE us.project_id = ? AND us.quantity > 0`
  ).bind(projectId).all<{ user_id: number; shares_held: number; user_name: string; phone: string }>()

  const totalSharesSold = shareholders.results.reduce((s, sh) => s + sh.shares_held, 0)

  const shareholderData = shareholders.results.map(sh => {
    const ownershipPct = totalSharesSold > 0 ? Math.floor((sh.shares_held / totalSharesSold) * 10000) : 0
    const profitAmount = totalSharesSold > 0 ? Math.floor((investorPool * sh.shares_held) / totalSharesSold) : 0
    return {
      user_id: sh.user_id,
      user_name: sh.user_name,
      phone: sh.phone,
      shares_held: sh.shares_held,
      total_shares: totalSharesSold,
      ownership_pct_bps: ownershipPct,
      profit_amount: profitAmount
    }
  })

  return ok(c, {
    project: { id: project.id, title: project.title },
    summary: {
      total_revenue: fin.totalRevenue,
      direct_expense: fin.directExpense,
      company_expense_allocation: fin.companyExpenseAllocation,
      net_profit: fin.netProfit,
      previously_distributed: fin.previouslyDistributed,
      available_profit: fin.availableProfit,
      company_share_pct: companyPct,
      company_share_amount: companyShareAmount,
      investor_share_pct: 100 - companyPct,
      investor_pool: investorPool,
      total_shareholders: shareholders.results.length,
      total_shares_sold: totalSharesSold
    },
    shareholders: shareholderData,
    has_available_profit: fin.availableProfit > 0
  })
})

// ──────────────────────────────────────────────────────────────
// POST /distribute/:projectId — Execute distribution
// ──────────────────────────────────────────────────────────────
const distributeSchema = z.object({
  company_share_percentage: z.number().int().min(0).max(100).default(30),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  notes: z.string().optional()
})

profitRoutes.post('/distribute/:projectId', zValidator('json', distributeSchema), async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const userId = c.get('userId')
  const data = c.req.valid('json')

  const project = await c.env.DB.prepare(
    'SELECT id, title, share_price FROM projects WHERE id = ?'
  ).bind(projectId).first<{ id: number; title: string; share_price: number }>()

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  // Duplicate period guard
  const periodStart = data.period_start ?? null
  const periodEnd = data.period_end ?? null
  if (periodStart && periodEnd) {
    const existing = await c.env.DB.prepare(
      `SELECT id FROM profit_distributions 
       WHERE project_id = ? AND period_start = ? AND period_end = ? AND status = 'distributed'`
    ).bind(projectId, periodStart, periodEnd).first<{ id: number }>()
    if (existing) return err(c, 'এই সময়ের জন্য ইতিমধ্যে প্রফিট ডিস্ট্রিবিউট করা হয়েছে', 409)
  }

  const fin = await getProjectFinancials(c.env.DB, projectId)
  if (fin.availableProfit <= 0) return err(c, 'ডিস্ট্রিবিউট করার মতো লাভ নেই!', 400)

  const companyShareAmount = Math.floor((fin.availableProfit * data.company_share_percentage) / 100)
  const investorPool = fin.availableProfit - companyShareAmount

  const shareholders = await c.env.DB.prepare(
    `SELECT user_id, quantity as shares_held FROM user_shares WHERE project_id = ? AND quantity > 0`
  ).bind(projectId).all<{ user_id: number; shares_held: number }>()

  if (shareholders.results.length === 0) return err(c, 'কোনো শেয়ারহোল্ডার নেই!', 400)

  const totalSharesSold = shareholders.results.reduce((s, sh) => s + sh.shares_held, 0)

  // 1. Create distribution batch (initially 'pending')
  const distResult = await c.env.DB.prepare(
    `INSERT INTO profit_distributions 
     (project_id, total_revenue, total_expense, net_profit, distributable_amount,
      company_share_amount, total_distributed_amount,
      company_share_percentage, investor_share_percentage, 
      period_start, period_end, notes,
      shareholders_count, status, distributed_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?)`
  ).bind(
    projectId,
    fin.totalRevenue, fin.totalExpense, fin.netProfit,
    investorPool,                              // distributable_amount = investor pool
    companyShareAmount,                        // NEW: company's amount (stored explicitly)
    fin.availableProfit,                       // NEW: total_distributed_amount = full amount removed
    data.company_share_percentage * 100,       // basis points
    (100 - data.company_share_percentage) * 100,
    periodStart, periodEnd,
    data.notes ?? null,
    shareholders.results.length,
    userId
  ).run()

  if (!distResult.success) return err(c, 'ডিস্ট্রিবিউশন রেকর্ড তৈরিতে ব্যর্থ', 500)
  const distributionId = distResult.meta.last_row_id

  // 2. Rate for earnings records
  const profitPerShare = totalSharesSold > 0 ? investorPool / totalSharesSold : 0
  const actualRateBps = project.share_price > 0
    ? Math.floor((profitPerShare / project.share_price) * 10000)
    : 0
  const currentMonth = new Date().toISOString().slice(0, 7)

  // 3. Build batch statements for all shareholders
  const statements: D1PreparedStatement[] = []
  let distributedTotal = 0

  for (let i = 0; i < shareholders.results.length; i++) {
    const sh = shareholders.results[i]
    const ownershipPct = Math.floor((sh.shares_held / totalSharesSold) * 10000)

    let profitAmount: number
    if (i === shareholders.results.length - 1) {
      // Last shareholder absorbs rounding remainder (prevents silent money loss)
      profitAmount = investorPool - distributedTotal
    } else {
      profitAmount = Math.floor((investorPool * sh.shares_held) / totalSharesSold)
    }
    distributedTotal += profitAmount

    statements.push(
      c.env.DB.prepare(
        `INSERT INTO shareholder_profits 
         (distribution_id, project_id, user_id, shares_held, total_shares, ownership_percentage, profit_amount, status, credited_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'credited', datetime('now'))`
      ).bind(distributionId, projectId, sh.user_id, sh.shares_held, totalSharesSold, ownershipPct, profitAmount)
    )

    statements.push(
      c.env.DB.prepare(
        `INSERT INTO earnings (user_id, project_id, month, shares, rate, amount) 
         VALUES (?, ?, ?, ?, ?, ?) 
         ON CONFLICT(user_id, project_id, month) DO UPDATE SET amount = amount + excluded.amount`
      ).bind(sh.user_id, projectId, currentMonth, sh.shares_held, actualRateBps, profitAmount)
    )

    statements.push(
      c.env.DB.prepare(
        `UPDATE user_balances SET total_earned_paisa = total_earned_paisa + ?, updated_at = datetime('now') 
         WHERE user_id = ?`
      ).bind(profitAmount, sh.user_id)
    )

    statements.push(
      c.env.DB.prepare(
        `INSERT INTO balance_audit_log 
         (user_id, amount_paisa, change_type, reference_type, reference_id, admin_id, note) 
         VALUES (?, ?, 'earn', 'profit_distribution', ?, ?, ?)`
      ).bind(sh.user_id, profitAmount, distributionId, userId, `প্রজেক্ট "${project.title}" থেকে প্রফিট`)
    )
  }

  // 4. Execute in chunks of 200 statements
  let failedCount = 0
  const chunkSize = 200
  for (let i = 0; i < statements.length; i += chunkSize) {
    try {
      await c.env.DB.batch(statements.slice(i, i + chunkSize))
    } catch (e) {
      console.error(`Batch failed at chunk ${i}:`, e)
      failedCount += Math.ceil(statements.slice(i, i + chunkSize).length / 4)
    }
  }

  if (failedCount >= shareholders.results.length) {
    await c.env.DB.prepare(
      `UPDATE profit_distributions SET status = 'cancelled' WHERE id = ?`
    ).bind(distributionId).run()
    return err(c, 'প্রফিট ডিস্ট্রিবিউশন ব্যর্থ — কোনো শেয়ারহোল্ডারকে পেমেন্ট করা যায়নি', 500)
  }

  // 5. Mark distributed + record company fund transaction (both in a batch for atomicity)
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE profit_distributions 
       SET status = 'distributed', distributed_at = datetime('now') 
       WHERE id = ?`
    ).bind(distributionId),

    // NEW: Record company's share in company_fund_transactions
    c.env.DB.prepare(
      `INSERT INTO company_fund_transactions 
       (project_id, distribution_id, amount_paisa, transaction_type, description, reference_type, reference_id, created_by)
       VALUES (?, ?, ?, 'profit_share', ?, 'profit_distribution', ?, ?)`
    ).bind(
      projectId,
      distributionId,
      companyShareAmount,
      `"${project.title}" প্রজেক্ট থেকে কোম্পানির প্রফিট শেয়ার (${data.company_share_percentage}%)`,
      distributionId,
      userId
    )
  ])

  return ok(c, {
    message: `${shareholders.results.length - failedCount} জন শেয়ারহোল্ডারকে সফলভাবে প্রফিট পাঠানো হয়েছে!`,
    distribution_id: distributionId,
    investor_distributed: distributedTotal,
    company_fund_credited: companyShareAmount,
    total_distributed: fin.availableProfit,
    failed_count: failedCount
  }, 201)
})

// ──────────────────────────────────────────────────────────────
// GET /history/:projectId — Distribution history
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

  return ok(c, {
    items: rows.results,
    pagination: { page, limit, total: countRow?.total ?? 0, hasMore: page * limit < (countRow?.total ?? 0) }
  })
})

// ──────────────────────────────────────────────────────────────
// GET /distribution/:id — Single distribution details
// ──────────────────────────────────────────────────────────────
profitRoutes.get('/distribution/:id', async (c) => {
  const distId = parseInt(c.req.param('id'))
  if (isNaN(distId)) return err(c, 'অকার্যকর আইডি')

  const [distribution, shareholders] = await Promise.all([
    c.env.DB.prepare(
      `SELECT pd.*, p.title as project_title, u.name as created_by_name
       FROM profit_distributions pd
       JOIN projects p ON p.id = pd.project_id
       LEFT JOIN users u ON u.id = pd.created_by
       WHERE pd.id = ?`
    ).bind(distId).first(),
    c.env.DB.prepare(
      `SELECT sp.*, u.name as user_name, u.phone
       FROM shareholder_profits sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.distribution_id = ?
       ORDER BY sp.profit_amount DESC`
    ).bind(distId).all()
  ])

  if (!distribution) return err(c, 'ডিস্ট্রিবিউশন পাওয়া যায়নি', 404)
  return ok(c, { distribution, shareholders: shareholders.results })
})

// ──────────────────────────────────────────────────────────────
// GET /company-fund — Company fund summary + transaction history
// ──────────────────────────────────────────────────────────────
profitRoutes.get('/company-fund', async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit

  const [summary, transactions, countRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN amount_paisa > 0 THEN amount_paisa ELSE 0 END), 0) as total_credited,
        COALESCE(SUM(CASE WHEN amount_paisa < 0 THEN ABS(amount_paisa) ELSE 0 END), 0) as total_debited,
        COALESCE(SUM(amount_paisa), 0) as current_balance
       FROM company_fund_transactions`
    ).first<{ total_credited: number; total_debited: number; current_balance: number }>(),

    c.env.DB.prepare(
      `SELECT cft.*, p.title as project_title, u.name as created_by_name
       FROM company_fund_transactions cft
       LEFT JOIN projects p ON p.id = cft.project_id
       LEFT JOIN users u ON u.id = cft.created_by
       ORDER BY cft.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(limit, offset).all(),

    c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM company_fund_transactions'
    ).first<{ total: number }>()
  ])

  return ok(c, {
    summary: {
      current_balance: summary?.current_balance ?? 0,
      total_credited: summary?.total_credited ?? 0,
      total_debited: summary?.total_debited ?? 0
    },
    transactions: transactions.results,
    pagination: {
      page, limit,
      total: countRow?.total ?? 0,
      hasMore: page * limit < (countRow?.total ?? 0)
    }
  })
})

// ──────────────────────────────────────────────────────────────
// POST /company-fund/withdraw — Admin withdraws from company fund
// ──────────────────────────────────────────────────────────────
const withdrawFundSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().min(1, 'উদ্দেশ্য লিখুন'),
  transaction_type: z.enum(['withdrawal', 'expense']).default('withdrawal')
})

profitRoutes.post('/company-fund/withdraw', zValidator('json', withdrawFundSchema), async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')

  // Check available balance
  const summary = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount_paisa), 0) as current_balance FROM company_fund_transactions`
  ).first<{ current_balance: number }>()

  const balance = summary?.current_balance ?? 0
  if (data.amount > balance) {
    return err(c, `অপর্যাপ্ত ফান্ড। বর্তমান ব্যালেন্স: ৳${(balance / 100).toFixed(2)}`, 400)
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO company_fund_transactions 
     (amount_paisa, transaction_type, description, reference_type, created_by)
     VALUES (?, ?, ?, 'manual', ?)`
  ).bind(
    -data.amount,  // negative = debit
    data.transaction_type,
    data.description,
    userId
  ).run()

  if (!result.success) return err(c, 'ট্রানজেকশন সংরক্ষণ ব্যর্থ', 500)

  return ok(c, {
    message: 'কোম্পানি ফান্ড থেকে সফলভাবে সরানো হয়েছে',
    transaction_id: result.meta.last_row_id,
    new_balance: balance - data.amount
  })
})

// ──────────────────────────────────────────────────────────────
// GET /my-profits — User's own profit history (non-admin)
// ──────────────────────────────────────────────────────────────
const userProfitRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
userProfitRoutes.use('*', authMiddleware)

userProfitRoutes.get('/my-profits', async (c) => {
  const userId = c.get('userId')

  const [profits, summary] = await Promise.all([
    c.env.DB.prepare(
      `SELECT sp.*, p.title as project_title, pd.distributed_at, pd.notes as distribution_notes
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