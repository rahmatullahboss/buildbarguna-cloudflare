import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err, getPagination, paginate } from '../lib/response'
import type { Bindings, Variables, CompanyExpense, CompanyExpenseCategory, CompanyExpenseWithAllocations, CompanyExpenseSummary, ProjectExpenseSummary, ExpenseAllocation } from '../types'

export const companyExpenseRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// All company expense routes require admin
companyExpenseRoutes.use('*', authMiddleware)
companyExpenseRoutes.use('/admin/*', adminMiddleware)

// ──────────────────────────────────────────────────────────────
// 1. ADD COMPANY EXPENSE
// ──────────────────────────────────────────────────────────────

const addExpenseSchema = z.object({
  amount: z.number().int().positive(),
  category_id: z.number().int().positive().optional(),
  category_name: z.string().min(1),
  description: z.string().optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'তারিখ YYYY-MM-DD format হতে হবে').optional(),
  allocation_method: z.enum(['by_project_value', 'by_revenue', 'equal', 'company_only']).default('by_project_value'),
  notes: z.string().optional()
})

companyExpenseRoutes.post('/admin/add', zValidator('json', addExpenseSchema), async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')

  // Verify category exists if provided
  if (data.category_id) {
    const category = await c.env.DB.prepare(
      'SELECT id FROM company_expense_categories WHERE id = ?'
    ).bind(data.category_id).first<{ id: number }>()

    if (!category) return err(c, 'ক্যাটাগরি পাওয়া যায়নি', 404)
  }

  const expenseDate = data.expense_date ?? new Date().toISOString().split('T')[0]

  // For 'company_only' method, we don't allocate to projects yet
  // For other methods, we'll allocate when requested

  const result = await c.env.DB.prepare(
    `INSERT INTO company_expenses 
     (amount, category_id, category_name, description, expense_date, allocation_method, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.amount,
    data.category_id ?? null,
    data.category_name,
    data.description ?? null,
    expenseDate,
    data.allocation_method,
    data.notes ?? null,
    userId
  ).run()

  if (!result.success) return err(c, 'খরচ যোগ করতে ব্যর্থ হয়েছে', 500)

  const expenseId = result.meta.last_row_id

  return ok(c, {
    message: 'কোম্পানি খরচ সফলভাবে যোগ করা হয়েছে',
    expense_id: expenseId,
    allocation_pending: data.allocation_method !== 'company_only'
  }, 201)
})

// ──────────────────────────────────────────────────────────────
// 2. ALLOCATE EXPENSE TO PROJECTS
// ──────────────────────────────────────────────────────────────

const allocateSchema = z.object({
  expense_id: z.number().int().positive(),
  project_ids: z.array(z.number().int().positive()).min(1)
})

companyExpenseRoutes.post('/admin/allocate', zValidator('json', allocateSchema), async (c) => {
  const data = c.req.valid('json')

  // Get the expense
  const expense = await c.env.DB.prepare(
    `SELECT * FROM company_expenses WHERE id = ?`
  ).bind(data.expense_id).first<CompanyExpense>()

  if (!expense) return err(c, 'খরচ পাওয়া যায়নি', 404)
  if (expense.is_allocated) return err(c, 'এই খরচ ইতিমধ্যে বরাদ্দ করা হয়েছে', 400)
  if (expense.allocation_method === 'company_only') return err(c, 'company_only খরচ প্রজেক্টে বরাদ্দ করা যায় না', 400)

  // Get active projects for allocation
  const projects = await c.env.DB.prepare(
    `SELECT id, title, total_capital FROM projects WHERE status = 'active'`
  ).all<{ id: number; title: string; total_capital: number }>()

  if (projects.results.length === 0) return err(c, 'কোনো সক্রিয় প্রজেক্ট নেই', 400)

  let allocations: { project_id: number; amount: number; project_value_pct: number }[] = []

  if (expense.allocation_method === 'by_project_value') {
    // Allocate proportional to project value (total_capital)
    const totalValue = projects.results.reduce((sum, p) => sum + p.total_capital, 0)
    allocations = projects.results.map(p => ({
      project_id: p.id,
      amount: Math.floor((expense.amount * p.total_capital) / totalValue),
      project_value_pct: Math.floor((p.total_capital * 10000) / totalValue) // basis points
    }))
  } else if (expense.allocation_method === 'by_revenue') {
    // Allocate proportional to project revenue (last 30 days)
    // ⚡ Bolt: Use db.batch() instead of Promise.all to prevent per-query HTTP network overhead in D1
    let revenues = projects.results.map(p => ({ ...p, revenue: 0 }))
    if (projects.results.length > 0) {
      const revResults = await c.env.DB.batch<{ total: number }>(
        projects.results.map(p =>
          c.env.DB.prepare(
            `SELECT COALESCE(SUM(amount), 0) as total
             FROM project_transactions
             WHERE project_id = ? AND transaction_type = 'revenue'
             AND transaction_date >= date('now', '-30 days')`
          ).bind(p.id)
        )
      )

      revenues = projects.results.map((p, i) => ({
        ...p,
        revenue: revResults[i].results?.[0]?.total ?? 0
      }))
    }

    const totalRevenue = revenues.reduce((sum, r) => sum + r.revenue, 0)
    if (totalRevenue === 0) {
      // Fallback to equal if no revenue
      const equalAmount = Math.floor(expense.amount / revenues.length)
      allocations = revenues.map(r => ({
        project_id: r.id,
        amount: equalAmount,
        project_value_pct: Math.floor(10000 / revenues.length)
      }))
    } else {
      allocations = revenues.map(r => ({
        project_id: r.id,
        amount: Math.floor((expense.amount * r.revenue) / totalRevenue),
        project_value_pct: Math.floor((r.revenue * 10000) / totalRevenue)
      }))
    }
  } else if (expense.allocation_method === 'equal') {
    // Equal split among all projects
    const equalAmount = Math.floor(expense.amount / projects.results.length)
    allocations = projects.results.map(p => ({
      project_id: p.id,
      amount: equalAmount,
      project_value_pct: Math.floor(10000 / projects.results.length)
    }))
  }

  // Filter to only requested projects
  const requestedAllocations = allocations.filter(a => data.project_ids.includes(a.project_id))

  if (requestedAllocations.length === 0) return err(c, 'কোনো প্রজেক্ট পাওয়া যায়নি', 400)

  // Calculate remaining if some projects were excluded
  const requestedTotal = requestedAllocations.reduce((sum, a) => sum + a.amount, 0)
  const remainder = expense.amount - requestedTotal

  // Insert allocations
  // ⚡ Bolt: Use db.batch() instead of Promise.all to prevent per-query HTTP network overhead in D1
  if (requestedAllocations.length > 0) {
    await c.env.DB.batch(
      requestedAllocations.map(a =>
        c.env.DB.prepare(
          `INSERT INTO expense_allocations (expense_id, project_id, amount, project_value_pct)
           VALUES (?, ?, ?, ?)`
        ).bind(data.expense_id, a.project_id, a.amount, a.project_value_pct)
      )
    )
  }

  // Update expense as allocated
  await c.env.DB.prepare(
    'UPDATE company_expenses SET is_allocated = 1 WHERE id = ?'
  ).bind(data.expense_id).run()

  // Get project titles for response
  const projectTitles = new Map(projects.results.map(p => [p.id, p.title]))

  return ok(c, {
    message: 'খরচ সফলভাবে প্রজেক্টে বরাদ্দ করা হয়েছে',
    expense_id: data.expense_id,
    allocations: requestedAllocations.map(a => ({
      project_id: a.project_id,
      project_title: projectTitles.get(a.project_id) ?? 'Unknown',
      amount: a.amount,
      project_value_pct: a.project_value_pct
    })),
    remainder: remainder // if some projects were excluded
  })
})

// ──────────────────────────────────────────────────────────────
// 3. LIST COMPANY EXPENSES
// ──────────────────────────────────────────────────────────────

companyExpenseRoutes.get('/admin/list', async (c) => {
  const { page, limit, offset } = getPagination(c.req.query())
  const isAllocated = c.req.query('allocated')

  let whereClause = ''
  const params: (string | number)[] = []

  if (isAllocated === 'true') {
    whereClause = 'WHERE is_allocated = 1'
  } else if (isAllocated === 'false') {
    whereClause = 'WHERE is_allocated = 0'
  }

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT ce.*, u.name as created_by_name
       FROM company_expenses ce
       LEFT JOIN users u ON ce.created_by = u.id
       ${whereClause}
       ORDER BY ce.expense_date DESC, ce.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(limit, offset).all<CompanyExpense & { created_by_name: string }>(),

    c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM company_expenses ${whereClause.replace('WHERE', 'WHERE')}`
    ).bind().first<{ total: number }>()
  ])

  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})

// ──────────────────────────────────────────────────────────────
// 4. GET EXPENSE SUMMARY (Dashboard) - MUST be before /:id
// ──────────────────────────────────────────────────────────────

companyExpenseRoutes.get('/admin/summary', async (c) => {
  const period = c.req.query('period') || 'month' // month, year, all

  let dateFilter = ''
  if (period === 'month') {
    dateFilter = "AND expense_date >= date('now', '-30 days')"
  } else if (period === 'year') {
    dateFilter = "AND expense_date >= date('now', '-365 days')"
  }

  // Get totals
  const totals = await c.env.DB.prepare(
    `SELECT 
       COALESCE(SUM(amount), 0) as total_expenses,
       COALESCE(SUM(CASE WHEN is_allocated = 1 THEN amount ELSE 0 END), 0) as total_allocated,
       COALESCE(SUM(CASE WHEN is_allocated = 0 THEN amount ELSE 0 END), 0) as pending_allocation,
       COUNT(*) as expenses_count
     FROM company_expenses 
     WHERE 1=1 ${dateFilter}`
  ).first<{
    total_expenses: number
    total_allocated: number
    pending_allocation: number
    expenses_count: number
  }>()

  // Get by category
  const byCategory = await c.env.DB.prepare(
    `SELECT 
       category_name,
       COALESCE(SUM(amount), 0) as total_amount,
       COUNT(*) as count
     FROM company_expenses
     WHERE 1=1 ${dateFilter}
     GROUP BY category_name
     ORDER BY total_amount DESC`
  ).all<{ category_name: string; total_amount: number; count: number }>()

  const summary: CompanyExpenseSummary = {
    total_expenses: totals?.total_expenses ?? 0,
    total_allocated: totals?.total_allocated ?? 0,
    pending_allocation: totals?.pending_allocation ?? 0,
    expenses_count: totals?.expenses_count ?? 0,
    by_category: byCategory.results
  }

  return ok(c, summary)
})

// ──────────────────────────────────────────────────────────────
// 5. GET EXPENSE DETAILS WITH ALLOCATIONS
// ──────────────────────────────────────────────────────────────

companyExpenseRoutes.get('/admin/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  const expense = await c.env.DB.prepare(
    `SELECT ce.*, u.name as created_by_name
     FROM company_expenses ce
     LEFT JOIN users u ON ce.created_by = u.id
     WHERE ce.id = ?`
  ).bind(id).first<CompanyExpense & { created_by_name: string }>()

  if (!expense) return err(c, 'খরচ পাওয়া যায়নি', 404)

  const allocations = await c.env.DB.prepare(
    `SELECT ea.*, p.title as project_title, p.total_capital as project_value
     FROM expense_allocations ea
     JOIN projects p ON ea.project_id = p.id
     WHERE ea.expense_id = ?
     ORDER BY ea.amount DESC`
  ).bind(id).all<ExpenseAllocation & { project_title: string; project_value: number }>()

  const result: CompanyExpenseWithAllocations = {
    ...expense,
    allocations: allocations.results
  }

  return ok(c, result)
})

// ──────────────────────────────────────────────────────────────
// 5. DELETE COMPANY EXPENSE
// ──────────────────────────────────────────────────────────────

companyExpenseRoutes.delete('/admin/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  // Check if allocated
  const expense = await c.env.DB.prepare(
    'SELECT is_allocated FROM company_expenses WHERE id = ?'
  ).bind(id).first<{ is_allocated: number }>()

  if (!expense) return err(c, 'খরচ পাওয়া যায়নি', 404)
  if (expense.is_allocated) return err(c, 'বরাদ্দ করা খরচ মুছে ফেলা যায় না', 400)

  // Delete allocations first (should be none anyway)
  await c.env.DB.prepare('DELETE FROM expense_allocations WHERE expense_id = ?').bind(id).run()

  // Delete expense
  const result = await c.env.DB.prepare('DELETE FROM company_expenses WHERE id = ?').bind(id).run()

  if (!result.success) return err(c, 'মুছে ফেলতে ব্যর্থ হয়েছে', 500)

  return ok(c, { message: 'খরচ সফলভাবে মুছে ফেলা হয়েছে' })
})

// ──────────────────────────────────────────────────────────────
// 3. GET CATEGORIES - before /:id to avoid route conflict
// ──────────────────────────────────────────────────────────────

companyExpenseRoutes.get('/categories', async (c) => {
  const categories = await c.env.DB.prepare(
    'SELECT * FROM company_expense_categories WHERE is_active = 1 ORDER BY name'
  ).all<CompanyExpenseCategory>()

  return ok(c, categories.results)
})

// NOTE: Duplicate route handlers for /categories and /admin/summary removed (H3 fix)




// ──────────────────────────────────────────────────────────────
// 6. GET PROJECT EXPENSE SUMMARY - before /:id
// ──────────────────────────────────────────────────────────────

companyExpenseRoutes.get('/project-summary/:projectId', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  // Verify project exists
  const project = await c.env.DB.prepare(
    'SELECT id, title, total_capital FROM projects WHERE id = ?'
  ).bind(projectId).first<{ id: number; title: string; total_capital: number }>()

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  // Get direct project expenses
  const directExpenses = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM project_transactions 
     WHERE project_id = ? AND transaction_type = 'expense'`
  ).bind(projectId).first<{ total: number }>()

  // Get company expense allocation
  const companyAllocation = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM expense_allocations 
     WHERE project_id = ?`
  ).bind(projectId).first<{ total: number }>()

  // Get allocation percentage (basis points of project value)
  const allocationPct = project.total_capital > 0
    ? Math.floor((companyAllocation?.total ?? 0) * 10000 / project.total_capital)
    : 0

  const summary: ProjectExpenseSummary = {
    project_id: project.id,
    project_name: project.title,
    direct_expenses: directExpenses?.total ?? 0,
    company_expense_allocation: companyAllocation?.total ?? 0,
    total_expenses: (directExpenses?.total ?? 0) + (companyAllocation?.total ?? 0),
    project_value: project.total_capital,
    allocation_percentage: allocationPct
  }

  return ok(c, summary)
})

// ──────────────────────────────────────────────────────────────
// 9. RECALCULATE ALLOCATIONS (admin only - recalculate all pending)
// ──────────────────────────────────────────────────────────────

companyExpenseRoutes.post('/admin/recalculate', async (c) => {
  const userId = c.get('userId')

  // Get all unallocated expenses
  const unallocated = await c.env.DB.prepare(
    `SELECT * FROM company_expenses 
     WHERE is_allocated = 0 AND allocation_method != 'company_only'
     ORDER BY expense_date ASC`
  ).all<CompanyExpense>()

  if (unallocated.results.length === 0) {
    return ok(c, { message: 'কোনো নতুন বরাদ্দ নেই', processed: 0 })
  }

  // Get active projects
  const projects = await c.env.DB.prepare(
    `SELECT id, title, total_capital FROM projects WHERE status = 'active'`
  ).all<{ id: number; title: string; total_capital: number }>()

  if (projects.results.length === 0) {
    return err(c, 'কোনো সক্রিয় প্রজেক্ট নেই', 400)
  }

  const totalValue = projects.results.reduce((sum, p) => sum + p.total_capital, 0)

  let processedCount = 0
  const errors: string[] = []

  for (const expense of unallocated.results) {
    try {
      let allocations: { project_id: number; amount: number; project_value_pct: number }[] = []

      if (expense.allocation_method === 'by_project_value') {
        allocations = projects.results.map(p => ({
          project_id: p.id,
          amount: Math.floor((expense.amount * p.total_capital) / totalValue),
          project_value_pct: Math.floor((p.total_capital * 10000) / totalValue)
        }))
      } else if (expense.allocation_method === 'equal') {
        const equalAmount = Math.floor(expense.amount / projects.results.length)
        allocations = projects.results.map(p => ({
          project_id: p.id,
          amount: equalAmount,
          project_value_pct: Math.floor(10000 / projects.results.length)
        }))
      }

      // Insert allocations
      // ⚡ Bolt: Use db.batch() instead of Promise.all to prevent per-query HTTP network overhead in D1
      if (allocations.length > 0) {
        await c.env.DB.batch(
          allocations.map(a =>
            c.env.DB.prepare(
              `INSERT INTO expense_allocations (expense_id, project_id, amount, project_value_pct)
               VALUES (?, ?, ?, ?)`
            ).bind(expense.id, a.project_id, a.amount, a.project_value_pct)
          )
        )
      }

      // Mark as allocated
      await c.env.DB.prepare(
        'UPDATE company_expenses SET is_allocated = 1 WHERE id = ?'
      ).bind(expense.id).run()

      processedCount++
    } catch (e) {
      errors.push(`Expense ${expense.id}: ${e}`)
    }
  }

  return ok(c, {
    message: `${processedCount}টি খরচ বরাদ্দ করা হয়েছে`,
    processed: processedCount,
    errors: errors.length > 0 ? errors : undefined
  })
})
