import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err, getPagination, paginate } from '../lib/response'
import type { Bindings, Variables, ProfitDistribution, ShareholderProfit, ProfitPreview } from '../types'

export const profitRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// All profit routes require auth
profitRoutes.use('*', authMiddleware)

// ──────────────────────────────────────────────────────────────
// 1. PREVIEW PROFIT DISTRIBUTION
// ──────────────────────────────────────────────────────────────

profitRoutes.get('/preview/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const companySharePct = parseInt(c.req.query('company_pct') || '30') // default 30%
  if (companySharePct < 0 || companySharePct > 100) {
    return err(c, 'কোম্পানি শেয়ার ০-১০০% এর মধ্যে হতে হবে')
  }

  // Verify project exists
  const project = await c.env.DB.prepare(
    'SELECT id, title, share_price, total_shares FROM projects WHERE id = ?'
  ).bind(projectId).first<{ id: number; title: string; share_price: number; total_shares: number }>()

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
  const totalExpense = financials?.total_expense ?? 0
  const netProfit = totalRevenue - totalExpense

  // Get previously distributed
  const distributed = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(distributable_amount), 0) as total_distributed
     FROM profit_distributions 
     WHERE project_id = ? AND status = 'distributed'`
  ).bind(projectId).first<{ total_distributed: number }>()

  const previouslyDistributed = distributed?.total_distributed ?? 0
  const availableProfit = netProfit - previouslyDistributed

  if (availableProfit <= 0) {
    return ok(c, {
      summary: {
        total_revenue: totalRevenue,
        total_expense: totalExpense,
        net_profit: netProfit,
        previously_distributed: previouslyDistributed,
        available_profit: 0,
        company_share_pct: companySharePct,
        company_share_amount: 0,
        investor_share_pct: 100 - companySharePct,
        investor_pool: 0,
        total_shareholders: 0,
        total_shares_sold: 0
      },
      shareholders: [],
      has_available_profit: false,
      message: 'ডিস্ট্রিবিউট করার মতো লাভ নেই'
    })
  }

  // Calculate shares
  const companyShareAmount = Math.floor((availableProfit * companySharePct) / 100)
  const investorPool = availableProfit - companyShareAmount

  // Get shareholders
  const shareholders = await c.env.DB.prepare(
    `SELECT 
      us.user_id,
      u.name as user_name,
      u.phone,
      us.quantity as shares_held
    FROM user_shares us
    JOIN users u ON u.id = us.user_id
    WHERE us.project_id = ? AND us.quantity > 0
    ORDER BY us.quantity DESC`
  ).bind(projectId).all<{ user_id: number; user_name: string; phone: string; shares_held: number }>()

  if (shareholders.results.length === 0) {
    return ok(c, {
      summary: {
        total_revenue: totalRevenue,
        total_expense: totalExpense,
        net_profit: netProfit,
        previously_distributed: previouslyDistributed,
        available_profit: availableProfit,
        company_share_pct: companySharePct,
        company_share_amount: companyShareAmount,
        investor_share_pct: 100 - companySharePct,
        investor_pool: investorPool,
        total_shareholders: 0,
        total_shares_sold: 0
      },
      shareholders: [],
      has_available_profit: true
    })
  }

  const totalSharesSold = shareholders.results.reduce((sum, sh) => sum + sh.shares_held, 0)

  // Calculate profit per shareholder
  const shareholderData = shareholders.results.map(sh => {
    const ownershipPct = (sh.shares_held / totalSharesSold) * 100
    const profitAmount = Math.floor((investorPool * sh.shares_held) / totalSharesSold)

    return {
      user_id: sh.user_id,
      user_name: sh.user_name,
      phone: sh.phone,
      shares_held: sh.shares_held,
      total_shares: totalSharesSold,
      ownership_percentage: Math.round(ownershipPct * 100) / 100, // 2 decimal places
      profit_amount: profitAmount
    }
  })

  const preview: ProfitPreview = {
    summary: {
      total_revenue: totalRevenue,
      total_expense: totalExpense,
      net_profit: netProfit,
      previously_distributed: previouslyDistributed,
      available_profit: availableProfit,
      company_share_pct: companySharePct,
      company_share_amount: companyShareAmount,
      investor_share_pct: 100 - companySharePct,
      investor_pool: investorPool,
      total_shareholders: shareholders.results.length,
      total_shares_sold: totalSharesSold
    },
    shareholders: shareholderData,
    has_available_profit: true
  }

  return ok(c, preview)
})

// ──────────────────────────────────────────────────────────────
// 2. DISTRIBUTE PROFIT (Send to all shareholders)
// ──────────────────────────────────────────────────────────────

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

  // Verify project exists
  const project = await c.env.DB.prepare(
    'SELECT id, title FROM projects WHERE id = ?'
  ).bind(projectId).first<{ id: number; title: string }>()

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
  const totalExpense = financials?.total_expense ?? 0
  const netProfit = totalRevenue - totalExpense

  // Get previously distributed
  const distributed = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(distributable_amount), 0) as total
     FROM profit_distributions 
     WHERE project_id = ? AND status = 'distributed'`
  ).bind(projectId).first<{ total: number }>()

  const previouslyDistributed = distributed?.total ?? 0
  const availableProfit = netProfit - previouslyDistributed

  if (availableProfit <= 0) {
    return err(c, 'ডিস্ট্রিবিউট করার মতো লাভ নেই!', 400)
  }

  const companyShareAmount = Math.floor((availableProfit * data.company_share_percentage) / 100)
  const investorPool = availableProfit - companyShareAmount

  // Get shareholders
  const shareholders = await c.env.DB.prepare(
    `SELECT user_id, quantity as shares_held
     FROM user_shares 
     WHERE project_id = ? AND quantity > 0`
  ).bind(projectId).all<{ user_id: number; shares_held: number }>()

  if (shareholders.results.length === 0) {
    return err(c, 'কোনো শেয়ারহোল্ডার নেই!', 400)
  }

  const totalSharesSold = shareholders.results.reduce((sum, sh) => sum + sh.shares_held, 0)

  // Create distribution batch
  const distResult = await c.env.DB.prepare(
    `INSERT INTO profit_distributions 
     (project_id, total_revenue, total_expense, net_profit, 
      distributable_amount, company_share_percentage, 
      investor_share_percentage, period_start, period_end, 
      status, distributed_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'distributed', datetime('now'), ?)`
  ).bind(
    projectId,
    totalRevenue,
    totalExpense,
    netProfit,
    investorPool,
    data.company_share_percentage * 100, // convert to basis points
    (100 - data.company_share_percentage) * 100,
    data.period_start ?? null,
    data.period_end ?? null,
    userId
  ).run()

  if (!distResult.success) return err(c, 'ডিস্ট্রিবিউশন ব্যর্থ হয়েছে', 500)

  const distributionId = distResult.meta.last_row_id

  // Distribute profit to each shareholder and add to earnings
  const insertResults = await Promise.allSettled(
    shareholders.results.map(async (sh) => {
      const ownershipPct = Math.floor((sh.shares_held / totalSharesSold) * 10000) // basis points
      const profitAmount = Math.floor((investorPool * sh.shares_held) / totalSharesSold)

      // Insert shareholder profit record
      await c.env.DB.prepare(
        `INSERT INTO shareholder_profits 
         (distribution_id, project_id, user_id, shares_held, 
          total_shares, ownership_percentage, profit_amount, 
          status, credited_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'credited', datetime('now'))`
      ).bind(
        distributionId,
        projectId,
        sh.user_id,
        sh.shares_held,
        totalSharesSold,
        ownershipPct,
        profitAmount
      ).run()

      // Add to earnings table (for withdrawal capability)
      const currentMonth = new Date().toISOString().slice(0, 7)
      await c.env.DB.prepare(
        `INSERT INTO earnings (user_id, project_id, month, shares, rate, amount)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, project_id, month) DO UPDATE SET amount = amount + excluded.amount`
      ).bind(
        sh.user_id,
        projectId,
        currentMonth,
        sh.shares_held,
        Math.floor(data.company_share_percentage * 100), // use company % as rate
        profitAmount
      ).run()
    })
  )

  // Check for failures
  const failedCount = insertResults.filter(r => r.status === 'rejected').length
  if (failedCount > 0) {
    console.error(`[profit-distribution] ${failedCount} shareholders failed to credit`)
  }

  return ok(c, {
    message: `${shareholders.results.length} জন শেয়ারহোল্ডারকে সফলভাবে প্রফিট পাঠানো হয়েছে!`,
    distribution_id: distributionId,
    total_distributed: investorPool,
    shareholders_count: shareholders.results.length,
    company_share: companyShareAmount,
    failed_count: failedCount
  }, 201)
})

// ──────────────────────────────────────────────────────────────
// 3. GET DISTRIBUTION HISTORY
// ──────────────────────────────────────────────────────────────

profitRoutes.get('/history/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const { page, limit, offset } = getPagination(c.req.query())

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT pd.*, u.name as distributed_by_name,
        (SELECT COUNT(*) FROM shareholder_profits WHERE distribution_id = pd.id) as shareholders_count
       FROM profit_distributions pd
       LEFT JOIN users u ON pd.created_by = u.id
       WHERE pd.project_id = ?
       ORDER BY pd.created_at DESC LIMIT ? OFFSET ?`
    ).bind(projectId, limit, offset).all<ProfitDistribution & { distributed_by_name: string; shareholders_count: number }>(),

    c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM profit_distributions WHERE project_id = ?'
    ).bind(projectId).first<{ total: number }>()
  ])

  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})

// ──────────────────────────────────────────────────────────────
// 4. GET DISTRIBUTION DETAILS
// ──────────────────────────────────────────────────────────────

profitRoutes.get('/distribution/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  const distribution = await c.env.DB.prepare(
    `SELECT pd.*, p.title as project_title, u.name as distributed_by_name
     FROM profit_distributions pd
     JOIN projects p ON pd.project_id = p.id
     LEFT JOIN users u ON pd.created_by = u.id
     WHERE pd.id = ?`
  ).bind(id).first<ProfitDistribution & { project_title: string; distributed_by_name: string }>()

  if (!distribution) return err(c, 'ডিস্ট্রিবিউশন পাওয়া যায়নি', 404)

  const shareholders = await c.env.DB.prepare(
    `SELECT sp.*, u.name as user_name, u.phone
     FROM shareholder_profits sp
     JOIN users u ON sp.user_id = u.id
     WHERE sp.distribution_id = ?
     ORDER BY sp.profit_amount DESC`
  ).bind(id).all<ShareholderProfit & { user_name: string; phone: string }>()

  return ok(c, {
    distribution,
    shareholders: shareholders.results
  })
})

// ──────────────────────────────────────────────────────────────
// 5. MY PROFITS (User's profit history)
// ──────────────────────────────────────────────────────────────

profitRoutes.get('/my-profits', async (c) => {
  const userId = c.get('userId')

  const profits = await c.env.DB.prepare(
    `SELECT sp.*, p.title as project_title, pd.distributed_at
     FROM shareholder_profits sp
     JOIN projects p ON sp.project_id = p.id
     JOIN profit_distributions pd ON sp.distribution_id = pd.id
     WHERE sp.user_id = ?
     ORDER BY pd.distributed_at DESC`
  ).bind(userId).all<ShareholderProfit & { project_title: string; distributed_at: string }>()

  const summary = await c.env.DB.prepare(
    `SELECT 
      COUNT(DISTINCT distribution_id) as total_distributions,
      COALESCE(SUM(profit_amount), 0) as total_profit_earned,
      COUNT(DISTINCT project_id) as projects_count
    FROM shareholder_profits 
    WHERE user_id = ? AND status = 'credited'`
  ).bind(userId).first<{
    total_distributions: number
    total_profit_earned: number
    projects_count: number
  }>()

  return ok(c, {
    profits: profits.results,
    summary: {
      total_distributions: summary?.total_distributions ?? 0,
      total_profit_earned: summary?.total_profit_earned ?? 0,
      projects_count: summary?.projects_count ?? 0
    }
  })
})

// ──────────────────────────────────────────────────────────────
// 6. ADMIN: GET ALL DISTRIBUTIONS
// ──────────────────────────────────────────────────────────────

profitRoutes.use('/admin/*', adminMiddleware)

profitRoutes.get('/admin/all', async (c) => {
  const { page, limit, offset } = getPagination(c.req.query())
  const status = c.req.query('status')

  let query = `
    SELECT pd.*, p.title as project_title, u.name as distributed_by_name,
      (SELECT COUNT(*) FROM shareholder_profits WHERE distribution_id = pd.id) as shareholders_count
    FROM profit_distributions pd
    JOIN projects p ON pd.project_id = p.id
    LEFT JOIN users u ON pd.created_by = u.id
  `
  const params: (string | number)[] = []

  if (status && ['pending', 'approved', 'distributed', 'cancelled'].includes(status)) {
    query += ' WHERE pd.status = ?'
    params.push(status)
  }

  query += ' ORDER BY pd.created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(query).bind(...params).all<ProfitDistribution & { project_title: string; distributed_by_name: string; shareholders_count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as total FROM profit_distributions').first<{ total: number }>()
  ])

  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})
