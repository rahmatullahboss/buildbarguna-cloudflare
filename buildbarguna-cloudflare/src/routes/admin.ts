import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err, getPagination, paginate } from '../lib/response'
import { checkRateLimit } from '../lib/rate-limiter'
import type { Bindings, Variables, Project } from '../types'

export const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

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
  image_url: z.string().url().refine(val => val.toLowerCase().startsWith('http://') || val.toLowerCase().startsWith('https://')).optional().or(z.literal('')),
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
    return err(c, 'এই প্রজেক্টে শেয়ার আছে তাই মুছতে পারবেন না। প্রজেক্ট বন্ধ করুন।', 409)
  }
  if ((txCheck?.cnt ?? 0) > 0) {
    return err(c, 'এই প্রজেক্টে আর্থিক লেনদেন আছে তাই মুছতে পারবেন না।', 409)
  }

  // Safe to delete (cascade will remove project_updates & project_gallery)
  const result = await c.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run()
  if (!result.meta.changes) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)
  return ok(c, { message: 'প্রজেক্ট মুছে ফেলা হয়েছে' })
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

  if (project.status !== 'closed' && status === 'closed') {
    // Project is being closed. Refund capital to all shareholders.
    // SECURITY FIX: Batch operations to avoid D1 timeout with large shareholder counts
    const shareholders = await c.env.DB.prepare(
      'SELECT user_id, quantity FROM user_shares WHERE project_id = ? AND quantity > 0'
    ).bind(id).all<{ user_id: number, quantity: number }>()

    if (shareholders.results.length > 0) {
      const adminId = c.get('userId')
      const refundMonth = 'refund-' + new Date().toISOString().slice(0, 7)

      // Collect all statements and batch them to avoid per-shareholder await loops
      const statements: D1PreparedStatement[] = []
      for (const sh of shareholders.results) {
        const refundAmount = sh.quantity * project.share_price

        // Earnings record
        statements.push(
          c.env.DB.prepare(
            `INSERT INTO earnings (user_id, project_id, month, shares, rate, amount)
             VALUES (?, ?, ?, ?, 0, ?)
             ON CONFLICT(user_id, project_id, month) DO UPDATE SET amount = amount + excluded.amount`
          ).bind(sh.user_id, id, refundMonth, sh.quantity, refundAmount)
        )

        // Update user_balances
        statements.push(
          c.env.DB.prepare(
            `UPDATE user_balances SET total_earned_paisa = total_earned_paisa + ?, updated_at = datetime('now') WHERE user_id = ?`
          ).bind(refundAmount, sh.user_id)
        )

        // Audit log
        statements.push(
          c.env.DB.prepare(
            `INSERT INTO balance_audit_log (user_id, amount_paisa, change_type, reference_type, reference_id, admin_id, note)
             VALUES (?, ?, 'earn', 'capital_refund', ?, ?, ?)`
          ).bind(sh.user_id, refundAmount, id, adminId, `Capital refund for project ${id} closure`)
        )
      }

      // D1 batch limit is 100 statements — chunk and execute
      for (let i = 0; i < statements.length; i += 100) {
        await c.env.DB.batch(statements.slice(i, i + 100))
      }
    }
  }

  // For 'completed', record completion timestamp
  if (status === 'completed') {
    await c.env.DB.prepare(
      `UPDATE projects SET status = ?, completed_at = datetime('now'), progress_pct = 100, updated_at = datetime('now') WHERE id = ?`
    ).bind(status, id).run()
  } else {
    await c.env.DB.prepare(`UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, id).run()
  }
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
    'SELECT * FROM share_purchases WHERE id = ? AND status = ?'
  ).bind(id, 'pending').first<{ user_id: number; project_id: number; quantity: number }>()

  if (!purchase) return err(c, 'অনুরোধ পাওয়া যায়নি বা ইতিমধ্যে প্রক্রিয়া করা হয়েছে', 404)

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
  destination_url: z.string().url().refine(val => val.toLowerCase().startsWith('http://') || val.toLowerCase().startsWith('https://')),
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
  image_url: z.string().url().refine(val => val.toLowerCase().startsWith('http://') || val.toLowerCase().startsWith('https://')).optional()
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
