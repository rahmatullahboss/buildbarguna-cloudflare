import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err, getPagination, paginate } from '../lib/response'
import type {
  Bindings, Variables, Withdrawal, WithdrawalWithUser,
  WithdrawalSettings, AvailableBalance
} from '../types'

const withdrawalRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Load withdrawal settings from DB — returns defaults if not found */
async function getSettings(db: D1Database): Promise<WithdrawalSettings> {
  const rows = await db.prepare(
    `SELECT key, value FROM withdrawal_settings WHERE key IN ('min_paisa','max_paisa','cooldown_days')`
  ).all<{ key: string; value: string }>()

  const map: Record<string, number> = {}
  for (const row of rows.results) {
    map[row.key] = parseInt(row.value, 10)
  }

  return {
    min_paisa:     map['min_paisa']     ?? 10000,
    max_paisa:     map['max_paisa']     ?? 500000,
    cooldown_days: map['cooldown_days'] ?? 7
  }
}

/**
 * Compute available balance for a user atomically.
 * available = total_earned - total_completed_withdrawn - total_pending_reserved
 *
 * Uses a single transaction to prevent race conditions.
 */
async function getAvailableBalance(db: D1Database, userId: number): Promise<AvailableBalance> {
  // Use a single query with subqueries to get consistent snapshot
  const result = await db.prepare(`
    SELECT
      (SELECT COALESCE(SUM(amount), 0) FROM earnings WHERE user_id = ?) +
      (SELECT COALESCE(SUM(amount_paisa), 0) FROM referral_bonuses WHERE referrer_user_id = ?) as total_earned,
      (SELECT COALESCE(SUM(amount_paisa), 0) FROM withdrawals WHERE user_id = ? AND status = 'completed') as total_withdrawn,
      (SELECT COALESCE(SUM(amount_paisa), 0) FROM withdrawals WHERE user_id = ? AND status IN ('pending', 'approved')) as pending
  `).bind(userId, userId, userId, userId).first<{ total_earned: number; total_withdrawn: number; pending: number }>()

  const totalEarned = result?.total_earned ?? 0
  const totalWithdrawn = result?.total_withdrawn ?? 0
  const pendingPaisa = result?.pending ?? 0

  return {
    total_earned_paisa: totalEarned,
    total_withdrawn_paisa: totalWithdrawn,
    pending_paisa: pendingPaisa,
    available_paisa: totalEarned - totalWithdrawn - pendingPaisa
  }
}

// ─── User Routes ─────────────────────────────────────────────────────────────

withdrawalRoutes.use('*', authMiddleware)

// GET /api/withdrawals/balance — available balance for withdrawal
withdrawalRoutes.get('/balance', async (c) => {
  const userId = c.get('userId')
  const [balance, settings] = await Promise.all([
    getAvailableBalance(c.env.DB, userId),
    getSettings(c.env.DB)
  ])
  return ok(c, { ...balance, settings })
})

// GET /api/withdrawals/history — my withdrawal history, paginated
withdrawalRoutes.get('/history', async (c) => {
  const { page, limit, offset } = getPagination(c.req.query())
  const userId = c.get('userId')

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT * FROM withdrawals WHERE user_id = ?
       ORDER BY requested_at DESC LIMIT ? OFFSET ?`
    ).bind(userId, limit, offset).all<Withdrawal>(),
    c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM withdrawals WHERE user_id = ?'
    ).bind(userId).first<{ total: number }>()
  ])

  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})

// POST /api/withdrawals/request — submit withdrawal request
const requestSchema = z.object({
  amount_paisa: z.number().int().min(100, 'সর্বনিম্ন ৳১.০০ হতে হবে').max(10000000, 'সর্বোচ্চ ৳১০,০০০.০০ পর্যন্ত অনুমোদিত'), // Hard cap at 10,000 BDT for safety
  bkash_number: z.string().regex(/^01[3-9]\d{8}$/, 'সঠিক bKash নম্বর দিন (01XXXXXXXXX)')
})

withdrawalRoutes.post('/request', zValidator('json', requestSchema), async (c) => {
  const { amount_paisa, bkash_number } = c.req.valid('json')
  const userId = c.get('userId')

  // Additional validation: Check for suspicious round numbers (potential fraud)
  // Amounts like 100000, 200000, 500000 paisa (exact 1000, 2000, 5000 BDT) might indicate testing
  if (amount_paisa % 100000 === 0 && amount_paisa >= 100000 && amount_paisa <= 1000000) {
    console.warn(`[withdrawal] Suspicious round amount: ${amount_paisa} paisa from user ${userId}`)
    // Don't block, but log for monitoring
  }

  // Load settings + balance in parallel
  const [settings, balance] = await Promise.all([
    getSettings(c.env.DB),
    getAvailableBalance(c.env.DB, userId)
  ])

  // Validate amount against settings
  if (amount_paisa < settings.min_paisa) {
    return err(c, `সর্বনিম্ন উত্তোলনের পরিমাণ ৳${settings.min_paisa / 100}`)
  }
  if (amount_paisa > settings.max_paisa) {
    return err(c, `সর্বোচ্চ উত্তোলনের পরিমাণ ৳${settings.max_paisa / 100}`)
  }

  // Validate available balance (includes pending reservation)
  if (amount_paisa > balance.available_paisa) {
    return err(c, `অপর্যাপ্ত ব্যালেন্স। উপলব্ধ: ৳${(balance.available_paisa / 100).toFixed(2)}`)
  }

  // Validate bKash number format more strictly
  if (!/^01[3-9]\d{8}$/.test(bkash_number)) {
    return err(c, 'বৈধ bKash নম্বর দিন (01XXXXXXXXX ফরম্যাটে)')
  }

  // Check if already has a pending withdrawal (partial unique index enforces this in DB,
  // but we return a friendly error here)
  const pending = await c.env.DB.prepare(
    `SELECT id FROM withdrawals WHERE user_id = ? AND status = 'pending'`
  ).bind(userId).first()
  if (pending) {
    return err(c, 'আপনার একটি উত্তোলন অনুরোধ অপেক্ষমাণ আছে। অনুমোদনের পরে নতুন অনুরোধ করুন।', 409)
  }

  // Rate limit via D1: check last completed/rejected withdrawal within cooldown_days
  const cooldownDate = new Date()
  cooldownDate.setDate(cooldownDate.getDate() - settings.cooldown_days)
  const cooldownStr = cooldownDate.toISOString().slice(0, 10)

  const recentCompleted = await c.env.DB.prepare(
    `SELECT id FROM withdrawals
     WHERE user_id = ? AND status IN ('completed', 'rejected')
     AND requested_at >= ?
     ORDER BY requested_at DESC LIMIT 1`
  ).bind(userId, cooldownStr).first()

  if (recentCompleted) {
    return err(c, `প্রতি ${settings.cooldown_days} দিনে একবার উত্তোলন করা যাবে।`, 429)
  }

  // Submit request — catch UNIQUE index violation (partial unique on pending)
  let result
  try {
    result = await c.env.DB.prepare(
      `INSERT INTO withdrawals (user_id, amount_paisa, bkash_number)
       VALUES (?, ?, ?)`
    ).bind(userId, amount_paisa, bkash_number).run()
  } catch (e: any) {
    // D1 UNIQUE constraint error on idx_one_pending_per_user
    if (e?.message?.includes('UNIQUE') || e?.message?.includes('unique')) {
      return err(c, 'আপনার একটি উত্তোলন অনুরোধ ইতিমধ্যে অপেক্ষমাণ আছে।', 409)
    }
    return err(c, 'উত্তোলন অনুরোধ জমা দিতে ব্যর্থ হয়েছে', 500)
  }

  if (!result.success) return err(c, 'উত্তোলন অনুরোধ জমা দিতে ব্যর্থ হয়েছে', 500)

  return ok(c, {
    message: 'উত্তোলন অনুরোধ জমা হয়েছে। অ্যাডমিন অনুমোদনের পরে bKash এ পাঠানো হবে।',
    withdrawal_id: result.meta.last_row_id,
    amount_paisa
  }, 201)
})

// ─── Admin Routes ─────────────────────────────────────────────────────────────

const adminWithdrawalRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
adminWithdrawalRoutes.use('*', authMiddleware)
adminWithdrawalRoutes.use('*', adminMiddleware)

// GET /api/admin/withdrawals — all withdrawals with filters
adminWithdrawalRoutes.get('/', async (c) => {
  const { page, limit, offset } = getPagination(c.req.query())
  const status = c.req.query('status') ?? 'pending'

  const validStatuses = ['pending', 'approved', 'completed', 'rejected', 'all']
  if (!validStatuses.includes(status)) return err(c, 'অকার্যকর স্ট্যাটাস')

  // Use parameterized queries to avoid SQL injection — never interpolate user input
  const [rows, countRow] = await Promise.all([
    status === 'all'
      ? c.env.DB.prepare(
          `SELECT w.*, u.name as user_name, u.phone as user_phone
           FROM withdrawals w JOIN users u ON u.id = w.user_id
           ORDER BY w.requested_at DESC LIMIT ? OFFSET ?`
        ).bind(limit, offset).all<WithdrawalWithUser>()
      : c.env.DB.prepare(
          `SELECT w.*, u.name as user_name, u.phone as user_phone
           FROM withdrawals w JOIN users u ON u.id = w.user_id
           WHERE w.status = ?
           ORDER BY w.requested_at DESC LIMIT ? OFFSET ?`
        ).bind(status, limit, offset).all<WithdrawalWithUser>(),

    status === 'all'
      ? c.env.DB.prepare('SELECT COUNT(*) as total FROM withdrawals').first<{ total: number }>()
      : c.env.DB.prepare('SELECT COUNT(*) as total FROM withdrawals WHERE status = ?')
          .bind(status).first<{ total: number }>()
  ])

  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})

// PATCH /api/admin/withdrawals/:id/approve — approve request
adminWithdrawalRoutes.patch('/:id/approve', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const adminId = c.get('userId')

  // Fetch withdrawal
  const withdrawal = await c.env.DB.prepare(
    `SELECT * FROM withdrawals WHERE id = ? AND status = 'pending'`
  ).bind(id).first<Withdrawal>()
  if (!withdrawal) return err(c, 'অনুরোধ পাওয়া যায়নি বা ইতিমধ্যে প্রক্রিয়া করা হয়েছে', 404)

  // Re-validate balance at approval time (race condition safety)
  const balance = await getAvailableBalance(c.env.DB, withdrawal.user_id)
  if (withdrawal.amount_paisa > balance.available_paisa) {
    return err(c, 'ব্যবহারকারীর পর্যাপ্ত ব্যালেন্স নেই, অনুমোদন করা সম্ভব হয়নি', 409)
  }

  const result = await c.env.DB.prepare(
    `UPDATE withdrawals SET status = 'approved', approved_by = ?, approved_at = datetime('now')
     WHERE id = ? AND status = 'pending'`
  ).bind(adminId, id).run()

  if (!result.meta.changes) return err(c, 'অনুরোধ ইতিমধ্যে প্রক্রিয়া করা হয়েছে', 409)
  return ok(c, { message: 'উত্তোলন অনুরোধ অনুমোদন করা হয়েছে। এখন bKash এ পাঠান।' })
})

// PATCH /api/admin/withdrawals/:id/complete — mark completed + add TxID
const completeSchema = z.object({
  bkash_txid: z.string().regex(/^[A-Z0-9]{8,12}$/, 'বৈধ bKash TxID দিন (৮-১২ অক্ষর)')
})

adminWithdrawalRoutes.patch('/:id/complete', zValidator('json', completeSchema), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const { bkash_txid } = c.req.valid('json')

  // Only approved withdrawals can be completed
  const withdrawal = await c.env.DB.prepare(
    `SELECT * FROM withdrawals WHERE id = ? AND status = 'approved'`
  ).bind(id).first<Withdrawal>()
  if (!withdrawal) return err(c, 'অনুরোধ পাওয়া যায়নি বা অনুমোদিত নয়', 404)

  // Check duplicate TxID
  const dupTx = await c.env.DB.prepare(
    'SELECT id FROM withdrawals WHERE bkash_txid = ?'
  ).bind(bkash_txid).first()
  if (dupTx) return err(c, 'এই TxID ইতিমধ্যে ব্যবহার করা হয়েছে', 409)

  const result = await c.env.DB.prepare(
    `UPDATE withdrawals
     SET status = 'completed', bkash_txid = ?, completed_at = datetime('now')
     WHERE id = ? AND status = 'approved'`
  ).bind(bkash_txid, id).run()

  if (!result.meta.changes) return err(c, 'অনুরোধ ইতিমধ্যে প্রক্রিয়া করা হয়েছে', 409)
  return ok(c, { message: `bKash TxID ${bkash_txid} দিয়ে উত্তোলন সম্পন্ন হয়েছে।` })
})

// PATCH /api/admin/withdrawals/:id/reject — reject with reason
const rejectSchema = z.object({
  admin_note: z.string().min(1, 'প্রত্যাখ্যানের কারণ দিন')
})

adminWithdrawalRoutes.patch('/:id/reject', zValidator('json', rejectSchema), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const { admin_note } = c.req.valid('json')

  const result = await c.env.DB.prepare(
    `UPDATE withdrawals
     SET status = 'rejected', admin_note = ?, rejected_at = datetime('now')
     WHERE id = ? AND status IN ('pending', 'approved')`
  ).bind(admin_note, id).run()

  if (!result.meta.changes) return err(c, 'অনুরোধ পাওয়া যায়নি বা ইতিমধ্যে প্রক্রিয়া করা হয়েছে', 404)
  return ok(c, { message: 'উত্তোলন অনুরোধ প্রত্যাখ্যান করা হয়েছে।' })
})

// GET /api/admin/withdrawals/settings — get current settings
adminWithdrawalRoutes.get('/settings', async (c) => {
  const settings = await getSettings(c.env.DB)
  return ok(c, settings)
})

// PATCH /api/admin/withdrawals/settings — update settings
const settingsSchema = z.object({
  min_paisa:     z.number().int().positive().optional(),
  max_paisa:     z.number().int().positive().optional(),
  cooldown_days: z.number().int().min(1).max(365).optional()
})

adminWithdrawalRoutes.patch('/settings', zValidator('json', settingsSchema), async (c) => {
  const body = c.req.valid('json')
  const entries = Object.entries(body).filter(([, v]) => v !== undefined)
  if (!entries.length) return err(c, 'কোনো পরিবর্তন নেই')

  const statements = entries.map(([key, value]) =>
    c.env.DB.prepare(
      `INSERT INTO withdrawal_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).bind(key, String(value))
  )

  await c.env.DB.batch(statements)
  return ok(c, { message: 'সেটিংস আপডেট হয়েছে' })
})

export { withdrawalRoutes, adminWithdrawalRoutes }
