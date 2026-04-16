// ──────────────────────────────────────────────────────────────
// PROFIT DISTRIBUTION — P&L-based System with Full Audit Trail
// ──────────────────────────────────────────────────────────────
// v3: Added financial audit log, period-required validation,
//     overlapping period detection, dual-admin withdrawal approval,
//     per-project default company %, improved error recovery.

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err } from '../lib/response'
import {
  buildProfitDistributionSummary,
  resolveEffectiveCompanySharePct
} from '../lib/profit-distribution'
import type { Bindings, Variables } from '../types'

const profitRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
profitRoutes.use('*', authMiddleware)
profitRoutes.use('*', adminMiddleware)

const schemaSupportCache = new Map<string, boolean>()

// ──────────────────────────────────────────────────────────────
// Helper: write to financial_audit_log
// ──────────────────────────────────────────────────────────────
function auditLog(
  db: D1Database,
  params: {
    entity_type: string
    entity_id: number
    action: string
    old_values?: Record<string, unknown> | null
    new_values?: Record<string, unknown> | null
    amount_paisa?: number
    description: string
    actor_id: number
  }
): D1PreparedStatement {
  return db.prepare(
    `INSERT INTO financial_audit_log 
     (entity_type, entity_id, action, old_values, new_values, amount_paisa, description, actor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    params.entity_type,
    params.entity_id,
    params.action,
    params.old_values ? JSON.stringify(params.old_values) : null,
    params.new_values ? JSON.stringify(params.new_values) : null,
    params.amount_paisa ?? null,
    params.description,
    params.actor_id
  )
}

// ──────────────────────────────────────────────────────────────
// Helper: get financial snapshot for a project
// ──────────────────────────────────────────────────────────────
async function getProjectFinancials(db: D1Database, projectId: number) {
  const hasTotalDistributedAmount = await hasColumn(db, 'profit_distributions', 'total_distributed_amount')
  const distributedColumn = hasTotalDistributedAmount ? 'total_distributed_amount' : 'distributable_amount'

  // ⚡ Bolt: Use db.batch() instead of Promise.all to prevent per-query HTTP network overhead in D1
  const [financialsRes, companyAllocRes, distributedRes] = await db.batch<any>([
    db.prepare(
      `SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'revenue' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as direct_expense
       FROM project_transactions WHERE project_id = ?`
    ).bind(projectId),

    db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expense_allocations WHERE project_id = ?`
    ).bind(projectId),

    // Use total_distributed_amount (includes company share) — prevents re-distribution bug
    db.prepare(
      `SELECT COALESCE(SUM(${distributedColumn}), 0) as total 
       FROM profit_distributions WHERE project_id = ? AND status = 'distributed'`
    ).bind(projectId)
  ])

  const financials = financialsRes.results?.[0]
  const companyAlloc = companyAllocRes.results?.[0]
  const distributed = distributedRes.results?.[0]

  return {
    totalRevenue: financials?.total_revenue ?? 0,
    directExpense: financials?.direct_expense ?? 0,
    companyExpenseAllocation: companyAlloc?.total ?? 0,
    previouslyDistributed: distributed?.total ?? 0
  }
}

async function hasColumn(db: D1Database, table: string, column: string) {
  const cacheKey = `${table}.${column}`
  const cached = schemaSupportCache.get(cacheKey)
  if (cached != null) return cached

  const result = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>()
  const supported = result.results.some((row) => row.name === column)
  schemaSupportCache.set(cacheKey, supported)
  return supported
}

async function hasTable(db: D1Database, table: string) {
  const cacheKey = `table:${table}`
  const cached = schemaSupportCache.get(cacheKey)
  if (cached != null) return cached

  const result = await db.prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`
  ).bind(table).first<{ name: string }>()
  const supported = !!result
  schemaSupportCache.set(cacheKey, supported)
  return supported
}

// ──────────────────────────────────────────────────────────────
// GET /preview/:projectId — Profit distribution preview
// ──────────────────────────────────────────────────────────────
profitRoutes.get('/preview/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const companyPctParam = c.req.query('company_pct')
  const companyPct = companyPctParam ? parseInt(companyPctParam) : undefined

  const project = await c.env.DB.prepare(
    'SELECT * FROM projects WHERE id = ?'
  ).bind(projectId).first<{ id: number; title: string; share_price: number; default_company_share_pct?: number | null }>()

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  const snapshot = await getProjectFinancials(c.env.DB, projectId)
  const effectivePct = resolveEffectiveCompanySharePct(companyPct, project.default_company_share_pct)
  const fin = buildProfitDistributionSummary(snapshot, effectivePct)

  const shareholders = await c.env.DB.prepare(
    `SELECT us.user_id, us.quantity as shares_held, u.name as user_name, u.phone 
     FROM user_shares us
     JOIN users u ON u.id = us.user_id
     WHERE us.project_id = ? AND us.quantity > 0`
  ).bind(projectId).all<{ user_id: number; shares_held: number; user_name: string; phone: string }>()

  const totalSharesSold = shareholders.results.reduce((s, sh) => s + sh.shares_held, 0)

  const shareholderData = shareholders.results.map(sh => {
    const ownershipPct = totalSharesSold > 0 ? Math.floor((sh.shares_held / totalSharesSold) * 10000) : 0
    const profitAmount = totalSharesSold > 0 ? Math.floor((fin.investorPool * sh.shares_held) / totalSharesSold) : 0
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
    project: {
      id: project.id,
      title: project.title,
      default_company_share_pct: project.default_company_share_pct ?? 3000  // basis points
    },
    summary: {
      total_revenue: fin.totalRevenue,
      direct_expense: fin.directExpense,
      company_expense_allocation: fin.companyExpenseAllocation,
      net_profit: fin.netProfit,
      previously_distributed: fin.previouslyDistributed,
      available_profit: fin.availableProfit,
      company_share_pct: fin.effectivePct,
      company_share_amount: fin.companyShareAmount,
      investor_share_pct: 100 - fin.effectivePct,
      investor_pool: fin.investorPool,
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
  period_start: z.string().min(1, 'পিরিয়ড শুরুর তারিখ দিন'),
  period_end: z.string().min(1, 'পিরিয়ড শেষের তারিখ দিন'),
  notes: z.string().optional()
})

profitRoutes.post('/distribute/:projectId', zValidator('json', distributeSchema), async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const userId = c.get('userId')
  const data = c.req.valid('json')

  const project = await c.env.DB.prepare(
    'SELECT * FROM projects WHERE id = ?'
  ).bind(projectId).first<{ id: number; title: string; share_price: number; default_company_share_pct?: number | null }>()

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  // Validate period_end >= period_start
  if (data.period_end < data.period_start) {
    return err(c, 'পিরিয়ড শেষের তারিখ, শুরুর তারিখের আগে হতে পারে না', 400)
  }

  // Duplicate period guard (app-level + DB unique index backup)
  const existing = await c.env.DB.prepare(
    `SELECT id FROM profit_distributions 
     WHERE project_id = ? AND period_start = ? AND period_end = ? AND status = 'distributed'`
  ).bind(projectId, data.period_start, data.period_end).first<{ id: number }>()
  if (existing) return err(c, 'এই সময়ের জন্য ইতিমধ্যে প্রফিট ডিস্ট্রিবিউট করা হয়েছে', 409)

  // Overlapping period detection
  const overlap = await c.env.DB.prepare(
    `SELECT id, period_start, period_end FROM profit_distributions 
     WHERE project_id = ? AND status = 'distributed'
     AND period_start IS NOT NULL AND period_end IS NOT NULL
     AND period_start <= ? AND period_end >= ?`
  ).bind(projectId, data.period_end, data.period_start).first<{ id: number; period_start: string; period_end: string }>()
  if (overlap) {
    return err(c, `এই পিরিয়ড পূর্ববর্তী ডিস্ট্রিবিউশন #${overlap.id} (${overlap.period_start} → ${overlap.period_end}) এর সাথে ওভারল্যাপ করছে`, 409)
  }

  const snapshot = await getProjectFinancials(c.env.DB, projectId)
  const fin = buildProfitDistributionSummary(snapshot, data.company_share_percentage)
  if (fin.availableProfit <= 0) return err(c, 'ডিস্ট্রিবিউট করার মতো লাভ নেই!', 400)
  const companyShareAmount = fin.companyShareAmount
  const investorPool = fin.investorPool

  const shareholders = await c.env.DB.prepare(
    `SELECT user_id, quantity as shares_held FROM user_shares WHERE project_id = ? AND quantity > 0`
  ).bind(projectId).all<{ user_id: number; shares_held: number }>()

  if (shareholders.results.length === 0) return err(c, 'কোনো শেয়ারহোল্ডার নেই!', 400)

  const totalSharesSold = shareholders.results.reduce((s, sh) => s + sh.shares_held, 0)

  // 1. Create distribution batch (initially 'pending')
  const supportsCompanyShareAmount = await hasColumn(c.env.DB, 'profit_distributions', 'company_share_amount')
  const supportsTotalDistributedAmount = await hasColumn(c.env.DB, 'profit_distributions', 'total_distributed_amount')
  const supportsNotes = await hasColumn(c.env.DB, 'profit_distributions', 'notes')
  const supportsShareholdersCount = await hasColumn(c.env.DB, 'profit_distributions', 'shareholders_count')

  const insertColumns = [
    'project_id',
    'total_revenue',
    'total_expense',
    'net_profit',
    'distributable_amount'
  ]
  const insertValues: Array<string | number | null> = [
    projectId,
    fin.totalRevenue,
    fin.totalExpense,
    fin.netProfit,
    investorPool
  ]

  if (supportsCompanyShareAmount) {
    insertColumns.push('company_share_amount')
    insertValues.push(companyShareAmount)
  }
  if (supportsTotalDistributedAmount) {
    insertColumns.push('total_distributed_amount')
    insertValues.push(fin.availableProfit)
  }

  insertColumns.push('company_share_percentage', 'investor_share_percentage', 'period_start', 'period_end')
  insertValues.push(data.company_share_percentage * 100, (100 - data.company_share_percentage) * 100, data.period_start, data.period_end)

  if (supportsNotes) {
    insertColumns.push('notes')
    insertValues.push(data.notes ?? null)
  }
  if (supportsShareholdersCount) {
    insertColumns.push('shareholders_count')
    insertValues.push(shareholders.results.length)
  }

  insertColumns.push('status', 'distributed_at', 'created_by')
  insertValues.push('pending', null, userId)

  const placeholders = insertColumns.map(() => '?').join(', ')
  const distResult = await c.env.DB.prepare(
    `INSERT INTO profit_distributions (${insertColumns.join(', ')}) VALUES (${placeholders})`
  ).bind(...insertValues).run()

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
         ON CONFLICT(user_id, project_id, month) DO UPDATE SET amount = amount + excluded.amount, rate = excluded.rate, shares = excluded.shares`
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
    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE profit_distributions SET status = 'cancelled' WHERE id = ?`
      ).bind(distributionId),
      auditLog(c.env.DB, {
        entity_type: 'profit_distribution',
        entity_id: distributionId as number,
        action: 'cancel',
        new_values: { reason: 'all_batches_failed', failed_count: failedCount },
        amount_paisa: fin.availableProfit,
        description: `ডিস্ট্রিবিউশন #${distributionId} ব্যর্থ — সব শেয়ারহোল্ডারে পেমেন্ট ব্যর্থ`,
        actor_id: userId
      })
    ])
    return err(c, 'প্রফিট ডিস্ট্রিবিউশন ব্যর্থ — কোনো শেয়ারহোল্ডারকে পেমেন্ট করা যায়নি', 500)
  }

  // 5. Mark distributed + record company fund + audit log (atomic batch)
  const finalizeStatements: D1PreparedStatement[] = [
    c.env.DB.prepare(
      `UPDATE profit_distributions 
       SET status = 'distributed', distributed_at = datetime('now') 
       WHERE id = ?`
    ).bind(distributionId)
  ]

  if (await hasTable(c.env.DB, 'company_fund_transactions')) {
    const companyFundHasStatus = await hasColumn(c.env.DB, 'company_fund_transactions', 'status')
    const companyFundColumns = [
      'project_id',
      'distribution_id',
      'amount_paisa',
      'transaction_type',
      'description',
      'reference_type',
      'reference_id'
    ]
    const companyFundValues: Array<string | number> = [
      projectId,
      distributionId as number,
      companyShareAmount,
      'profit_share',
      `"${project.title}" প্রজেক্ট থেকে কোম্পানির প্রফিট শেয়ার (${data.company_share_percentage}%)`,
      'profit_distribution',
      distributionId as number
    ]
    if (companyFundHasStatus) {
      companyFundColumns.push('status')
      companyFundValues.push('completed')
    }
    companyFundColumns.push('created_by')
    companyFundValues.push(userId)

    finalizeStatements.push(
      c.env.DB.prepare(
        `INSERT INTO company_fund_transactions (${companyFundColumns.join(', ')}) VALUES (${companyFundColumns.map(() => '?').join(', ')})`
      ).bind(...companyFundValues)
    )
  }

  if (await hasTable(c.env.DB, 'financial_audit_log')) {
    finalizeStatements.push(
      auditLog(c.env.DB, {
        entity_type: 'profit_distribution',
        entity_id: distributionId as number,
        action: 'distribute',
        new_values: {
          project_id: projectId,
          investor_pool: investorPool,
          company_share: companyShareAmount,
          total_distributed: fin.availableProfit,
          shareholders_count: shareholders.results.length - failedCount,
          failed_count: failedCount,
          period: `${data.period_start} → ${data.period_end}`,
          company_pct: data.company_share_percentage
        },
        amount_paisa: fin.availableProfit,
        description: `"${project.title}" — ৳${(fin.availableProfit / 100).toFixed(0)} বিতরণ (${shareholders.results.length - failedCount} জন)`,
        actor_id: userId
      })
    )

    finalizeStatements.push(
      auditLog(c.env.DB, {
        entity_type: 'company_fund',
        entity_id: distributionId as number,
        action: 'credit',
        new_values: { project_id: projectId, amount: companyShareAmount, pct: data.company_share_percentage },
        amount_paisa: companyShareAmount,
        description: `কোম্পানি ফান্ডে ৳${(companyShareAmount / 100).toFixed(0)} জমা`,
        actor_id: userId
      })
    )
  }

  await c.env.DB.batch(finalizeStatements)

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

  // ⚡ Bolt: Use db.batch() instead of Promise.all to prevent per-query HTTP network overhead in D1
  const [rowsRes, countRowRes] = await c.env.DB.batch<any>([
    c.env.DB.prepare(
      `SELECT pd.*, u.name as created_by_name
       FROM profit_distributions pd
       LEFT JOIN users u ON u.id = pd.created_by
       WHERE pd.project_id = ?
       ORDER BY pd.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(projectId, limit, offset),
    c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM profit_distributions WHERE project_id = ?'
    ).bind(projectId)
  ])

  const countRow = countRowRes.results?.[0]

  return ok(c, {
    items: rowsRes.results,
    pagination: { page, limit, total: countRow?.total ?? 0, hasMore: page * limit < (countRow?.total ?? 0) }
  })
})

// ──────────────────────────────────────────────────────────────
// GET /distribution/:id — Single distribution details
// ──────────────────────────────────────────────────────────────
profitRoutes.get('/distribution/:id', async (c) => {
  const distId = parseInt(c.req.param('id'))
  if (isNaN(distId)) return err(c, 'অকার্যকর আইডি')

  // ⚡ Bolt: Use db.batch() instead of Promise.all to prevent per-query HTTP network overhead in D1
  const [distributionRes, shareholdersRes] = await c.env.DB.batch<any>([
    c.env.DB.prepare(
      `SELECT pd.*, p.title as project_title, u.name as created_by_name
       FROM profit_distributions pd
       JOIN projects p ON p.id = pd.project_id
       LEFT JOIN users u ON u.id = pd.created_by
       WHERE pd.id = ?`
    ).bind(distId),
    c.env.DB.prepare(
      `SELECT sp.*, u.name as user_name, u.phone
       FROM shareholder_profits sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.distribution_id = ?
       ORDER BY sp.profit_amount DESC`
    ).bind(distId)
  ])

  const distribution = distributionRes.results?.[0]

  if (!distribution) return err(c, 'ডিস্ট্রিবিউশন পাওয়া যায়নি', 404)
  return ok(c, { distribution, shareholders: shareholdersRes.results })
})

// ──────────────────────────────────────────────────────────────
// GET /company-fund — Company fund summary + transaction history
// ──────────────────────────────────────────────────────────────
profitRoutes.get('/company-fund', async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit

  // ⚡ Bolt: Use db.batch() instead of Promise.all to prevent per-query HTTP network overhead in D1
  const [summaryRes, transactionsRes, countRowRes, pendingCountRes] = await c.env.DB.batch<any>([
    c.env.DB.prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN amount_paisa > 0 AND status IN ('completed', 'approved') THEN amount_paisa ELSE 0 END), 0) as total_credited,
        COALESCE(SUM(CASE WHEN amount_paisa < 0 AND status IN ('completed', 'approved') THEN ABS(amount_paisa) ELSE 0 END), 0) as total_debited,
        COALESCE(SUM(CASE WHEN status IN ('completed', 'approved') THEN amount_paisa ELSE 0 END), 0) as current_balance
       FROM company_fund_transactions`
    ),

    c.env.DB.prepare(
      `SELECT cft.*, p.title as project_title, u.name as created_by_name, u2.name as approved_by_name
       FROM company_fund_transactions cft
       LEFT JOIN projects p ON p.id = cft.project_id
       LEFT JOIN users u ON u.id = cft.created_by
       LEFT JOIN users u2 ON u2.id = cft.approved_by
       ORDER BY cft.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(limit, offset),

    c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM company_fund_transactions'
    ),

    c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM company_fund_transactions WHERE status = 'pending_approval'`
    )
  ])

  const summary = summaryRes.results?.[0]
  const countRow = countRowRes.results?.[0]
  const pendingCount = pendingCountRes.results?.[0]

  return ok(c, {
    summary: {
      current_balance: summary?.current_balance ?? 0,
      total_credited: summary?.total_credited ?? 0,
      total_debited: summary?.total_debited ?? 0,
      pending_approvals: pendingCount?.count ?? 0
    },
    transactions: transactionsRes.results,
    pagination: {
      page, limit,
      total: countRow?.total ?? 0,
      hasMore: page * limit < (countRow?.total ?? 0)
    }
  })
})

// ──────────────────────────────────────────────────────────────
// POST /company-fund/withdraw — Admin requests withdrawal (pending approval)
// ──────────────────────────────────────────────────────────────
const withdrawFundSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().min(1, 'উদ্দেশ্য লিখুন'),
  transaction_type: z.enum(['withdrawal', 'expense']).default('withdrawal')
})

profitRoutes.post('/company-fund/withdraw', zValidator('json', withdrawFundSchema), async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')

  // Check available balance (only completed/approved transactions count)
  const summary = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(CASE WHEN status IN ('completed', 'approved') THEN amount_paisa ELSE 0 END), 0) as current_balance
     FROM company_fund_transactions`
  ).first<{ current_balance: number }>()

  const balance = summary?.current_balance ?? 0
  if (data.amount > balance) {
    return err(c, `অপর্যাপ্ত ফান্ড। বর্তমান ব্যালেন্স: ৳${(balance / 100).toFixed(2)}`, 400)
  }

  // Check if there are other admins in the system for dual-approval
  const adminCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND id != ?`
  ).bind(userId).first<{ count: number }>()

  const needsApproval = (adminCount?.count ?? 0) > 0

  const result = await c.env.DB.prepare(
    `INSERT INTO company_fund_transactions 
     (amount_paisa, transaction_type, description, reference_type, status, created_by)
     VALUES (?, ?, ?, 'manual', ?, ?)`
  ).bind(
    -data.amount,
    data.transaction_type,
    data.description,
    needsApproval ? 'pending_approval' : 'completed',  // single-admin override
    userId
  ).run()

  if (!result.success) return err(c, 'ট্রানজেকশন সংরক্ষণ ব্যর্থ', 500)

  const txnId = result.meta.last_row_id

  // Audit log
  await auditLog(c.env.DB, {
    entity_type: 'company_fund',
    entity_id: txnId as number,
    action: needsApproval ? 'create' : 'withdraw',
    new_values: { amount: data.amount, type: data.transaction_type, description: data.description, needs_approval: needsApproval },
    amount_paisa: data.amount,
    description: needsApproval
      ? `উত্তোলন অনুরোধ: ৳${(data.amount / 100).toFixed(0)} — অনুমোদনের অপেক্ষায়`
      : `একক-এডমিন উত্তোলন: ৳${(data.amount / 100).toFixed(0)}`,
    actor_id: userId
  }).run()

  if (needsApproval) {
    return ok(c, {
      message: 'উত্তোলন অনুরোধ তৈরি হয়েছে — অন্য একজন এডমিনের অনুমোদন প্রয়োজন',
      transaction_id: txnId,
      status: 'pending_approval'
    }, 201)
  }

  return ok(c, {
    message: 'কোম্পানি ফান্ড থেকে সফলভাবে সরানো হয়েছে',
    transaction_id: txnId,
    new_balance: balance - data.amount,
    status: 'completed'
  })
})

// ──────────────────────────────────────────────────────────────
// POST /company-fund/approve/:id — Second admin approves withdrawal
// ──────────────────────────────────────────────────────────────
profitRoutes.post('/company-fund/approve/:id', async (c) => {
  const txnId = parseInt(c.req.param('id'))
  if (isNaN(txnId)) return err(c, 'অকার্যকর আইডি')

  const approverId = c.get('userId')

  const txn = await c.env.DB.prepare(
    `SELECT * FROM company_fund_transactions WHERE id = ? AND status = 'pending_approval'`
  ).bind(txnId).first<{ id: number; amount_paisa: number; created_by: number; description: string }>()

  if (!txn) return err(c, 'এই ট্রানজেকশন পাওয়া যায়নি বা ইতিমধ্যে প্রক্রিয়া হয়ে গেছে', 404)

  // Guard: requesting admin ≠ approving admin
  if (txn.created_by === approverId) {
    return err(c, 'নিজের অনুরোধ নিজে অনুমোদন করা যাবে না', 403)
  }

  // Check balance again before approving
  const summary = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(CASE WHEN status IN ('completed', 'approved') THEN amount_paisa ELSE 0 END), 0) as current_balance
     FROM company_fund_transactions`
  ).first<{ current_balance: number }>()

  const balance = summary?.current_balance ?? 0
  const withdrawAmount = Math.abs(txn.amount_paisa)
  if (withdrawAmount > balance) {
    return err(c, `অপর্যাপ্ত ফান্ড। বর্তমান ব্যালেন্স: ৳${(balance / 100).toFixed(2)}`, 400)
  }

  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE company_fund_transactions 
       SET status = 'approved', approved_by = ?, approved_at = datetime('now')
       WHERE id = ?`
    ).bind(approverId, txnId),

    auditLog(c.env.DB, {
      entity_type: 'company_fund',
      entity_id: txnId,
      action: 'approve',
      old_values: { status: 'pending_approval' },
      new_values: { status: 'approved', approved_by: approverId },
      amount_paisa: withdrawAmount,
      description: `উত্তোলন অনুমোদিত: ৳${(withdrawAmount / 100).toFixed(0)}`,
      actor_id: approverId
    })
  ])

  return ok(c, {
    message: 'উত্তোলন অনুমোদিত হয়েছে',
    new_balance: balance - withdrawAmount
  })
})

// ──────────────────────────────────────────────────────────────
// POST /company-fund/reject/:id — Second admin rejects withdrawal
// ──────────────────────────────────────────────────────────────
const rejectSchema = z.object({
  reason: z.string().min(1, 'বাতিলের কারণ লিখুন')
})

profitRoutes.post('/company-fund/reject/:id', zValidator('json', rejectSchema), async (c) => {
  const txnId = parseInt(c.req.param('id'))
  if (isNaN(txnId)) return err(c, 'অকার্যকর আইডি')

  const rejecterId = c.get('userId')
  const { reason } = c.req.valid('json')

  const txn = await c.env.DB.prepare(
    `SELECT * FROM company_fund_transactions WHERE id = ? AND status = 'pending_approval'`
  ).bind(txnId).first<{ id: number; created_by: number; amount_paisa: number }>()

  if (!txn) return err(c, 'এই ট্রানজেকশন পাওয়া যায়নি বা ইতিমধ্যে প্রক্রিয়া হয়ে গেছে', 404)

  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE company_fund_transactions 
       SET status = 'rejected', approved_by = ?, approved_at = datetime('now'), rejection_reason = ?
       WHERE id = ?`
    ).bind(rejecterId, reason, txnId),

    auditLog(c.env.DB, {
      entity_type: 'company_fund',
      entity_id: txnId,
      action: 'reject',
      old_values: { status: 'pending_approval' },
      new_values: { status: 'rejected', rejected_by: rejecterId, reason },
      amount_paisa: Math.abs(txn.amount_paisa),
      description: `উত্তোলন বাতিল: ${reason}`,
      actor_id: rejecterId
    })
  ])

  return ok(c, { message: 'উত্তোলন অনুরোধ বাতিল করা হয়েছে' })
})

// ──────────────────────────────────────────────────────────────
// GET /audit-log — Financial audit log (admin only)
// ──────────────────────────────────────────────────────────────
profitRoutes.get('/audit-log', async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '30'), 100)
  const offset = (page - 1) * limit
  const entityType = c.req.query('entity_type') || null
  const action = c.req.query('action') || null

  let query = `SELECT fal.*, u.name as actor_name
     FROM financial_audit_log fal
     LEFT JOIN users u ON u.id = fal.actor_id
     WHERE 1=1`
  let countQuery = `SELECT COUNT(*) as total FROM financial_audit_log WHERE 1=1`
  const params: (string | number)[] = []
  const countParams: (string | number)[] = []

  if (entityType) {
    query += ` AND fal.entity_type = ?`
    countQuery += ` AND entity_type = ?`
    params.push(entityType)
    countParams.push(entityType)
  }
  if (action) {
    query += ` AND fal.action = ?`
    countQuery += ` AND action = ?`
    params.push(action)
    countParams.push(action)
  }

  query += ` ORDER BY fal.created_at DESC LIMIT ? OFFSET ?`
  params.push(limit, offset)

  // ⚡ Bolt: Use db.batch() instead of Promise.all to prevent per-query HTTP network overhead in D1
  const [rowsRes, countRowRes] = await c.env.DB.batch<any>([
    c.env.DB.prepare(query).bind(...params),
    c.env.DB.prepare(countQuery).bind(...countParams)
  ])

  const countRow = countRowRes.results?.[0]

  return ok(c, {
    items: rowsRes.results,
    pagination: { page, limit, total: countRow?.total ?? 0, hasMore: page * limit < (countRow?.total ?? 0) }
  })
})

// ──────────────────────────────────────────────────────────────
// GET /my-profits — User's own profit history (non-admin)
// ──────────────────────────────────────────────────────────────
const userProfitRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
userProfitRoutes.use('*', authMiddleware)

userProfitRoutes.get('/my-profits', async (c) => {
  const userId = c.get('userId')

  // ⚡ Bolt: Use db.batch() instead of Promise.all to prevent per-query HTTP network overhead in D1
  const [profitsRes, summaryRes] = await c.env.DB.batch<any>([
    c.env.DB.prepare(
      `SELECT sp.*, p.title as project_title, pd.distributed_at, pd.notes as distribution_notes,
              pd.period_start, pd.period_end
       FROM shareholder_profits sp
       JOIN projects p ON p.id = sp.project_id
       JOIN profit_distributions pd ON pd.id = sp.distribution_id
       WHERE sp.user_id = ?
       ORDER BY pd.distributed_at DESC`
    ).bind(userId),
    c.env.DB.prepare(
      `SELECT 
        COUNT(*) as total_distributions,
        COALESCE(SUM(profit_amount), 0) as total_profit_earned,
        COUNT(DISTINCT project_id) as projects_count
       FROM shareholder_profits WHERE user_id = ?`
    ).bind(userId)
  ])

  const summary = summaryRes.results?.[0]

  return ok(c, {
    profits: profitsRes.results,
    summary: {
      total_distributions: summary?.total_distributions ?? 0,
      total_profit_earned: summary?.total_profit_earned ?? 0,
      projects_count: summary?.projects_count ?? 0
    }
  })
})

export { profitRoutes, userProfitRoutes }
