import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err, getPagination, paginate } from '../lib/response'
import { checkRateLimit } from '../lib/rate-limiter'
import { evaluateCloseout, type CloseoutMode } from '../lib/project-closeout'
import {
  defaultComplianceProfile,
  evaluateComplianceForCloseout,
  type ProjectComplianceProfile
} from '../lib/project-compliance'
import type {
  Bindings,
  Variables,
  Project,
  ProjectCloseoutRun,
  ProjectMember
} from '../types'

export const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
const schemaSupportCache = new Map<string, boolean>()

// XSS Prevention: Escape HTML special characters
// NOTE: Do NOT escape forward slashes — this is a JSON API, not HTML output.
// React already escapes output in JSX, so we only guard against stored XSS.
function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// Apply sanitization to string fields in an object
function sanitizeObject<T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): T {
  const sanitized = { ...obj }
  for (const field of fields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeHtml(sanitized[field] as string) as T[keyof T]
    }
  }
  return sanitized
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

async function getShareholderSnapshot(db: D1Database, projectId: number) {
  const result = await db.prepare(
    `SELECT us.user_id, us.quantity, u.name as user_name, u.phone as user_phone
     FROM user_shares us
     JOIN users u ON u.id = us.user_id
     WHERE us.project_id = ? AND us.quantity > 0
     ORDER BY us.quantity DESC, us.user_id ASC`
  ).bind(projectId).all<{ user_id: number; quantity: number; user_name: string; user_phone: string | null }>()

  const totalShares = result.results.reduce((sum, row) => sum + row.quantity, 0)

  return {
    totalShares,
    shareholders: result.results.map((row) => ({
      ...row,
      ownership_bps: totalShares > 0 ? Math.floor((row.quantity * 10000) / totalShares) : 0
    }))
  }
}

async function getCompletedCloseoutRun(db: D1Database, projectId: number) {
  if (!(await hasTable(db, 'project_closeout_runs'))) return null

  return db.prepare(
    `SELECT * FROM project_closeout_runs
     WHERE project_id = ? AND status = 'completed'
     ORDER BY id DESC
     LIMIT 1`
  ).bind(projectId).first<ProjectCloseoutRun>()
}

async function getProjectCloseoutPreview(db: D1Database, projectId: number, mode: CloseoutMode) {
  const project = await db.prepare(
    'SELECT id, title, status, share_price, total_shares, total_capital, completed_at FROM projects WHERE id = ?'
  ).bind(projectId).first<{
    id: number
    title: string
    status: string
    share_price: number
    total_shares: number
    total_capital: number
    completed_at: string | null
  }>()

  if (!project) return null

  const hasTotalDistributedAmount = await hasColumn(db, 'profit_distributions', 'total_distributed_amount')
  const distributedColumn = hasTotalDistributedAmount ? 'total_distributed_amount' : 'distributable_amount'

  const [pendingPurchases, pendingExpenseAllocations, financials, companyAllocations, distributed, soldShares, existingRefund, complianceProfile, completedCloseoutRun, shareholderSnapshot] = await Promise.all([
    db.prepare(
      `SELECT COUNT(*) as cnt FROM share_purchases WHERE project_id = ? AND status = 'pending'`
    ).bind(projectId).first<{ cnt: number }>(),
    db.prepare(
      `SELECT COUNT(*) as cnt
       FROM company_expenses
       WHERE is_allocated = 0 AND allocation_method != 'company_only'`
    ).first<{ cnt: number }>(),
    db.prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'revenue' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as direct_expense
       FROM project_transactions
       WHERE project_id = ?`
    ).bind(projectId).first<{ total_revenue: number; direct_expense: number }>(),
    db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expense_allocations WHERE project_id = ?`
    ).bind(projectId).first<{ total: number }>(),
    db.prepare(
      `SELECT COALESCE(SUM(${distributedColumn}), 0) as total
       FROM profit_distributions
       WHERE project_id = ? AND status = 'distributed'`
    ).bind(projectId).first<{ total: number }>(),
    db.prepare(
      `SELECT COALESCE(SUM(quantity), 0) as total FROM user_shares WHERE project_id = ? AND quantity > 0`
    ).bind(projectId).first<{ total: number }>(),
    db.prepare(
      `SELECT id FROM balance_audit_log
       WHERE reference_type = 'capital_refund' AND reference_id = ?
       LIMIT 1`
    ).bind(projectId).first<{ id: number }>()
    ,
    db.prepare(
      `SELECT * FROM project_compliance_profiles WHERE project_id = ?`
    ).bind(projectId).first<ProjectComplianceProfile>()
    ,
    getCompletedCloseoutRun(db, projectId),
    getShareholderSnapshot(db, projectId)
  ])

  const totalRevenue = financials?.total_revenue ?? 0
  const directExpense = financials?.direct_expense ?? 0
  const companyExpenseAllocation = companyAllocations?.total ?? 0
  const netProfit = totalRevenue - directExpense - companyExpenseAllocation
  const previouslyDistributed = distributed?.total ?? 0
  const availableProfit = Math.max(0, netProfit - previouslyDistributed)
  const totalSharesSold = soldShares?.total ?? 0
  const capitalRefundTotal = totalSharesSold * project.share_price
  const compliance = complianceProfile ?? defaultComplianceProfile(projectId)

  const evaluation = evaluateCloseout({
    projectStatus: project.status,
    pendingSharePurchases: pendingPurchases?.cnt ?? 0,
    pendingExpenseAllocations: pendingExpenseAllocations?.cnt ?? 0,
    availableProfit,
    netProfit,
    capitalAlreadyRefunded: !!existingRefund
  })
  const complianceBlockers = evaluateComplianceForCloseout({
    profile: compliance,
    netProfit
  })

  const settlementProjection = shareholderSnapshot.shareholders.map((row) => ({
    user_id: row.user_id,
    user_name: row.user_name,
    user_phone: row.user_phone,
    shares_held: row.quantity,
    ownership_bps: row.ownership_bps,
    principal_refund_amount: row.quantity * project.share_price,
    final_profit_amount: shareholderSnapshot.totalShares > 0
      ? Math.floor((availableProfit * row.quantity) / shareholderSnapshot.totalShares)
      : 0
  }))

  return {
    project,
    mode,
    can_closeout: evaluation.canCloseout && complianceBlockers.length === 0,
    blockers: [...evaluation.blockers, ...complianceBlockers],
    existing_closeout_run: completedCloseoutRun
      ? {
          id: completedCloseoutRun.id,
          status: completedCloseoutRun.status,
          executed_at: completedCloseoutRun.executed_at
        }
      : null,
    financials: {
      total_revenue: totalRevenue,
      direct_expense: directExpense,
      company_expense_allocation: companyExpenseAllocation,
      net_profit: netProfit,
      previously_distributed: previouslyDistributed,
      available_profit: availableProfit
    },
    settlement: {
      total_shares_sold: totalSharesSold,
      capital_refund_total: capitalRefundTotal,
      final_profit_pool: availableProfit,
      pending_share_purchases: pendingPurchases?.cnt ?? 0,
      pending_expense_allocations: pendingExpenseAllocations?.cnt ?? 0
    },
    settlement_projection: settlementProjection,
    compliance: {
      contract_type: compliance.contract_type,
      shariah_screening_status: compliance.shariah_screening_status,
      ops_reconciliation_status: compliance.ops_reconciliation_status,
      loss_settlement_status: compliance.loss_settlement_status
    }
  }
}

async function executeCapitalRefund(c: any, projectId: number, project: { share_price: number }, status: CloseoutMode) {
  const existingRefund = await (c.env.DB.prepare(
    `SELECT id FROM balance_audit_log
     WHERE reference_type = 'capital_refund' AND reference_id = ?
     LIMIT 1`
  ).bind(projectId).first() as Promise<{ id: number } | null>)

  if (existingRefund) {
    throw new Error('এই প্রজেক্টের মূলধন ইতিমধ্যে ফেরত দেওয়া হয়েছে')
  }

  const shareholders = await (c.env.DB.prepare(
    'SELECT user_id, quantity FROM user_shares WHERE project_id = ? AND quantity > 0'
  ).bind(projectId).all() as Promise<{ results: Array<{ user_id: number; quantity: number }> }>)

  if (shareholders.results.length === 0) {
    return { shareholdersCount: 0, totalRefunded: 0 }
  }

  const adminId = c.get('userId')
  const refundMonth = 'refund-' + new Date().toISOString().slice(0, 7)
  const statements: D1PreparedStatement[] = []
  let totalRefunded = 0

  for (const sh of shareholders.results) {
    const refundAmount = sh.quantity * project.share_price
    totalRefunded += refundAmount

    statements.push(
      c.env.DB.prepare(
        `INSERT INTO earnings (user_id, project_id, month, shares, rate, amount)
         VALUES (?, ?, ?, ?, 0, ?)
         ON CONFLICT(user_id, project_id, month) DO UPDATE SET amount = amount + excluded.amount`
      ).bind(sh.user_id, projectId, refundMonth, sh.quantity, refundAmount)
    )

    statements.push(
      c.env.DB.prepare(
        `INSERT INTO user_balances (user_id, total_earned_paisa, total_withdrawn_paisa, reserved_paisa, updated_at)
         VALUES (?, ?, 0, 0, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           total_earned_paisa = total_earned_paisa + excluded.total_earned_paisa,
           updated_at = datetime('now')`
      ).bind(sh.user_id, refundAmount)
    )

    statements.push(
      c.env.DB.prepare(
        `INSERT INTO balance_audit_log (user_id, amount_paisa, change_type, reference_type, reference_id, admin_id, note)
         VALUES (?, ?, 'earn', 'capital_refund', ?, ?, ?)`
      ).bind(sh.user_id, refundAmount, projectId, adminId, `Capital refund for project ${projectId} ${status}`)
    )
  }

  for (let i = 0; i < statements.length; i += 100) {
    await c.env.DB.batch(statements.slice(i, i + 100))
  }

  return {
    shareholdersCount: shareholders.results.length,
    totalRefunded
  }
}

async function createCloseoutSettlementEntries(
  c: any,
  projectId: number,
  preview: Awaited<ReturnType<typeof getProjectCloseoutPreview>>,
  mode: CloseoutMode
) {
  if (!preview) throw new Error('Closeout preview পাওয়া যায়নি')
  if (!(await hasTable(c.env.DB, 'project_closeout_runs')) || !(await hasTable(c.env.DB, 'project_settlement_entries'))) {
    return null
  }

  const existingRun = await getCompletedCloseoutRun(c.env.DB, projectId)
  if (existingRun) {
    throw new Error('এই প্রজেক্টের closeout settlement ইতিমধ্যে তৈরি হয়েছে')
  }

  const adminId = c.get('userId')
  const runResult = await c.env.DB.prepare(
    `INSERT INTO project_closeout_runs (
      project_id, mode, status, net_profit_paisa, capital_refund_total_paisa,
      final_profit_pool_paisa, shareholders_count, executed_by, executed_at
    ) VALUES (?, ?, 'completed', ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    projectId,
    mode,
    preview.financials.net_profit,
    preview.settlement.capital_refund_total,
    preview.settlement.final_profit_pool,
    preview.settlement_projection.length,
    adminId
  ).run()

  const closeoutRunId = runResult.meta.last_row_id
  const statements: D1PreparedStatement[] = []

  for (const shareholder of preview.settlement_projection) {
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO project_settlement_entries (
          project_id, user_id, closeout_run_id, entry_type, amount_paisa,
          shares_held_snapshot, total_shares_snapshot, ownership_bps_snapshot,
          project_status_snapshot, source_reference_type, source_reference_id,
          claim_status, notes, created_by
        ) VALUES (?, ?, ?, 'principal_refund', ?, ?, ?, ?, ?, 'project_closeout', ?, 'claimable', ?, ?)`
      ).bind(
        projectId,
        shareholder.user_id,
        closeoutRunId,
        shareholder.principal_refund_amount,
        shareholder.shares_held,
        preview.settlement.total_shares_sold,
        shareholder.ownership_bps,
        preview.project.status,
        closeoutRunId,
        `Principal refund generated during project ${mode} closeout`,
        adminId
      )
    )

    if (shareholder.final_profit_amount > 0) {
      statements.push(
        c.env.DB.prepare(
          `INSERT INTO project_settlement_entries (
            project_id, user_id, closeout_run_id, entry_type, amount_paisa,
            shares_held_snapshot, total_shares_snapshot, ownership_bps_snapshot,
            project_status_snapshot, source_reference_type, source_reference_id,
            claim_status, notes, created_by
          ) VALUES (?, ?, ?, 'final_profit_payout', ?, ?, ?, ?, ?, 'project_closeout', ?, 'claimable', ?, ?)`
        ).bind(
          projectId,
          shareholder.user_id,
          closeoutRunId,
          shareholder.final_profit_amount,
          shareholder.shares_held,
          preview.settlement.total_shares_sold,
          shareholder.ownership_bps,
          preview.project.status,
          closeoutRunId,
          `Final profit generated during project ${mode} closeout`,
          adminId
        )
      )
    }
  }

  for (let i = 0; i < statements.length; i += 100) {
    await c.env.DB.batch(statements.slice(i, i + 100))
  }

  return {
    closeoutRunId,
    entriesCount: statements.length
  }
}

function isTestProjectTitle(title: string) {
  return /\b(test|demo|sandbox|sample|trial)\b/i.test(title)
}

adminRoutes.use('*', authMiddleware)
adminRoutes.use('*', adminMiddleware)

// Rate limiting middleware for admin endpoints
adminRoutes.use('*', async (c, next) => {
  const userId = c.get('userId')
  const rateLimit = await checkRateLimit(c.env, `admin:${userId}`, 100, 60)
  if (!rateLimit.allowed) {
    return err(c, 'Too many requests. Please try again later.', 429)
  }
  await next()
})

// ─── R2 PUBLIC URL ────────────────────────────────────────────────────────────

adminRoutes.get('/r2-url', (c) => {
  return ok(c, { url: c.env.R2_PUBLIC_URL ?? '' })
})

// ─── USERS ────────────────────────────────────────────────────────────────────

adminRoutes.get('/users', async (c) => {
  const { page, limit, offset } = getPagination(c.req.query())
  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id, name, phone, role, referral_code, referred_by, is_active, created_at
       FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(limit, offset).all(),
    c.env.DB.prepare('SELECT COUNT(*) as total FROM users').first<{ total: number }>()
  ])
  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})

adminRoutes.get('/users/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const user = await c.env.DB.prepare(
    'SELECT id, name, phone, role, referral_code, referred_by, is_active, created_at FROM users WHERE id = ?'
  ).bind(id).first()
  if (!user) return err(c, 'ব্যবহারকারী পাওয়া যায়নি', 404)

  const [shares, earnings] = await Promise.all([
    c.env.DB.prepare(
      `SELECT us.*, p.title FROM user_shares us JOIN projects p ON p.id = us.project_id WHERE us.user_id = ?`
    ).bind(id).all(),
    c.env.DB.prepare(
      'SELECT COALESCE(SUM(amount),0) as total FROM earnings WHERE user_id = ?'
    ).bind(id).first<{ total: number }>()
  ])

  return ok(c, { ...user, shares: shares.results, total_earnings_paisa: earnings?.total ?? 0 })
})

adminRoutes.patch('/users/:id/toggle', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const user = await c.env.DB.prepare('SELECT is_active FROM users WHERE id = ?').bind(id).first<{ is_active: number }>()
  if (!user) return err(c, 'ব্যবহারকারী পাওয়া যায়নি', 404)
  await c.env.DB.prepare('UPDATE users SET is_active = ? WHERE id = ?').bind(user.is_active ? 0 : 1, id).run()
  return ok(c, { message: user.is_active ? 'অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে' : 'অ্যাকাউন্ট সক্রিয় করা হয়েছে' })
})

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

const projectSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal('')),
  total_capital: z.number().int().positive(),   // paisa
  total_shares: z.number().int().positive(),
  share_price: z.number().int().positive(),      // paisa
  status: z.enum(['draft', 'active', 'closed', 'completed']).optional(),
  // Optional enhanced fields
  location: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'তারিখ YYYY-MM-DD ফরম্যাটে দিন').optional(),
  expected_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'তারিখ YYYY-MM-DD ফরম্যাটে দিন').optional(),
  progress_pct: z.number().int().min(0).max(100).optional(),
})

const complianceProfileSchema = z.object({
  contract_type: z.enum(['musharakah', 'mudarabah', 'other']),
  shariah_screening_status: z.enum(['pending', 'approved', 'rejected', 'needs_revision']),
  ops_reconciliation_status: z.enum(['pending', 'completed', 'blocked']),
  loss_settlement_status: z.enum(['not_applicable', 'pending_review', 'resolved', 'blocked']),
  prohibited_activities_screened: z.boolean(),
  asset_backing_confirmed: z.boolean(),
  profit_ratio_disclosed: z.boolean(),
  loss_sharing_clause_confirmed: z.boolean(),
  principal_risk_notice_confirmed: z.boolean(),
  use_of_proceeds: z.string().max(3000).optional().or(z.literal('')),
  profit_loss_policy: z.string().max(3000).optional().or(z.literal('')),
  principal_risk_notice: z.string().max(3000).optional().or(z.literal('')),
  shariah_notes: z.string().max(3000).optional().or(z.literal('')),
  ops_notes: z.string().max(3000).optional().or(z.literal('')),
  loss_settlement_notes: z.string().max(3000).optional().or(z.literal('')),
  external_reviewer_name: z.string().max(255).optional().or(z.literal(''))
})

adminRoutes.get('/projects', async (c) => {
  const { page, limit, offset } = getPagination(c.req.query())
  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT p.*,
         COALESCE((SELECT SUM(us.quantity) FROM user_shares us WHERE us.project_id = p.id), 0) as sold_shares
       FROM projects p ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
    ).bind(limit, offset).all(),
    c.env.DB.prepare('SELECT COUNT(*) as total FROM projects').first<{ total: number }>()
  ])
  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})

adminRoutes.post('/projects', zValidator('json', projectSchema), async (c) => {
  const body = c.req.valid('json')
  const sanitizedBody = sanitizeObject(body as Record<string, unknown>, ['title', 'description', 'location', 'category']) as typeof body
  const result = await c.env.DB.prepare(
    `INSERT INTO projects (title, description, image_url, total_capital, total_shares, share_price, status, location, category, start_date, expected_end_date, progress_pct)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    sanitizedBody.title,
    sanitizedBody.description ?? null,
    sanitizedBody.image_url ?? null,
    sanitizedBody.total_capital,
    sanitizedBody.total_shares,
    sanitizedBody.share_price,
    sanitizedBody.status ?? 'draft',
    sanitizedBody.location ?? null,
    sanitizedBody.category ?? null,
    sanitizedBody.start_date ?? null,
    sanitizedBody.expected_end_date ?? null,
    sanitizedBody.progress_pct ?? 0
  ).run()

  if (!result.success) return err(c, 'প্রজেক্ট তৈরি ব্যর্থ হয়েছে', 500)
  return ok(c, { message: 'প্রজেক্ট তৈরি হয়েছে', id: result.meta.last_row_id }, 201)
})

adminRoutes.put('/projects/:id', zValidator('json', projectSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  let body = c.req.valid('json')

  // Sanitize string fields to prevent XSS
  body = sanitizeObject(body, ['title', 'description', 'location', 'category'])

  // Whitelist allowed fields — never interpolate arbitrary keys into SQL
  const ALLOWED_FIELDS = [
    'title', 'description', 'image_url', 'total_capital', 'total_shares', 'share_price',
    'status', 'location', 'category', 'start_date', 'expected_end_date', 'progress_pct'
  ] as const
  const fields = (Object.keys(body) as string[])
    .filter((k): k is typeof ALLOWED_FIELDS[number] => ALLOWED_FIELDS.includes(k as any) && body[k as keyof typeof body] !== undefined)
  if (fields.length === 0) return err(c, 'কোনো পরিবর্তন নেই')

  const setClauses = fields.map(k => `${k} = ?`).join(', ')
  const values = fields.map(k => body[k as keyof typeof body])

  await c.env.DB.prepare(`UPDATE projects SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`)
    .bind(...values, id).run()

  return ok(c, { message: 'প্রজেক্ট আপডেট হয়েছে' })
})

adminRoutes.delete('/projects/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const forceDelete = c.req.query('force') === '1'

  const project = await c.env.DB.prepare(
    'SELECT id, title, status FROM projects WHERE id = ?'
  ).bind(id).first<{ id: number; title: string; status: string }>()
  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)
  const allowCleanupDelete = forceDelete || isTestProjectTitle(project.title)

  // Safety guard: block delete if project has any approved shares
  const [sharesCheck, txCheck] = await Promise.all([
    c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM user_shares WHERE project_id = ? AND quantity > 0'
    ).bind(id).first<{ cnt: number }>(),
    c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM project_transactions WHERE project_id = ?'
    ).bind(id).first<{ cnt: number }>()
  ])

  if ((sharesCheck?.cnt ?? 0) > 0) {
    if (!allowCleanupDelete) {
      return err(c, 'এই প্রজেক্টে শেয়ার আছে তাই মুছতে পারবেন না। প্রজেক্ট বন্ধ করুন।', 409)
    }
  }
  if ((txCheck?.cnt ?? 0) > 0) {
    if (!allowCleanupDelete) {
      return err(c, 'এই প্রজেক্টে আর্থিক লেনদেন আছে তাই মুছতে পারবেন না।', 409)
    }
  }

  if (allowCleanupDelete) {
    // Validate that user balances won't go negative, optimizing N+1 with a single JOIN query
    const negativeBalanceCheck = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM user_balances
       JOIN (
         SELECT user_id, COALESCE(SUM(amount), 0) as total
         FROM earnings
         WHERE project_id = ?
         GROUP BY user_id
       ) e ON user_balances.user_id = e.user_id
       WHERE user_balances.total_earned_paisa < e.total`
    ).bind(id).first<{ count: number }>()

    if (negativeBalanceCheck && negativeBalanceCheck.count > 0) {
      return err(c, 'Force delete করলে user balance negative হয়ে যাবে। আগে সংশ্লিষ্ট withdrawal/earnings ঠিক করুন।', 409)
    }

    const distributions = await c.env.DB.prepare(
      `SELECT id FROM profit_distributions WHERE project_id = ?`
    ).bind(id).all<{ id: number }>()

    // Update balances optimizing N+1 with a single UPDATE FROM query
    await c.env.DB.prepare(
      `UPDATE user_balances
       SET total_earned_paisa = total_earned_paisa - e.total,
           updated_at = datetime('now')
       FROM (
         SELECT user_id, COALESCE(SUM(amount), 0) as total
         FROM earnings
         WHERE project_id = ?
         GROUP BY user_id
       ) e
       WHERE user_balances.user_id = e.user_id AND user_balances.total_earned_paisa >= e.total`
    ).bind(id).run()

    await c.env.DB.prepare('DELETE FROM project_members WHERE project_id = ?').bind(id).run()
    await c.env.DB.prepare('DELETE FROM project_settlement_entries WHERE project_id = ?').bind(id).run()
    await c.env.DB.prepare('DELETE FROM project_closeout_runs WHERE project_id = ?').bind(id).run()
    await c.env.DB.prepare('DELETE FROM shareholder_profits WHERE project_id = ?').bind(id).run()
    await c.env.DB.prepare('DELETE FROM profit_distributions WHERE project_id = ?').bind(id).run()
    await c.env.DB.prepare('DELETE FROM earnings WHERE project_id = ?').bind(id).run()
    await c.env.DB.prepare('DELETE FROM expense_allocations WHERE project_id = ?').bind(id).run()
    await c.env.DB.prepare('DELETE FROM project_transactions WHERE project_id = ?').bind(id).run()
    await c.env.DB.prepare('DELETE FROM user_shares WHERE project_id = ?').bind(id).run()
    await c.env.DB.prepare('DELETE FROM share_purchases WHERE project_id = ?').bind(id).run()
    await c.env.DB.prepare('DELETE FROM project_compliance_profiles WHERE project_id = ?').bind(id).run()
    await c.env.DB.prepare('DELETE FROM project_updates WHERE project_id = ?').bind(id).run()
    await c.env.DB.prepare('DELETE FROM project_gallery WHERE project_id = ?').bind(id).run()
    await c.env.DB.prepare(
      `DELETE FROM balance_audit_log
       WHERE reference_type = 'capital_refund' AND reference_id = ?`
    ).bind(id).run()

    for (const distribution of distributions.results) {
      await c.env.DB.prepare(
        `DELETE FROM balance_audit_log
         WHERE reference_type = 'profit_distribution' AND reference_id = ?`
      ).bind(distribution.id).run()
    }
  }

  // Safe to delete (cascade will remove project_updates & project_gallery)
  const result = await c.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run()
  if (!result.meta.changes) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)
  return ok(c, { message: allowCleanupDelete ? 'প্রজেক্ট test cleanup হিসেবে মুছে ফেলা হয়েছে' : 'প্রজেক্ট মুছে ফেলা হয়েছে' })
})

adminRoutes.get('/projects/:id/closeout-preview', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  const modeParam = c.req.query('mode')
  const mode: CloseoutMode = modeParam === 'closed' ? 'closed' : 'completed'
  const preview = await getProjectCloseoutPreview(c.env.DB, id, mode)

  if (!preview) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)
  return ok(c, preview)
})

const closeoutSchema = z.object({
  mode: z.enum(['completed', 'closed']),
  confirm_closeout: z.literal(true),
  checklist: z.object({
    pending_purchases_resolved: z.boolean(),
    pending_expenses_resolved: z.boolean(),
    profits_resolved: z.boolean(),
    losses_resolved: z.boolean()
  })
})

const projectMemberSchema = z.object({
  user_id: z.number().int().positive(),
  role_label: z.string().max(80).optional(),
  notes: z.string().max(500).optional()
})

adminRoutes.post('/projects/:id/closeout', zValidator('json', closeoutSchema), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  const body = c.req.valid('json')
  const preview = await getProjectCloseoutPreview(c.env.DB, id, body.mode)
  if (!preview) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  if (
    !body.checklist.pending_purchases_resolved ||
    !body.checklist.pending_expenses_resolved ||
    !body.checklist.profits_resolved ||
    !body.checklist.losses_resolved
  ) {
    return err(c, 'Closeout checklist সম্পূর্ণ না করে প্রজেক্ট finalize করা যাবে না', 400)
  }

  if (!preview.can_closeout) {
    return c.json({
      success: false,
      error: 'Unresolved closeout blockers আছে। preview দেখে আগে settlement সম্পন্ন করুন',
      data: preview
    }, 409)
  }

  try {
    if (preview.existing_closeout_run) {
      return err(c, 'এই প্রজেক্টের closeout settlement ইতিমধ্যে সম্পন্ন হয়েছে', 409)
    }

    const refundResult = await executeCapitalRefund(c, id, preview.project, body.mode)
    const settlementResult = await createCloseoutSettlementEntries(c, id, preview, body.mode)

    if (body.mode === 'completed') {
      await c.env.DB.prepare(
        `UPDATE projects SET status = ?, completed_at = datetime('now'), progress_pct = 100, updated_at = datetime('now') WHERE id = ?`
      ).bind(body.mode, id).run()
    } else {
      await c.env.DB.prepare(
        `UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(body.mode, id).run()
    }

    return ok(c, {
      message: 'প্রজেক্ট closeout সম্পন্ন হয়েছে',
      status: body.mode,
      shareholders_count: refundResult.shareholdersCount,
      total_refunded: refundResult.totalRefunded,
      closeout_run_id: settlementResult?.closeoutRunId ?? null
    })
  } catch (error: any) {
    return err(c, error?.message || 'প্রজেক্ট closeout ব্যর্থ হয়েছে', 409)
  }
})

adminRoutes.get('/projects/:id/members', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  if (!(await hasTable(c.env.DB, 'project_members'))) return ok(c, [])

  const rows = await c.env.DB.prepare(
    `SELECT pm.*, u.name as user_name, u.phone as user_phone
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = ? AND pm.status = 'active'
     ORDER BY pm.assigned_at DESC`
  ).bind(id).all<ProjectMember>()

  return ok(c, rows.results)
})

adminRoutes.post('/projects/:id/members', zValidator('json', projectMemberSchema), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const adminId = c.get('userId')
  const body = c.req.valid('json')

  if (!(await hasTable(c.env.DB, 'project_members'))) return err(c, 'project member schema অনুপস্থিত', 500)

  const [project, user] = await Promise.all([
    c.env.DB.prepare('SELECT id FROM projects WHERE id = ?').bind(id).first<{ id: number }>(),
    c.env.DB.prepare('SELECT id, name, phone FROM users WHERE id = ?').bind(body.user_id).first<{ id: number; name: string; phone: string | null }>()
  ])

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)
  if (!user) return err(c, 'ইউজার পাওয়া যায়নি', 404)

  await c.env.DB.prepare(
    `INSERT INTO project_members (project_id, user_id, role_label, status, assigned_by, notes, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?, datetime('now'))
     ON CONFLICT(project_id, user_id) WHERE status = 'active'
     DO UPDATE SET role_label = excluded.role_label, notes = excluded.notes, updated_at = datetime('now')`
  ).bind(id, body.user_id, body.role_label ?? null, adminId, body.notes ?? null).run()

  return ok(c, {
    message: 'Project member যুক্ত হয়েছে',
    user_id: body.user_id
  }, 201)
})

adminRoutes.delete('/projects/:id/members/:memberId', async (c) => {
  const id = parseInt(c.req.param('id'))
  const memberId = parseInt(c.req.param('memberId'))
  if (isNaN(id) || isNaN(memberId)) return err(c, 'অকার্যকর আইডি')

  if (!(await hasTable(c.env.DB, 'project_members'))) return err(c, 'project member schema অনুপস্থিত', 500)

  const result = await c.env.DB.prepare(
    `UPDATE project_members
     SET status = 'removed', removed_by = ?, removed_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ? AND project_id = ? AND status = 'active'`
  ).bind(c.get('userId'), memberId, id).run()

  if (!result.meta.changes) return err(c, 'Project member পাওয়া যায়নি', 404)
  return ok(c, { message: 'Project member সরানো হয়েছে' })
})

adminRoutes.get('/projects/:id/monitor', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  const project = await c.env.DB.prepare(
    `SELECT id, title, status, share_price, total_shares, total_capital, completed_at
     FROM projects WHERE id = ?`
  ).bind(id).first<Project & { completed_at?: string | null }>()

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  const [hasProjectMembersTable, hasSettlementEntriesTable] = await Promise.all([
    hasTable(c.env.DB, 'project_members'),
    hasTable(c.env.DB, 'project_settlement_entries')
  ])

  const [members, shareholderSnapshot, distributedProfit, settlementRows, closeoutRun] = await Promise.all([
    hasProjectMembersTable
      ? c.env.DB.prepare(
          `SELECT pm.*, u.name as user_name, u.phone as user_phone
           FROM project_members pm
           JOIN users u ON u.id = pm.user_id
           WHERE pm.project_id = ? AND pm.status = 'active'
           ORDER BY pm.assigned_at DESC`
        ).bind(id).all<ProjectMember>()
      : Promise.resolve({ results: [] as ProjectMember[] }),
    getShareholderSnapshot(c.env.DB, id),
    c.env.DB.prepare(
      `SELECT COALESCE(SUM(profit_amount), 0) as total
       FROM shareholder_profits
       WHERE project_id = ? AND status IN ('credited', 'withdrawn')`
    ).bind(id).first<{ total: number }>(),
    hasSettlementEntriesTable
      ? c.env.DB.prepare(
          `SELECT
             COALESCE(SUM(CASE WHEN entry_type = 'principal_refund' THEN amount_paisa ELSE 0 END), 0) as principal_total,
             COALESCE(SUM(CASE WHEN entry_type = 'final_profit_payout' THEN amount_paisa ELSE 0 END), 0) as final_profit_total,
             COALESCE(SUM(CASE WHEN claim_status = 'claimable' THEN amount_paisa ELSE 0 END), 0) as claimable_total,
             COALESCE(SUM(CASE WHEN claim_status = 'reserved' THEN amount_paisa ELSE 0 END), 0) as reserved_total,
             COALESCE(SUM(CASE WHEN claim_status = 'withdrawn' THEN amount_paisa ELSE 0 END), 0) as withdrawn_total
           FROM project_settlement_entries
           WHERE project_id = ?`
        ).bind(id).first<{
          principal_total: number
          final_profit_total: number
          claimable_total: number
          reserved_total: number
          withdrawn_total: number
        }>()
      : Promise.resolve(null),
    getCompletedCloseoutRun(c.env.DB, id)
  ])

  const shareholderRows = await c.env.DB.prepare(
    `SELECT
       us.user_id,
       u.name as user_name,
       u.phone as user_phone,
       us.quantity,
       COALESCE(SUM(CASE WHEN pse.entry_type = 'principal_refund' THEN pse.amount_paisa ELSE 0 END), 0) as principal_generated,
       COALESCE(SUM(CASE WHEN pse.entry_type = 'final_profit_payout' THEN pse.amount_paisa ELSE 0 END), 0) as final_profit_generated,
       COALESCE(SUM(CASE WHEN pse.claim_status = 'claimable' THEN pse.amount_paisa ELSE 0 END), 0) as claimable_amount,
       COALESCE(SUM(CASE WHEN pse.claim_status = 'withdrawn' THEN pse.amount_paisa ELSE 0 END), 0) as withdrawn_amount
     FROM user_shares us
     JOIN users u ON u.id = us.user_id
     LEFT JOIN project_settlement_entries pse
       ON pse.project_id = us.project_id AND pse.user_id = us.user_id
     WHERE us.project_id = ? AND us.quantity > 0
     GROUP BY us.user_id, u.name, u.phone, us.quantity
     ORDER BY us.quantity DESC, us.user_id ASC`
  ).bind(id).all<{
    user_id: number
    user_name: string
    user_phone: string | null
    quantity: number
    principal_generated: number
    final_profit_generated: number
    claimable_amount: number
    withdrawn_amount: number
  }>()

  return ok(c, {
    project,
    closeout_run: closeoutRun,
    members: members.results,
    summary: {
      shareholders_count: shareholderSnapshot.shareholders.length,
      sold_shares: shareholderSnapshot.totalShares,
      distributed_profit_total: distributedProfit?.total ?? 0,
      principal_refund_total: settlementRows?.principal_total ?? 0,
      final_profit_total: settlementRows?.final_profit_total ?? 0,
      claimable_total: settlementRows?.claimable_total ?? 0,
      reserved_total: settlementRows?.reserved_total ?? 0,
      withdrawn_total: settlementRows?.withdrawn_total ?? 0
    },
    shareholders: shareholderRows.results.map((row) => ({
      ...row,
      ownership_bps: shareholderSnapshot.totalShares > 0 ? Math.floor((row.quantity * 10000) / shareholderSnapshot.totalShares) : 0
    }))
  })
})

adminRoutes.get('/projects/:id/compliance', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  const project = await c.env.DB.prepare('SELECT id, title, status FROM projects WHERE id = ?').bind(id).first<{ id: number; title: string; status: string }>()
  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  const profile = await c.env.DB.prepare(
    `SELECT * FROM project_compliance_profiles WHERE project_id = ?`
  ).bind(id).first()

  return ok(c, {
    project,
    profile: profile ?? defaultComplianceProfile(id)
  })
})

adminRoutes.put('/projects/:id/compliance', zValidator('json', complianceProfileSchema), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  const project = await c.env.DB.prepare('SELECT id FROM projects WHERE id = ?').bind(id).first<{ id: number }>()
  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  const data = sanitizeObject(c.req.valid('json') as Record<string, unknown>, [
    'use_of_proceeds',
    'profit_loss_policy',
    'principal_risk_notice',
    'shariah_notes',
    'ops_notes',
    'loss_settlement_notes',
    'external_reviewer_name'
  ]) as z.infer<typeof complianceProfileSchema>

  const approvedAt = data.shariah_screening_status === 'approved' ? new Date().toISOString() : null
  const approvedBy = data.shariah_screening_status === 'approved' ? c.get('userId') : null

  await c.env.DB.prepare(
    `INSERT INTO project_compliance_profiles (
      project_id, contract_type, shariah_screening_status, ops_reconciliation_status, loss_settlement_status,
      prohibited_activities_screened, asset_backing_confirmed, profit_ratio_disclosed, loss_sharing_clause_confirmed,
      principal_risk_notice_confirmed, use_of_proceeds, profit_loss_policy, principal_risk_notice,
      shariah_notes, ops_notes, loss_settlement_notes, external_reviewer_name, approved_by, approved_at, updated_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(project_id) DO UPDATE SET
      contract_type = excluded.contract_type,
      shariah_screening_status = excluded.shariah_screening_status,
      ops_reconciliation_status = excluded.ops_reconciliation_status,
      loss_settlement_status = excluded.loss_settlement_status,
      prohibited_activities_screened = excluded.prohibited_activities_screened,
      asset_backing_confirmed = excluded.asset_backing_confirmed,
      profit_ratio_disclosed = excluded.profit_ratio_disclosed,
      loss_sharing_clause_confirmed = excluded.loss_sharing_clause_confirmed,
      principal_risk_notice_confirmed = excluded.principal_risk_notice_confirmed,
      use_of_proceeds = excluded.use_of_proceeds,
      profit_loss_policy = excluded.profit_loss_policy,
      principal_risk_notice = excluded.principal_risk_notice,
      shariah_notes = excluded.shariah_notes,
      ops_notes = excluded.ops_notes,
      loss_settlement_notes = excluded.loss_settlement_notes,
      external_reviewer_name = excluded.external_reviewer_name,
      approved_by = excluded.approved_by,
      approved_at = excluded.approved_at,
      updated_by = excluded.updated_by,
      updated_at = datetime('now')`
  ).bind(
    id,
    data.contract_type,
    data.shariah_screening_status,
    data.ops_reconciliation_status,
    data.loss_settlement_status,
    data.prohibited_activities_screened ? 1 : 0,
    data.asset_backing_confirmed ? 1 : 0,
    data.profit_ratio_disclosed ? 1 : 0,
    data.loss_sharing_clause_confirmed ? 1 : 0,
    data.principal_risk_notice_confirmed ? 1 : 0,
    data.use_of_proceeds || null,
    data.profit_loss_policy || null,
    data.principal_risk_notice || null,
    data.shariah_notes || null,
    data.ops_notes || null,
    data.loss_settlement_notes || null,
    data.external_reviewer_name || null,
    approvedBy,
    approvedAt,
    c.get('userId')
  ).run()

  return ok(c, { message: 'প্রজেক্ট compliance profile আপডেট হয়েছে' })
})

adminRoutes.patch('/projects/:id/status', zValidator('json', z.object({ status: z.enum(['draft', 'active', 'closed', 'completed']) })), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const { status } = c.req.valid('json')

  const project = await c.env.DB.prepare('SELECT status, share_price FROM projects WHERE id = ?').bind(id).first<{ status: string, share_price: number }>()
  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  // F3: Enforce valid status transitions
  const validTransitions: Record<string, string[]> = {
    draft:     ['active'],
    active:    ['closed', 'completed'],
    closed:    ['active'],
    completed: []  // terminal — cannot be changed once completed
  }
  const allowed = validTransitions[project.status] ?? []
  if (!allowed.includes(status)) {
    return err(c, `'${project.status}' থেকে '${status}'-এ পরিবর্তন করা সম্ভব নয়`, 409)
  }

  const isTerminalCloseout = status === 'closed' || status === 'completed'
  if (isTerminalCloseout) {
    return err(c, 'Terminal status update সরাসরি করা যাবে না। closeout workflow ব্যবহার করুন', 409)
  }

  await c.env.DB.prepare(`UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, id).run()
  return ok(c, { message: 'প্রজেক্ট স্ট্যাটাস আপডেট হয়েছে' })
})

// ─── SHARE PURCHASES ──────────────────────────────────────────────────────────

adminRoutes.get('/shares/pending', async (c) => {
  const { page, limit, offset } = getPagination(c.req.query())
  const status = c.req.query('status') ?? 'pending'

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT sp.*, u.name as user_name, u.phone as user_phone, p.title as project_title
       FROM share_purchases sp
       JOIN users u ON u.id = sp.user_id
       JOIN projects p ON p.id = sp.project_id
       WHERE sp.status = ?
       ORDER BY sp.created_at DESC LIMIT ? OFFSET ?`
    ).bind(status, limit, offset).all(),
    c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM share_purchases WHERE status = ?'
    ).bind(status).first<{ total: number }>()
  ])
  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})

adminRoutes.patch('/shares/:id/approve', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  // Fetch the pending purchase request
  const purchase = await c.env.DB.prepare(
    `SELECT sp.user_id, sp.project_id, sp.quantity, p.status as project_status
     FROM share_purchases sp
     JOIN projects p ON p.id = sp.project_id
     WHERE sp.id = ? AND sp.status = ?`
  ).bind(id, 'pending').first<{ user_id: number; project_id: number; quantity: number; project_status: string }>()

  if (!purchase) return err(c, 'অনুরোধ পাওয়া যায়নি বা ইতিমধ্যে প্রক্রিয়া করা হয়েছে', 404)
  if (purchase.project_status !== 'active') {
    return err(c, 'শুধু সক্রিয় প্রজেক্টের শেয়ার ক্রয় অনুমোদন করা যাবে', 409)
  }

  // Step 1: Check availability BEFORE approving (read-then-write, best effort)
  // D1 does not support multi-statement transactions, so we use a careful sequence:
  //   a) Check capacity
  //   b) Try to add shares (conditional INSERT with capacity guard)
  //   c) Only approve if shares were actually added
  // This minimises the inconsistency window vs the old approach which approved first.

  // C5 FIX: Use D1 batch to atomically add shares + approve purchase
  // The old sequential approach had a race window between share add and status update
  const addSharesStmt = c.env.DB.prepare(
    `INSERT INTO user_shares (user_id, project_id, quantity)
     SELECT ?, ?, ?
     WHERE (
       SELECT (p.total_shares - COALESCE(SUM(us.quantity), 0))
       FROM projects p
       LEFT JOIN user_shares us ON us.project_id = p.id
       WHERE p.id = ?
     ) >= ?
     ON CONFLICT(user_id, project_id) DO UPDATE SET quantity = quantity + excluded.quantity`
  ).bind(
    purchase.user_id, purchase.project_id, purchase.quantity,
    purchase.project_id, purchase.quantity
  )

  const approveStmt = c.env.DB.prepare(
    `UPDATE share_purchases SET status = 'approved', updated_at = datetime('now')
     WHERE id = ? AND status = 'pending'`
  ).bind(id)

  const [addResult, approveResult] = await c.env.DB.batch([addSharesStmt, approveStmt])

  // If share add failed (capacity), reject safely
  if (addResult.meta.changes === 0) {
    return err(c, 'পর্যাপ্ত শেয়ার নেই, অনুমোদন করা সম্ভব হয়নি', 409)
  }

  // If purchase was already approved by another admin (race), rollback shares
  if (approveResult.meta.changes === 0) {
    await c.env.DB.prepare(
      `UPDATE user_shares SET quantity = quantity - ?
       WHERE user_id = ? AND project_id = ? AND quantity >= ?`
    ).bind(purchase.quantity, purchase.user_id, purchase.project_id, purchase.quantity).run()
    return err(c, 'অনুরোধ ইতিমধ্যে প্রক্রিয়া করা হয়েছে', 409)
  }

  // Step 3: Referral bonus — fire if this is the buyer's FIRST approved purchase
  // and the buyer was referred by someone who is still active.
  // We check cnt === 1 because we just approved this purchase moments ago.
  const firstPurchaseCheck = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM share_purchases
     WHERE user_id = ? AND status = 'approved'`
  ).bind(purchase.user_id).first<{ cnt: number }>()

  if (firstPurchaseCheck && firstPurchaseCheck.cnt === 1) {
    // Fetch buyer's referrer_user_id directly (integer FK — no code-string lookup)
    const buyer = await c.env.DB.prepare(
      `SELECT referrer_user_id FROM users WHERE id = ? AND is_active = 1`
    ).bind(purchase.user_id).first<{ referrer_user_id: number | null }>()

    if (buyer?.referrer_user_id) {
      // Confirm referrer is still active
      const referrerActive = await c.env.DB.prepare(
        `SELECT id FROM users WHERE id = ? AND is_active = 1`
      ).bind(buyer.referrer_user_id).first<{ id: number }>()

      if (referrerActive) {
        // Get configurable bonus amount with NaN guard
        const bonusSetting = await c.env.DB.prepare(
          `SELECT value FROM withdrawal_settings WHERE key = 'referral_bonus_paisa'`
        ).first<{ value: string }>()
        const rawBonus = parseInt(bonusSetting?.value ?? '5000', 10)
        // NaN guard + cap: default to 5000 if invalid, never exceed 100000 (৳1000)
        const bonusPaisa = (isNaN(rawBonus) || rawBonus < 0) ? 5000
          : rawBonus > 100_000 ? 100_000
          : rawBonus

        // Insert bonus record — UNIQUE(referrer, referred, event) prevents double-credit
        const bonusInsert = await c.env.DB.prepare(
          `INSERT OR IGNORE INTO referral_bonuses
             (referrer_user_id, referred_user_id, trigger_event, amount_paisa)
           VALUES (?, ?, 'first_investment', ?)`
        ).bind(buyer.referrer_user_id, purchase.user_id, bonusPaisa).run()

        // Only credit balance if bonus was newly inserted (not a duplicate)
        if (bonusInsert.meta.changes > 0) {
          const bonusId = bonusInsert.meta.last_row_id
          
          // Update explicit user_balances if it exists
          const balanceUpdate = await c.env.DB.prepare(
            `UPDATE user_balances SET total_earned_paisa = total_earned_paisa + ?, updated_at = datetime('now') WHERE user_id = ?`
          ).bind(bonusPaisa, buyer.referrer_user_id).run()

          if (balanceUpdate.meta.changes > 0) {
            await c.env.DB.prepare(
              `INSERT INTO balance_audit_log (user_id, amount_paisa, change_type, reference_type, reference_id, admin_id, note)
               VALUES (?, ?, 'earn', 'referral_bonus', ?, ?, ?)`
            ).bind(buyer.referrer_user_id, bonusPaisa, bonusId, c.get('userId'), `Referral bonus for user ${purchase.user_id}`).run()
          }
        }
      }
    }
  }

  return ok(c, { message: 'শেয়ার অনুমোদন করা হয়েছে এবং পোর্টফোলিওতে যোগ হয়েছে' })
})

adminRoutes.patch('/shares/:id/reject', zValidator('json', z.object({ admin_note: z.string().optional() })), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const { admin_note } = c.req.valid('json')

  const result = await c.env.DB.prepare(
    `UPDATE share_purchases SET status = 'rejected', admin_note = ?, updated_at = datetime('now')
     WHERE id = ? AND status = 'pending'`
  ).bind(admin_note ?? null, id).run()

  if (!result.meta.changes) return err(c, 'অনুরোধ পাওয়া যায়নি বা ইতিমধ্যে প্রক্রিয়া করা হয়েছে', 404)
  return ok(c, { message: 'শেয়ার অনুরোধ বাতিল করা হয়েছে' })
})

// NOTE: Profit rates and manual distribute-earnings routes removed.
// Profit distribution is now done exclusively via the P&L-based system
// in profit-distribution.ts (ProjectFinance → ProfitDistribution flow).


// ─── DAILY TASKS ──────────────────────────────────────────────────────────────

const taskSchema = z.object({
  title: z.string().min(2),
  destination_url: z.string().min(1),
  platform: z.enum(['facebook', 'youtube', 'telegram', 'other']).optional(),
  points: z.number().int().min(0).optional(),
  cooldown_seconds: z.number().int().min(0).optional(),
  daily_limit: z.number().int().min(1).optional(),
  is_one_time: z.number().int().min(0).max(1).optional()
})

adminRoutes.get('/tasks', async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      'SELECT id, title, destination_url, platform, points, cooldown_seconds, daily_limit, is_one_time, is_active, created_at FROM daily_tasks ORDER BY created_at DESC'
    ).all()
    return ok(c, rows.results)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return err(c, 'টাস্ক লোড করা যায়নি', 500)
  }
})

adminRoutes.post('/tasks', zValidator('json', taskSchema), async (c) => {
  const body = c.req.valid('json')
  const result = await c.env.DB.prepare(
    `INSERT INTO daily_tasks (title, destination_url, platform, points, cooldown_seconds, daily_limit, is_one_time, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
  ).bind(
    body.title,
    body.destination_url,
    body.platform ?? 'other',
    body.points ?? 5,
    body.cooldown_seconds ?? 30,
    body.daily_limit ?? 20,
    body.is_one_time ?? 0
  ).run()
  return ok(c, { message: 'টাস্ক তৈরি হয়েছে', id: result.meta.last_row_id }, 201)
})

adminRoutes.put('/tasks/:id', zValidator('json', taskSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const body = c.req.valid('json')

  const fields: string[] = []
  const values: any[] = []

  if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title) }
  if (body.destination_url !== undefined) { fields.push('destination_url = ?'); values.push(body.destination_url) }
  if (body.platform !== undefined) { fields.push('platform = ?'); values.push(body.platform) }
  if (body.points !== undefined) { fields.push('points = ?'); values.push(body.points) }
  if (body.cooldown_seconds !== undefined) { fields.push('cooldown_seconds = ?'); values.push(body.cooldown_seconds) }
  if (body.daily_limit !== undefined) { fields.push('daily_limit = ?'); values.push(body.daily_limit) }
  if (body.is_one_time !== undefined) { fields.push('is_one_time = ?'); values.push(body.is_one_time) }

  if (fields.length === 0) return err(c, 'কোনো পরিবর্তন নেই')

  await c.env.DB.prepare(`UPDATE daily_tasks SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values, id).run()
  return ok(c, { message: 'টাস্ক আপডেট হয়েছে' })
})

// DELETE /api/admin/tasks/:id - Delete a task
adminRoutes.delete('/tasks/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  
  // Check if task exists
  const task = await c.env.DB.prepare('SELECT title FROM daily_tasks WHERE id = ?').bind(id).first<{ title: string }>()
  if (!task) return err(c, 'টাস্ক পাওয়া যায়নি', 404)
  
  // Delete related records first (to avoid foreign key constraint)
  await c.env.DB.prepare('DELETE FROM task_completions WHERE task_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM task_start_sessions WHERE task_id = ?').bind(id).run()
  
  // Then delete the task
  await c.env.DB.prepare('DELETE FROM daily_tasks WHERE id = ?').bind(id).run()
  return ok(c, { message: 'টাস্ক মুছে ফেলা হয়েছে' })
})

adminRoutes.patch('/tasks/:id/toggle', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const task = await c.env.DB.prepare('SELECT is_active FROM daily_tasks WHERE id = ?').bind(id).first<{ is_active: number }>()
  if (!task) return err(c, 'টাস্ক পাওয়া যায়নি', 404)
  await c.env.DB.prepare('UPDATE daily_tasks SET is_active = ? WHERE id = ?').bind(task.is_active ? 0 : 1, id).run()
  return ok(c, { message: task.is_active ? 'টাস্ক নিষ্ক্রিয় করা হয়েছে' : 'টাস্ক সক্রিয় করা হয়েছে' })
})

// ─── TASK TYPES (Points Settings) ──────────────────────────────────────────────

const taskTypeSchema = z.object({
  name: z.string().min(2),
  display_name: z.string().min(2),
  base_points: z.number().int().min(0),
  cooldown_seconds: z.number().int().min(0),
  daily_limit: z.number().int().min(1)
})

adminRoutes.get('/task-types', async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      'SELECT id, name, display_name, base_points, cooldown_seconds, daily_limit, is_active, created_at, updated_at FROM task_types ORDER BY id ASC'
    ).all()
    return ok(c, rows.results)
  } catch (error) {
    console.error('Error fetching task types:', error)
    return err(c, 'টাস্ক টাইপ লোড করা যায়নি', 500)
  }
})

adminRoutes.post('/task-types', zValidator('json', taskTypeSchema), async (c) => {
  const body = c.req.valid('json')
  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO task_types (name, display_name, base_points, cooldown_seconds, daily_limit, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`
    ).bind(body.name, body.display_name, body.base_points, body.cooldown_seconds, body.daily_limit).run()
    return ok(c, { message: 'টাস্ক টাইপ তৈরি হয়েছে', id: result.meta.last_row_id }, 201)
  } catch (error) {
    console.error('Error creating task type:', error)
    return err(c, 'টাস্ক টাইপ তৈরি করা যায়নি', 500)
  }
})

adminRoutes.put('/task-types/:id', zValidator('json', taskTypeSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const body = c.req.valid('json')

  const fields: string[] = []
  const values: any[] = []

  if (body.display_name !== undefined) { fields.push('display_name = ?'); values.push(body.display_name) }
  if (body.base_points !== undefined) { fields.push('base_points = ?'); values.push(body.base_points) }
  if (body.cooldown_seconds !== undefined) { fields.push('cooldown_seconds = ?'); values.push(body.cooldown_seconds) }
  if (body.daily_limit !== undefined) { fields.push('daily_limit = ?'); values.push(body.daily_limit) }

  if (fields.length === 0) return err(c, 'কোনো পরিবর্তন নেই')

  try {
    await c.env.DB.prepare(`UPDATE task_types SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`)
      .bind(...values, id).run()
    return ok(c, { message: 'টাস্ক টাইপ আপডেট হয়েছে' })
  } catch (error) {
    console.error('Error updating task type:', error)
    return err(c, 'টাস্ক টাইপ আপডেট করা যায়নি', 500)
  }
})

adminRoutes.patch('/task-types/:id/toggle', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const taskType = await c.env.DB.prepare('SELECT is_active FROM task_types WHERE id = ?').bind(id).first<{ is_active: number }>()
  if (!taskType) return err(c, 'টাস্ক টাইপ পাওয়া যায়নি', 404)
  await c.env.DB.prepare('UPDATE task_types SET is_active = ? WHERE id = ?').bind(taskType.is_active ? 0 : 1, id).run()
  return ok(c, { message: taskType.is_active ? 'টাস্ক টাইপ নিষ্ক্রিয় করা হয়েছে' : 'টাস্ক টাইপ সক্রিয় করা হয়েছে' })
})

// ─── REWARDS MANAGEMENT ────────────────────────────────────────────────────────

const rewardSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  points_required: z.number().int().min(1),
  quantity: z.number().int().min(1).nullable(), // null = unlimited
  image_url: z.string().url().optional()
})

adminRoutes.get('/rewards', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM rewards ORDER BY points_required ASC'
  ).all()
  return ok(c, rows.results)
})

adminRoutes.post('/rewards', zValidator('json', rewardSchema), async (c) => {
  const body = c.req.valid('json')
  const result = await c.env.DB.prepare(
    `INSERT INTO rewards (name, description, points_required, quantity, image_url)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(body.name, body.description || null, body.points_required, body.quantity || null, body.image_url || null).run()
  return ok(c, { message: 'রিওয়ার্ড তৈরি হয়েছে', id: result.meta.last_row_id }, 201)
})

adminRoutes.put('/rewards/:id', zValidator('json', rewardSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  let body = c.req.valid('json')
  
  // Sanitize string fields to prevent XSS
  body = sanitizeObject(body, ['name', 'description'])

  // SECURITY FIX: Whitelist allowed fields — never interpolate arbitrary keys into SQL
  const ALLOWED_FIELDS = ['name', 'description', 'points_required', 'quantity', 'image_url'] as const
  const fields = (Object.keys(body) as string[])
    .filter((k): k is typeof ALLOWED_FIELDS[number] => ALLOWED_FIELDS.includes(k as any) && body[k as keyof typeof body] !== undefined)
  if (fields.length === 0) return err(c, 'কোনো পরিবর্তন নেই')

  const setClauses = fields.map(k => `${k} = ?`).join(', ')
  const values = fields.map(k => body[k as keyof typeof body])
  
  await c.env.DB.prepare(`UPDATE rewards SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`)
    .bind(...values, id).run()
  return ok(c, { message: 'রিওয়ার্ড আপডেট হয়েছে' })
})

adminRoutes.patch('/rewards/:id/toggle', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const reward = await c.env.DB.prepare('SELECT is_active FROM rewards WHERE id = ?').bind(id).first<{ is_active: number }>()
  if (!reward) return err(c, 'রিওয়ার্ড পাওয়া যায়নি', 404)
  await c.env.DB.prepare('UPDATE rewards SET is_active = ? WHERE id = ?').bind(reward.is_active ? 0 : 1, id).run()
  return ok(c, { message: reward.is_active ? 'রিওয়ার্ড নিষ্ক্রিয় করা হয়েছে' : 'রিওয়ার্ড সক্রিয় করা হয়েছে' })
})

// ─── REWARD REDEMPTIONS (Admin Review) ─────────────────────────────────────────

adminRoutes.get('/redemptions', async (c) => {
  const status = c.req.query('status') || 'pending'
  const rows = await c.env.DB.prepare(
    `SELECT rr.*, r.name as reward_name, u.name as user_name, u.phone as user_phone
     FROM reward_redemptions rr
     JOIN rewards r ON rr.reward_id = r.id
     JOIN users u ON rr.user_id = u.id
     WHERE rr.status = ?
     ORDER BY rr.redeemed_at DESC`
  ).bind(status).all()
  return ok(c, rows.results)
})

adminRoutes.patch('/redemptions/:id/status', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  
  const body = await c.req.parseBody()
  const status = body.status as string
  
  if (!['pending', 'approved', 'fulfilled', 'rejected', 'cancelled'].includes(status)) {
    return err(c, 'অকার্যকর স্ট্যাটাস', 400)
  }
  
  const adminNote = body.admin_note as string || null
  
  // SECURITY FIX: If rejecting/cancelling, refund the user's points
  if (status === 'rejected' || status === 'cancelled') {
    // Fetch the redemption to know how many points to refund
    const redemption = await c.env.DB.prepare(
      `SELECT rr.user_id, rr.status as current_status, r.points_required
       FROM reward_redemptions rr
       JOIN rewards r ON rr.reward_id = r.id
       WHERE rr.id = ? AND rr.status = 'pending'`
    ).bind(id).first<{ user_id: number; current_status: string; points_required: number }>()

    if (!redemption) {
      return err(c, 'রিডিম পাওয়া যায়নি অথবা ইতিমধ্যে প্রসেস করা হয়েছে', 404)
    }

    // Atomically update status first to prevent double-refund
    const statusUpdate = await c.env.DB.prepare(
      `UPDATE reward_redemptions SET status = ?, admin_note = ?, updated_at = datetime('now') WHERE id = ? AND status = 'pending'`
    ).bind(status, adminNote, id).run()

    if (!statusUpdate.meta.changes || statusUpdate.meta.changes === 0) {
      return err(c, 'রিডিম ইতিমধ্যে প্রসেস করা হয়েছে', 409)
    }

    // Refund points — status already changed so no double-refund risk
    await c.env.DB.prepare(
      `UPDATE user_points SET available_points = available_points + ?, updated_at = datetime('now') WHERE user_id = ?`
    ).bind(redemption.points_required, redemption.user_id).run()

    // Create refund transaction record
    await c.env.DB.prepare(
      `INSERT INTO point_transactions (user_id, points, transaction_type, description, month_year)
       VALUES (?, ?, 'refunded', ?, strftime('%Y-%m', 'now'))`
    ).bind(redemption.user_id, redemption.points_required, `Reward redemption ${status} — points refunded`).run()

    return ok(c, { message: `রিওয়ার্ড রিডিম ${status === 'rejected' ? 'প্রত্যাখ্যাত' : 'বাতিল'} হয়েছে। পয়েন্ট ফেরত দেওয়া হয়েছে।` })
  }

  // For non-refund statuses (approved, fulfilled) — original logic
  const updateFields: string[] = ['status = ?', 'updated_at = datetime(\'now\')']
  const params: any[] = [status]
  
  if (status === 'fulfilled') {
    updateFields.push('fulfilled_at = datetime(\'now\')')
  }
  
  if (adminNote) {
    updateFields.push('admin_note = ?')
    params.push(adminNote)
  }
  
  params.push(id)
  
  await c.env.DB.prepare(
    `UPDATE reward_redemptions SET ${updateFields.join(', ')} WHERE id = ?`
  ).bind(...params).run()
  
  return ok(c, { message: `রিওয়ার্ড রিডিম স্ট্যাটাস আপডেট হয়েছে: ${status}` })
})

// ─── USER POINTS (Admin View & Adjust) ─────────────────────────────────────────

adminRoutes.get('/users/:id/points', async (c) => {
  const userId = parseInt(c.req.param('id'))
  if (isNaN(userId)) return err(c, 'অকার্যকর আইডি')
  
  const userPoints = await c.env.DB.prepare(
    'SELECT * FROM user_points WHERE user_id = ?'
  ).bind(userId).first()
  
  if (!userPoints) {
    // Initialize if not exists
    await c.env.DB.prepare(
      'INSERT INTO user_points (user_id, available_points, lifetime_earned, lifetime_redeemed, monthly_earned, monthly_redeemed) VALUES (?, 0, 0, 0, 0, 0)'
    ).bind(userId).run()
    
    const freshPoints = await c.env.DB.prepare(
      'SELECT * FROM user_points WHERE user_id = ?'
    ).bind(userId).first()
    
    return ok(c, freshPoints)
  }
  
  return ok(c, userPoints)
})

adminRoutes.post('/users/:id/points/adjust', zValidator('json', z.object({
  points: z.number().int().min(-1000000).max(1000000),
  reason: z.string().min(1).max(500)
})), async (c) => {
  const userId = parseInt(c.req.param('id'))
  if (isNaN(userId)) return err(c, 'অকার্যকর আইডি')
  
  const body = c.req.valid('json')
  const points = body.points
  const reason = body.reason
  const adminUserId = c.get('userId')
  
  if (points === 0) return err(c, 'পয়েন্ট মান প্রয়োজন', 400)
  
  // Get current points for audit trail
  const currentUserPoints = await c.env.DB.prepare(
    'SELECT available_points, lifetime_earned, lifetime_redeemed FROM user_points WHERE user_id = ?'
  ).bind(userId).first<{ available_points: number; lifetime_earned: number; lifetime_redeemed: number }>()

  // SECURITY FIX: Prevent negative balance — admin can never push points below zero
  if (points < 0 && currentUserPoints) {
    if (currentUserPoints.available_points + points < 0) {
      return err(c, `পয়েন্ট ঋণাত্মক হতে পারে না। বর্তমান ব্যালেন্স: ${currentUserPoints.available_points}`, 400)
    }
  }
  
  // Update user points
  await c.env.DB.prepare(
    `UPDATE user_points SET 
       available_points = available_points + ?,
       ${points > 0 ? 'lifetime_earned = lifetime_earned + ?,' : 'lifetime_redeemed = lifetime_redeemed + ?'}
       ${points > 0 ? 'monthly_earned = monthly_earned + ?,' : 'monthly_redeemed = monthly_redeemed + ?'}
       updated_at = datetime('now')
     WHERE user_id = ?`
  ).bind(points, Math.abs(points), Math.abs(points), userId).run()
  
  // Create transaction record
  const txResult = await c.env.DB.prepare(
    `INSERT INTO point_transactions (user_id, points, transaction_type, description, month_year, metadata)
     VALUES (?, ?, 'adjusted', ?, strftime('%Y-%m', 'now'), ?)`
  ).bind(userId, points, reason, JSON.stringify({ 
    adjusted_by: adminUserId,
    reason: reason 
  })).run()
  
  // Create audit trail entry
  await c.env.DB.prepare(
    `INSERT INTO admin_actions (admin_user_id, action_type, target_id, target_type, old_value, new_value, reason)
     VALUES (?, 'points_adjust', ?, 'user', ?, ?, ?)`
  ).bind(
    adminUserId, 
    userId, 
    JSON.stringify(currentUserPoints),
    JSON.stringify({ points_added: points, new_total: (currentUserPoints?.available_points || 0) + points }),
    reason
  ).run()
  
  return ok(c, { 
    message: `পয়েন্ট ${points > 0 ? 'যোগ' : 'বিয়োগ'} করা হয়েছে (${Math.abs(points)} পয়েন্ট)`,
    transaction_id: txResult.meta.last_row_id,
    new_balance: (currentUserPoints?.available_points || 0) + points
  })
})

adminRoutes.get('/users/:id/points/history', async (c) => {
  const userId = parseInt(c.req.param('id'))
  if (isNaN(userId)) return err(c, 'অকার্যকর আইডি')
  
  const transactions = await c.env.DB.prepare(
    `SELECT pt.*, dt.title as task_title
     FROM point_transactions pt
     LEFT JOIN daily_tasks dt ON pt.task_id = dt.id
     WHERE pt.user_id = ?
     ORDER BY pt.created_at DESC
     LIMIT 100`
  ).bind(userId).all()
  
   return ok(c, transactions.results)
})

// ─── POINT WITHDRAWALS ─────────────────────────────────────────────────────────────

// Validation schemas
const approveSchema = z.object({
  admin_note: z.string().optional()
})

const rejectSchema = z.object({
  admin_note: z.string().min(1, 'Rejection reason required')
})

const completeSchema = z.object({
  bkash_txid: z.string().min(5, 'Valid bKash transaction ID required')
})

// GET /api/admin/point-withdrawals - List withdrawals
adminRoutes.get('/point-withdrawals', async (c) => {
  const { page, limit, offset } = getPagination(c.req.query())
  const status = c.req.query('status') as 'pending' | 'approved' | 'completed' | 'rejected' | undefined
  
  let whereClause = ''
  const params: (string | number)[] = []
  
  if (status) {
    whereClause = 'WHERE pw.status = ?'
    params.push(status)
  }
  
  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT pw.*, u.name as user_name, u.phone as user_phone
       FROM point_withdrawals pw
       JOIN users u ON pw.user_id = u.id
       ${whereClause}
       ORDER BY pw.requested_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM point_withdrawals ${whereClause}`
    ).bind(...params).first<{ total: number }>()
  ])
  
  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})

// PATCH /api/admin/point-withdrawals/:id/approve
adminRoutes.patch('/point-withdrawals/:id/approve', zValidator('json', approveSchema), async (c) => {
  const adminUserId = c.get('userId')
  const withdrawalId = parseInt(c.req.param('id'))
  if (isNaN(withdrawalId)) return err(c, 'অকার্যক উত্তোলন আইডি', 400)

  const { admin_note } = c.req.valid('json')

  // Get withdrawal
  const withdrawal = await c.env.DB.prepare(
    `SELECT pw.*, u.name as user_name, u.phone as user_phone
     FROM point_withdrawals pw
     JOIN users u ON pw.user_id = u.id
     WHERE pw.id = ? AND pw.status = 'pending'`
  ).bind(withdrawalId).first<{
    id: number
    user_id: number
    amount_points: number
    amount_taka: number
    bkash_number: string
    user_name: string
    user_phone: string
  }>()

  if (!withdrawal) {
    return err(c, 'উত্তোলন পাওয়া যায়নি অথবা ইতিমধ্যে প্রসেস করা হয়েছে', 404)
  }

  // Update withdrawal status
  await c.env.DB.prepare(
    `UPDATE point_withdrawals SET
       status = 'approved',
       approved_by = ?,
       admin_note = ?,
       processed_at = datetime('now')
     WHERE id = ?`
  ).bind(adminUserId, admin_note || null, withdrawalId).run()

  // Create audit log
  await c.env.DB.prepare(
    `INSERT INTO admin_audit_log (admin_user_id, action_type, target_type, target_id, details)
     VALUES (?, 'withdrawal_approved', 'withdrawal', ?, ?)`
  ).bind(adminUserId, withdrawalId, `Approved withdrawal of ${withdrawal.amount_points} points to ${withdrawal.bkash_number}`).run()

  // Notify user (points already deducted, just confirming approval)
  await c.env.DB.prepare(
    `INSERT INTO notifications (user_id, type, title, message, reference_type)
     VALUES (?, 'withdrawal_approved', 'উত্তোলন অনুমোদিত', ?, 'point_withdrawal')`
  ).bind(withdrawal.user_id, `আপনার ${withdrawal.amount_points} পয়েন্ট (${withdrawal.amount_taka} টাকা) উত্তোলন অনুমোদিত হয়েছে। ${withdrawal.bkash_number} নম্বরে পাঠানো হবে।`).run()

  return ok(c, {
    message: 'উত্তোলন অনুমোদিত হয়েছে',
    withdrawal_id: withdrawalId,
    amount_points: withdrawal.amount_points,
    amount_taka: withdrawal.amount_taka,
    user_name: withdrawal.user_name,
    user_phone: withdrawal.user_phone
  })
})

// PATCH /api/admin/point-withdrawals/:id/reject
adminRoutes.patch('/point-withdrawals/:id/reject', zValidator('json', rejectSchema), async (c) => {
  const adminUserId = c.get('userId')
  const withdrawalId = parseInt(c.req.param('id'))
  if (isNaN(withdrawalId)) return err(c, 'অকার্যক উত্তোলন আইডি', 400)

  const { admin_note } = c.req.valid('json')

  // Get withdrawal details for the response
  const withdrawal = await c.env.DB.prepare(
    `SELECT pw.*, u.name as user_name, u.phone as user_phone
     FROM point_withdrawals pw
     JOIN users u ON pw.user_id = u.id
     WHERE pw.id = ?`
  ).bind(withdrawalId).first<{
    id: number
    user_id: number
    amount_points: number
    amount_taka: number
    status: string
    user_name: string
    user_phone: string
  }>()

  if (!withdrawal || withdrawal.status !== 'pending') {
    return err(c, 'উত্তোলন পাওয়া যায়নি অথবা ইতিমধ্যে প্রসেস করা হয়েছে', 404)
  }

  // SECURITY FIX: Update status FIRST with WHERE status = 'pending' guard
  // This prevents double-refund if two admins click reject simultaneously
  const statusUpdate = await c.env.DB.prepare(
    `UPDATE point_withdrawals SET
       status = 'rejected',
       admin_note = ?,
       processed_at = datetime('now')
     WHERE id = ? AND status = 'pending'`
  ).bind(admin_note, withdrawalId).run()

  // If no rows changed, another admin already processed it
  if (!statusUpdate.meta.changes || statusUpdate.meta.changes === 0) {
    return err(c, 'উত্তোলন ইতিমধ্যে প্রসেস করা হয়েছে', 409)
  }

  const currentMonth = new Date().toISOString().slice(0, 7)

  // Refund points to user — safe because status is already 'rejected'
  await c.env.DB.prepare(
    `UPDATE user_points SET
       available_points = available_points + ?,
       updated_at = datetime('now')
     WHERE user_id = ?`
  ).bind(withdrawal.amount_points, withdrawal.user_id).run()

  // Create transaction record for refund
  await c.env.DB.prepare(
    `INSERT INTO point_transactions (user_id, points, transaction_type, description, month_year)
     VALUES (?, ?, 'refunded', ?, ?)`
  ).bind(withdrawal.user_id, withdrawal.amount_points, `Withdrawal rejected - points refunded`, currentMonth).run()

  // Create audit log
  await c.env.DB.prepare(
    `INSERT INTO admin_audit_log (admin_user_id, action_type, target_type, target_id, details)
     VALUES (?, 'withdrawal_rejected', 'withdrawal', ?, ?)`
  ).bind(adminUserId, withdrawalId, `Rejected withdrawal of ${withdrawal.amount_points} points. Reason: ${admin_note}`).run()

  // Notify user
  await c.env.DB.prepare(
    `INSERT INTO notifications (user_id, type, title, message, reference_type)
     VALUES (?, 'withdrawal_rejected', 'উত্তোলন প্রত্যাখ্যাত', ?, 'point_withdrawal')`
  ).bind(withdrawal.user_id, `আপনার ${withdrawal.amount_points} পয়েন্ট উত্তোলন প্রত্যাখ্যাত হয়েছে। কারণ: ${admin_note}। পয়েন্ট আপনার অ্যাকাউন্টে ফেরত দেওয়া হয়েছে।`).run()

  return ok(c, {
    message: 'উত্তোলন প্রত্যাখ্যাত হয়েছে',
    withdrawal_id: withdrawalId,
    amount_points: withdrawal.amount_points,
    refunded: true,
    user_name: withdrawal.user_name,
    user_phone: withdrawal.user_phone
  })
})

// PATCH /api/admin/point-withdrawals/:id/complete
adminRoutes.patch('/point-withdrawals/:id/complete', zValidator('json', completeSchema), async (c) => {
  const adminUserId = c.get('userId')
  const withdrawalId = parseInt(c.req.param('id'))
  if (isNaN(withdrawalId)) return err(c, 'অকার্যক উত্তোলন আইডি', 400)

  const { bkash_txid } = c.req.valid('json')

  // Get withdrawal
  const withdrawal = await c.env.DB.prepare(
    `SELECT pw.*, u.name as user_name, u.phone as user_phone
     FROM point_withdrawals pw
     JOIN users u ON pw.user_id = u.id
     WHERE pw.id = ? AND pw.status = 'approved'`
  ).bind(withdrawalId).first<{
    id: number
    user_id: number
    amount_points: number
    amount_taka: number
    bkash_number: string
    user_name: string
    user_phone: string
  }>()

  if (!withdrawal) {
    return err(c, 'উত্তোলন পাওয়া যায়নি অথবা এটি অনুমোদিত নয়', 404)
  }

  // Update withdrawal status
  await c.env.DB.prepare(
    `UPDATE point_withdrawals SET
       status = 'completed',
       completed_at = datetime('now'),
       completed_by = ?,
       payment_txid = ?,
       admin_note = COALESCE(admin_note, '') || ' | Paid: ' || ?,
       processed_at = datetime('now')
     WHERE id = ?`
  ).bind(adminUserId, bkash_txid, bkash_txid, withdrawalId).run()

  // Create audit log
  await c.env.DB.prepare(
    `INSERT INTO admin_audit_log (admin_user_id, action_type, target_type, target_id, details)
     VALUES (?, 'withdrawal_completed', 'withdrawal', ?, ?)`
  ).bind(adminUserId, withdrawalId, `Completed withdrawal of ${withdrawal.amount_points} points to ${withdrawal.bkash_number}`).run()

  // Notify user - CRITICAL FIX: Add withdrawal completion notification
  await c.env.DB.prepare(
    `INSERT INTO notifications (user_id, type, title, message, reference_type)
     VALUES (?, 'withdrawal_completed', 'উত্তোলন সম্পন্ন হয়েছে', ?, 'point_withdrawal')`
  ).bind(withdrawal.user_id, `আপনার ${withdrawal.amount_points} পয়েন্ট (${withdrawal.amount_taka} টাকা) উত্তোলন সম্পন্ন হয়েছে। ${withdrawal.bkash_number} নম্বরে পাঠানো হয়েছে। লেনদেন ID: ${bkash_txid}`).run()

  return ok(c, {
    message: 'উত্তোলন সম্পন্ন হয়েছে',
    withdrawal_id: withdrawalId,
    amount_points: withdrawal.amount_points,
    amount_taka: withdrawal.amount_taka,
    bkash_txid,
    user_name: withdrawal.user_name,
    user_phone: withdrawal.user_phone
  })
})
