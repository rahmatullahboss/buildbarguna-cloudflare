import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err, getPagination, paginate } from '../lib/response'
import { toBps } from '../lib/money'
import { distributeMonthlyEarnings } from '../cron/earnings'
import type { Bindings, Variables, Project } from '../types'

export const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminRoutes.use('*', authMiddleware)
adminRoutes.use('*', adminMiddleware)

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
  image_url: z.string().url().optional(),
  total_capital: z.number().int().positive(),   // paisa
  total_shares: z.number().int().positive(),
  share_price: z.number().int().positive(),      // paisa
  status: z.enum(['draft', 'active', 'closed']).optional()
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
  const result = await c.env.DB.prepare(
    `INSERT INTO projects (title, description, image_url, total_capital, total_shares, share_price, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title, body.description ?? null, body.image_url ?? null,
    body.total_capital, body.total_shares, body.share_price,
    body.status ?? 'draft'
  ).run()

  if (!result.success) return err(c, 'প্রজেক্ট তৈরি ব্যর্থ হয়েছে', 500)
  return ok(c, { message: 'প্রজেক্ট তৈরি হয়েছে', id: result.meta.last_row_id }, 201)
})

adminRoutes.put('/projects/:id', zValidator('json', projectSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const body = c.req.valid('json')

  // Whitelist allowed fields — never interpolate arbitrary keys into SQL
  const ALLOWED_FIELDS = ['title', 'description', 'image_url', 'total_capital', 'total_shares', 'share_price', 'status'] as const
  const fields = (Object.keys(body) as string[])
    .filter((k): k is typeof ALLOWED_FIELDS[number] => ALLOWED_FIELDS.includes(k as any) && body[k as keyof typeof body] !== undefined)
  if (fields.length === 0) return err(c, 'কোনো পরিবর্তন নেই')

  const setClauses = fields.map(k => `${k} = ?`).join(', ')
  const values = fields.map(k => body[k as keyof typeof body])

  await c.env.DB.prepare(`UPDATE projects SET ${setClauses} WHERE id = ?`)
    .bind(...values, id).run()

  return ok(c, { message: 'প্রজেক্ট আপডেট হয়েছে' })
})

adminRoutes.patch('/projects/:id/status', zValidator('json', z.object({ status: z.enum(['draft', 'active', 'closed']) })), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const { status } = c.req.valid('json')
  await c.env.DB.prepare('UPDATE projects SET status = ? WHERE id = ?').bind(status, id).run()
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

  const addSharesResult = await c.env.DB.prepare(
    // Conditional INSERT: only executes if remaining capacity >= requested quantity
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
  ).run()

  // If 0 rows changed → not enough shares available — reject safely
  if (addSharesResult.meta.changes === 0) {
    return err(c, 'পর্যাপ্ত শেয়ার নেই, অনুমোদন করা সম্ভব হয়নি', 409)
  }

  // Step 2: Now approve the purchase — shares already added successfully
  const approveResult = await c.env.DB.prepare(
    `UPDATE share_purchases SET status = 'approved', updated_at = datetime('now')
     WHERE id = ? AND status = 'pending'`
  ).bind(id).run()

  // Edge case: another request approved this between our fetch and now
  if (approveResult.meta.changes === 0) {
    // Shares were added but purchase is already approved — undo the duplicate share add
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
        // Bonus goes into referral_bonuses only — NOT earnings table.
        // Balance query in withdrawals.ts already includes referral_bonuses sum.
        if (bonusInsert.meta.changes === 0) {
          // Already credited — idempotent, do nothing
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

// ─── PROFIT RATES ─────────────────────────────────────────────────────────────

const profitRateSchema = z.object({
  project_id: z.number().int().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'YYYY-MM ফরম্যাটে দিন'),
  rate_percent: z.number().positive().max(100)
})

adminRoutes.get('/profit-rates', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT pr.*, p.title FROM profit_rates pr
     JOIN projects p ON p.id = pr.project_id
     ORDER BY pr.month DESC`
  ).all()
  return ok(c, rows.results)
})

adminRoutes.post('/profit-rates', zValidator('json', profitRateSchema), async (c) => {
  const { project_id, month, rate_percent } = c.req.valid('json')
  const rateBps = toBps(rate_percent)

  await c.env.DB.prepare(
    `INSERT INTO profit_rates (project_id, month, rate) VALUES (?, ?, ?)
     ON CONFLICT(project_id, month) DO UPDATE SET rate = excluded.rate`
  ).bind(project_id, month, rateBps).run()

  return ok(c, { message: `${month} মাসের মুনাফার হার ${rate_percent}% সেট করা হয়েছে` })
})

// ─── DISTRIBUTE EARNINGS (Manual Trigger) ────────────────────────────────────

adminRoutes.post('/distribute-earnings', zValidator('json', z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) })), async (c) => {
  const { month } = c.req.valid('json')
  await distributeMonthlyEarnings(c.env, month)
  return ok(c, { message: `${month} মাসের মুনাফা বিতরণ সম্পন্ন হয়েছে` })
})

// ─── DAILY TASKS ──────────────────────────────────────────────────────────────

const taskSchema = z.object({
  title: z.string().min(2),
  destination_url: z.string().url(),
  platform: z.enum(['facebook', 'youtube', 'telegram', 'other']).optional()
})

adminRoutes.get('/tasks', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM daily_tasks ORDER BY created_at DESC'
  ).all()
  return ok(c, rows.results)
})

adminRoutes.post('/tasks', zValidator('json', taskSchema), async (c) => {
  const body = c.req.valid('json')
  const result = await c.env.DB.prepare(
    'INSERT INTO daily_tasks (title, destination_url, platform) VALUES (?, ?, ?)'
  ).bind(body.title, body.destination_url, body.platform ?? 'other').run()
  return ok(c, { message: 'টাস্ক তৈরি হয়েছে', id: result.meta.last_row_id }, 201)
})

adminRoutes.put('/tasks/:id', zValidator('json', taskSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const body = c.req.valid('json')

  const fields = Object.entries(body).filter(([, v]) => v !== undefined)
  if (fields.length === 0) return err(c, 'কোনো পরিবর্তন নেই')

  const setClauses = fields.map(([k]) => `${k} = ?`).join(', ')
  const values = fields.map(([, v]) => v)

  await c.env.DB.prepare(`UPDATE daily_tasks SET ${setClauses} WHERE id = ?`)
    .bind(...values, id).run()
  return ok(c, { message: 'টাস্ক আপডেট হয়েছে' })
})

adminRoutes.patch('/tasks/:id/toggle', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const task = await c.env.DB.prepare('SELECT is_active FROM daily_tasks WHERE id = ?').bind(id).first<{ is_active: number }>()
  if (!task) return err(c, 'টাস্ক পাওয়া যায়নি', 404)
  await c.env.DB.prepare('UPDATE daily_tasks SET is_active = ? WHERE id = ?').bind(task.is_active ? 0 : 1, id).run()
  return ok(c, { message: task.is_active ? 'টাস্ক নিষ্ক্রিয় করা হয়েছে' : 'টাস্ক সক্রিয় করা হয়েছে' })
})
