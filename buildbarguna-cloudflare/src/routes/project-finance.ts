import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err, getPagination, paginate } from '../lib/response'
import type { Bindings, Variables, ProjectTransaction, TransactionCategory, ProjectFinancialSummary } from '../types'

export const financeRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// All finance routes require auth
financeRoutes.use('*', authMiddleware)

// ──────────────────────────────────────────────────────────────
// SCHEMAS
// ──────────────────────────────────────────────────────────────

const transactionSchema = z.object({
  project_id: z.number().int().positive(),
  transaction_type: z.enum(['expense', 'revenue']),
  amount: z.number().int().positive('পরিমাণ শূন্যের বেশি হতে হবে'),
  category: z.string().min(1, 'ক্যাটাগরি নির্বাচন করুন'),
  description: z.string().optional(),
  transaction_date: z.string().optional()
})

const updateTransactionSchema = z.object({
  amount: z.number().int().positive().optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'তারিখ YYYY-MM-DD ফরম্যাটে হতে হবে').optional()
})

// Whitelist allowed fields - never interpolate arbitrary keys into SQL
const ALLOWED_TRANSACTION_FIELDS = ['amount', 'category', 'description', 'transaction_date'] as const

// ──────────────────────────────────────────────────────────────
// 1. ADD TRANSACTION (Expense/Revenue Entry)
// ──────────────────────────────────────────────────────────────

financeRoutes.post('/transactions', zValidator('json', transactionSchema), async (c) => {
  const data = c.req.valid('json')
  const userId = c.get('userId')

  // Verify project exists
  const project = await c.env.DB.prepare(
    'SELECT id, title FROM projects WHERE id = ?'
  ).bind(data.project_id).first<{ id: number; title: string }>()

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  const transactionDate = data.transaction_date ?? new Date().toISOString().split('T')[0]

  const result = await c.env.DB.prepare(
    `INSERT INTO project_transactions 
     (project_id, transaction_type, amount, category, description, transaction_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.project_id,
    data.transaction_type,
    data.amount,
    data.category,
    data.description ?? null,
    transactionDate,
    userId
  ).run()

  if (!result.success) return err(c, 'এন্ট্রি ব্যর্থ হয়েছে', 500)

  return ok(c, {
    message: `${data.transaction_type === 'expense' ? 'খরচ' : 'আয়'} সফলভাবে এন্ট্রি হয়েছে`,
    id: result.meta.last_row_id
  }, 201)
})

// ──────────────────────────────────────────────────────────────
// 2. GET PROJECT TRANSACTIONS (with filters)
// ──────────────────────────────────────────────────────────────

financeRoutes.get('/transactions/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const { page, limit, offset } = getPagination(c.req.query())
  const type = c.req.query('type') // 'expense' | 'revenue' | undefined

  // Verify project exists
  const project = await c.env.DB.prepare(
    'SELECT id, title FROM projects WHERE id = ?'
  ).bind(projectId).first<{ id: number; title: string }>()

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  let query = `
    SELECT t.*, u.name as created_by_name 
    FROM project_transactions t
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.project_id = ?
  `
  const params: (string | number)[] = [projectId]

  if (type && (type === 'expense' || type === 'revenue')) {
    query += ` AND t.transaction_type = ?`
    params.push(type)
  }

  query += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT ? OFFSET ?`
  params.push(limit, offset)

  // Build count query separately with parameterized type filter
  let countQuery = 'SELECT COUNT(*) as total FROM project_transactions WHERE project_id = ?'
  const countParams: (string | number)[] = [projectId]
  if (type) {
    countQuery += ' AND transaction_type = ?'
    countParams.push(type)
  }

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(query).bind(...params).all<ProjectTransaction & { created_by_name: string }>(),
    c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>()
  ])

  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})

// ──────────────────────────────────────────────────────────────
// 3. UPDATE TRANSACTION
// ──────────────────────────────────────────────────────────────

financeRoutes.put('/transactions/:id', zValidator('json', updateTransactionSchema), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  const data = c.req.valid('json')
  if (Object.keys(data).length === 0) return err(c, 'কোনো পরিবর্তন নেই')

  // Check if transaction exists
  const existing = await c.env.DB.prepare(
    'SELECT id FROM project_transactions WHERE id = ?'
  ).bind(id).first<{ id: number }>()

  if (!existing) return err(c, 'ট্রানজেকশন পাওয়া যায়নি', 404)

  // Use whitelist approach - only allow specific fields
  const fields = Object.keys(data).filter(k => 
    (ALLOWED_TRANSACTION_FIELDS as readonly string[]).includes(k) && 
    data[k as keyof typeof data] !== undefined
  )
  if (fields.length === 0) return err(c, 'কোনো পরিবর্তন নেই')

  const setClauses = fields.map(k => `${k} = ?`).join(', ')
  const values = fields.map(k => data[k as keyof typeof data])

  await c.env.DB.prepare(
    `UPDATE project_transactions SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`
  ).bind(...values, id).run()

  return ok(c, { message: 'আপডেট সফল' })
})

// ──────────────────────────────────────────────────────────────
// 4. DELETE TRANSACTION
// ──────────────────────────────────────────────────────────────

financeRoutes.delete('/transactions/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  const result = await c.env.DB.prepare(
    'DELETE FROM project_transactions WHERE id = ?'
  ).bind(id).run()

  if (result.meta.changes === 0) return err(c, 'ট্রানজেকশন পাওয়া যায়নি', 404)

  return ok(c, { message: 'ডিলিট সফল' })
})

// ──────────────────────────────────────────────────────────────
// 5. GET FINANCIAL SUMMARY (P&L)
// ──────────────────────────────────────────────────────────────

financeRoutes.get('/summary/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  // Get project info with share details
  const project = await c.env.DB.prepare(
    `SELECT p.id, p.title, p.share_price, p.total_shares, p.status,
      COALESCE((SELECT SUM(us.quantity) FROM user_shares us WHERE us.project_id = p.id), 0) as shares_sold,
      (SELECT COUNT(DISTINCT user_id) FROM user_shares WHERE project_id = p.id AND quantity > 0) as shareholders_count
     FROM projects p WHERE p.id = ?`
  ).bind(projectId).first<{
    id: number
    title: string
    share_price: number
    total_shares: number
    status: string
    shares_sold: number
    shareholders_count: number
  }>()

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  // Get financials
  const financials = await c.env.DB.prepare(
    `SELECT 
      COALESCE(SUM(CASE WHEN transaction_type = 'revenue' THEN amount ELSE 0 END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
      COUNT(CASE WHEN transaction_type = 'revenue' THEN 1 END) as revenue_count,
      COUNT(CASE WHEN transaction_type = 'expense' THEN 1 END) as expense_count
    FROM project_transactions 
    WHERE project_id = ?`
  ).bind(projectId).first<{
    total_revenue: number
    total_expense: number
    revenue_count: number
    expense_count: number
  }>()

  const totalRevenue = financials?.total_revenue ?? 0
  const totalExpense = financials?.total_expense ?? 0
  const netProfit = totalRevenue - totalExpense

  // Get previously distributed
  const distributed = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(distributable_amount), 0) as total_distributed
     FROM profit_distributions 
     WHERE project_id = ? AND status = 'distributed'`
  ).bind(projectId).first<{ total_distributed: number }>()

  const totalDistributed = distributed?.total_distributed ?? 0
  const undistributedProfit = netProfit - totalDistributed

  // Get category breakdown
  const categoryBreakdown = await c.env.DB.prepare(
    `SELECT 
      transaction_type,
      category,
      SUM(amount) as total_amount,
      COUNT(*) as transaction_count
    FROM project_transactions 
    WHERE project_id = ?
    GROUP BY transaction_type, category
    ORDER BY transaction_type, total_amount DESC`
  ).bind(projectId).all<{
    transaction_type: string
    category: string
    total_amount: number
    transaction_count: number
  }>()

  // Get monthly trend
  const monthlyTrend = await c.env.DB.prepare(
    `SELECT 
      strftime('%Y-%m', transaction_date) as month,
      SUM(CASE WHEN transaction_type = 'revenue' THEN amount ELSE 0 END) as revenue,
      SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as expense,
      SUM(CASE WHEN transaction_type = 'revenue' THEN amount ELSE 0 END) - 
      SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as profit
    FROM project_transactions 
    WHERE project_id = ?
    GROUP BY strftime('%Y-%m', transaction_date)
    ORDER BY month DESC
    LIMIT 12`
  ).bind(projectId).all<{
    month: string
    revenue: number
    expense: number
    profit: number
  }>()

  const summary: ProjectFinancialSummary = {
    project_id: projectId,
    project_name: project.title,
    total_revenue: totalRevenue,
    total_expense: totalExpense,
    net_profit: netProfit,
    profit_margin_percent: totalRevenue > 0 ? Math.round((netProfit * 10000) / totalRevenue) / 100 : 0,
    total_distributed: totalDistributed,
    undistributed_profit: undistributedProfit,
    revenue_count: financials?.revenue_count ?? 0,
    expense_count: financials?.expense_count ?? 0
  }

  return ok(c, {
    project: {
      id: project.id,
      title: project.title,
      status: project.status,
      share_price: project.share_price,
      total_shares: project.total_shares,
      shares_sold: project.shares_sold,
      shareholders_count: project.shareholders_count
    },
    financials: summary,
    category_breakdown: categoryBreakdown.results,
    monthly_trend: monthlyTrend.results
  })
})

// ──────────────────────────────────────────────────────────────
// 6. GET TRANSACTION CATEGORIES
// ──────────────────────────────────────────────────────────────

financeRoutes.get('/categories', async (c) => {
  const type = c.req.query('type') // 'expense' | 'revenue' | undefined

  let query = 'SELECT * FROM transaction_categories WHERE is_active = 1'
  const params: string[] = []

  if (type && (type === 'expense' || type === 'revenue')) {
    query += ' AND type = ?'
    params.push(type)
  }

  query += ' ORDER BY type, name'

  const categories = await c.env.DB.prepare(query).bind(...params).all<TransactionCategory>()

  return ok(c, categories.results)
})

// ──────────────────────────────────────────────────────────────
// 7. ADMIN: ADD/EDIT CATEGORY
// ──────────────────────────────────────────────────────────────

financeRoutes.use('/categories/*', adminMiddleware)

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['expense', 'revenue']),
  is_active: z.number().int().min(0).max(1).optional()
})

// Whitelist allowed fields for category updates
const ALLOWED_CATEGORY_FIELDS = ['name', 'type', 'is_active'] as const

financeRoutes.post('/categories', zValidator('json', categorySchema), async (c) => {
  const data = c.req.valid('json')

  const result = await c.env.DB.prepare(
    `INSERT INTO transaction_categories (name, type, is_active) VALUES (?, ?, ?)`
  ).bind(data.name, data.type, data.is_active ?? 1).run()

  if (!result.success) return err(c, 'ক্যাটাগরি তৈরি ব্যর্থ হয়েছে', 500)

  return ok(c, { message: 'ক্যাটাগরি তৈরি হয়েছে', id: result.meta.last_row_id }, 201)
})

financeRoutes.put('/categories/:id', zValidator('json', categorySchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  const data = c.req.valid('json')
  if (Object.keys(data).length === 0) return err(c, 'কোনো পরিবর্তন নেই')

  // Use whitelist approach - only allow specific fields
  const validFields = Object.keys(data).filter(k => 
    (ALLOWED_CATEGORY_FIELDS as readonly string[]).includes(k) && 
    data[k as keyof typeof data] !== undefined
  )
  if (validFields.length === 0) return err(c, 'কোনো বৈধ পরিবর্তন নেই')

  const setClauses = validFields.map(k => `${k} = ?`).join(', ')
  const values = validFields.map(k => data[k as keyof typeof data])

  await c.env.DB.prepare(
    `UPDATE transaction_categories SET ${setClauses} WHERE id = ?`
  ).bind(...values, id).run()

  return ok(c, { message: 'ক্যাটাগরি আপডেট হয়েছে' })
})

financeRoutes.delete('/categories/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  // Soft delete - just set is_active to 0
  await c.env.DB.prepare(
    'UPDATE transaction_categories SET is_active = 0 WHERE id = ?'
  ).bind(id).run()

  return ok(c, { message: 'ক্যাটাগরি নিষ্ক্রিয় করা হয়েছে' })
})
