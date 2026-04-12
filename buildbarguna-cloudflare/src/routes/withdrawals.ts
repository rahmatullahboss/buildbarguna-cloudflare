import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err, getPagination, paginate } from '../lib/response'
import type {
  Bindings, Variables, Withdrawal, WithdrawalWithUser,
  WithdrawalSettings, AvailableBalance, UserBalance
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
 * Uses user_balances table if available, otherwise calculates dynamically.
 */
async function getAvailableBalance(db: D1Database, userId: number): Promise<AvailableBalance> {
  // Always fetch live pending/approved breakdown from withdrawals table
  const liveCounts = await db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'pending'  THEN amount_paisa ELSE 0 END), 0) as pending_live,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN amount_paisa ELSE 0 END), 0) as approved_live
    FROM withdrawals WHERE user_id = ? AND status IN ('pending', 'approved')
  `).bind(userId).first<{ pending_live: number; approved_live: number }>()

  const pendingPaisa  = liveCounts?.pending_live  ?? 0
  const approvedPaisa = liveCounts?.approved_live ?? 0
  const reservedPaisa = pendingPaisa + approvedPaisa

  // First try to get balance from user_balances table (explicit tracking)
  const explicitBalance = await db.prepare(
    `SELECT total_earned_paisa, total_withdrawn_paisa, reserved_paisa
     FROM user_balances WHERE user_id = ?`
  ).bind(userId).first<UserBalance>()

  // If user_balances exists, use it for earned/withdrawn totals
  if (explicitBalance) {
    return {
      total_earned_paisa:    explicitBalance.total_earned_paisa,
      total_withdrawn_paisa: explicitBalance.total_withdrawn_paisa,
      pending_paisa:         pendingPaisa,
      approved_paisa:        approvedPaisa,
      reserved_paisa:        reservedPaisa,
      available_paisa:
        explicitBalance.total_earned_paisa -
        explicitBalance.total_withdrawn_paisa -
        reservedPaisa
    }
  }

  // Fall back to dynamic calculation from earnings and withdrawals
  const result = await db.prepare(`
    SELECT
      (SELECT COALESCE(SUM(amount), 0) FROM earnings WHERE user_id = ?) +
      (SELECT COALESCE(SUM(amount_paisa), 0) FROM referral_bonuses WHERE referrer_user_id = ?) as total_earned,
      (SELECT COALESCE(SUM(amount_paisa), 0) FROM withdrawals WHERE user_id = ? AND status = 'completed') as total_withdrawn
  `).bind(userId, userId, userId).first<{ total_earned: number; total_withdrawn: number }>()

  const totalEarned    = result?.total_earned    ?? 0
  const totalWithdrawn = result?.total_withdrawn ?? 0

  return {
    total_earned_paisa:    totalEarned,
    total_withdrawn_paisa: totalWithdrawn,
    pending_paisa:         pendingPaisa,
    approved_paisa:        approvedPaisa,
    reserved_paisa:        reservedPaisa,
    available_paisa:       totalEarned - totalWithdrawn - reservedPaisa
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

// GET /api/withdrawals/balance/breakdown — category-wise income breakdown
withdrawalRoutes.get('/balance/breakdown', async (c) => {
  const userId = c.get('userId')

  // Parallel queries: per-project earnings + capital refund + referral bonuses + legacy audit log entries + explicit balance
  const [projectEarnings, capitalRefunds, referralBonus, legacyEntries, explicitBalance] = await Promise.all([
    c.env.DB.prepare(
      `SELECT p.title as project_title, p.id as project_id, SUM(e.amount) as total_paisa, COUNT(DISTINCT e.month) as months
       FROM earnings e
       JOIN projects p ON p.id = e.project_id
       WHERE e.user_id = ?
         AND e.month NOT LIKE 'refund-%'
       GROUP BY e.project_id
       ORDER BY total_paisa DESC`
    ).bind(userId).all<{ project_title: string; project_id: number; total_paisa: number; months: number }>(),

    c.env.DB.prepare(
      `SELECT p.title as project_title, p.id as project_id, SUM(e.amount) as total_paisa, COUNT(*) as refund_count
       FROM earnings e
       JOIN projects p ON p.id = e.project_id
       WHERE e.user_id = ?
         AND e.month LIKE 'refund-%'
       GROUP BY e.project_id
       ORDER BY total_paisa DESC`
    ).bind(userId).all<{ project_title: string; project_id: number; total_paisa: number; refund_count: number }>(),

    c.env.DB.prepare(
      `SELECT COALESCE(SUM(amount_paisa), 0) as total, COUNT(*) as count
       FROM referral_bonuses WHERE referrer_user_id = ?`
    ).bind(userId).first<{ total: number; count: number }>(),

    // Legacy earnings from balance_audit_log (old monthly_earnings + capital_refund etc.)
    c.env.DB.prepare(
      `SELECT reference_type, COALESCE(SUM(amount_paisa), 0) as total, COUNT(*) as cnt
       FROM balance_audit_log
       WHERE user_id = ? AND change_type = 'earn'
       GROUP BY reference_type`
    ).bind(userId).all<{ reference_type: string; total: number; cnt: number }>(),

    // Get the actual tracked total from user_balances (if exists)
    c.env.DB.prepare(
      `SELECT total_earned_paisa FROM user_balances WHERE user_id = ?`
    ).bind(userId).first<{ total_earned_paisa: number }>()
  ])

  const breakdown: { source: string; label: string; project_title?: string; project_id?: number; amount_paisa: number; detail?: string }[] = []
  let sumFromSources = 0

  // Project-wise earnings (from new earnings table)
  for (const row of projectEarnings.results) {
    breakdown.push({
      source: 'project_earnings',
      label: 'প্রজেক্ট মুনাফা',
      project_title: row.project_title,
      project_id: row.project_id,
      amount_paisa: row.total_paisa,
      detail: `${row.months} মাস`
    })
    sumFromSources += row.total_paisa
  }

  // Capital refunds are stored in earnings as refund-YYYY-MM months.
  // Keep them separate in the breakdown so principal is visible and not merged with profit.
  for (const row of capitalRefunds.results) {
    breakdown.push({
      source: 'capital_refund',
      label: 'মূলধন ফেরত',
      project_title: row.project_title,
      project_id: row.project_id,
      amount_paisa: row.total_paisa,
      detail: `${row.refund_count} বার`
    })
    sumFromSources += row.total_paisa
  }

  // Legacy monthly earnings from old system (balance_audit_log)
  const legacyLabels: Record<string, string> = {
    monthly_earnings: 'পূর্বের মাসিক মুনাফা',
    capital_refund: 'মূলধন ফেরত',
    referral_bonus: '', // handled separately
    profit_distribution: '' // already in earnings table
  }

  for (const entry of legacyEntries.results) {
    // Skip types already accounted for elsewhere.
    // profit_distribution is written into earnings directly,
    // capital_refund is separated above from earnings,
    // and referral_bonus comes from referral_bonuses directly.
    if (
      entry.reference_type === 'profit_distribution' ||
      entry.reference_type === 'referral_bonus' ||
      entry.reference_type === 'capital_refund'
    ) continue
    if (entry.total <= 0) continue
    
    breakdown.push({
      source: entry.reference_type,
      label: legacyLabels[entry.reference_type] || 'অন্যান্য আয়',
      amount_paisa: entry.total,
      detail: entry.reference_type === 'monthly_earnings' ? `${entry.cnt} বার` :
              entry.reference_type === 'capital_refund' ? 'মূলধন ফেরত' : `${entry.cnt} টি`
    })
    sumFromSources += entry.total
  }

  // Referral bonuses
  const refTotal = referralBonus?.total ?? 0
  if (refTotal > 0) {
    breakdown.push({
      source: 'referral_bonus',
      label: 'রেফারেল বোনাস',
      amount_paisa: refTotal,
      detail: `${referralBonus?.count ?? 0} জন`
    })
    sumFromSources += refTotal
  }

  // Final discrepancy check — if user_balances still doesn't match, show as misc
  const actualTotal = explicitBalance?.total_earned_paisa ?? sumFromSources
  const miscAmount = actualTotal - sumFromSources

  if (miscAmount > 0) {
    breakdown.push({
      source: 'other',
      label: 'অন্যান্য',
      amount_paisa: miscAmount,
      detail: 'সিস্টেম সমন্বয়'
    })
  }

  return ok(c, { total_earned_paisa: actualTotal, breakdown })
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
  amount_paisa: z.number().int().min(100, 'সর্বনিম্ন ৳১.০০ হতে হবে').max(100000000, 'সর্বোচ্চ ৳১,০০,০০০ পর্যন্ত অনুমোদিত'),
  bkash_number: z.string().regex(/^01[3-9]\d{8}$/, 'সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)').optional(),
  withdrawal_method: z.enum(['bkash', 'nagad', 'cash']).default('bkash')
})

withdrawalRoutes.post('/request', zValidator('json', requestSchema), async (c) => {
  const { amount_paisa, bkash_number, withdrawal_method } = c.req.valid('json')
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
  // max_paisa check removed — users can withdraw full available balance

  // Validate available balance (includes pending reservation)
  if (amount_paisa > balance.available_paisa) {
    return err(c, `অপর্যাপ্ত ব্যালেন্স। উপলব্ধ: ৳${(balance.available_paisa / 100).toFixed(2)}`)
  }

  // Validate number for bkash/nagad method
  if (withdrawal_method === 'bkash' || withdrawal_method === 'nagad') {
    if (!bkash_number || !/^01[3-9]\d{8}$/.test(bkash_number)) {
      return err(c, 'বৈধ মোবাইল নম্বর দিন (01XXXXXXXXX ফরম্যাটে)')
    }
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

  // H6 FIX: Only 'completed' withdrawals should trigger cooldown — rejected should NOT penalize user
  const recentCompleted = await c.env.DB.prepare(
    `SELECT id FROM withdrawals
     WHERE user_id = ? AND status = 'completed'
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
      `INSERT INTO withdrawals (user_id, amount_paisa, bkash_number, withdrawal_method)
       VALUES (?, ?, ?, ?)`
    ).bind(userId, amount_paisa, (withdrawal_method === 'bkash' || withdrawal_method === 'nagad') ? bkash_number : null, withdrawal_method).run()
  } catch (e: any) {
    // D1 UNIQUE constraint error on idx_one_pending_per_user
    if (e?.message?.includes('UNIQUE') || e?.message?.includes('unique')) {
      return err(c, 'আপনার একটি উত্তোলন অনুরোধ ইতিমধ্যে অপেক্ষমাণ আছে।', 409)
    }
    return err(c, 'উত্তোলন অনুরোধ জমা দিতে ব্যর্থ হয়েছে', 500)
  }

  if (!result.success) return err(c, 'উত্তোলন অনুরোধ জমা দিতে ব্যর্থ হয়েছে', 500)

  return ok(c, {
    message: 'উত্তোলন অনুরোধ জমা হয়েছে। অ্যাডমিন ৭২ ঘন্টার মধ্যে যাচাই করে পাঠাবে।',
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

// PATCH /api/admin/withdrawals/:id/approve — approve request + deduct money (atomic with transaction)
adminWithdrawalRoutes.patch('/:id/approve', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'Invalid ID')
  const adminId = c.get('userId')

  // Fetch withdrawal first
  const withdrawal = await c.env.DB.prepare(
    `SELECT * FROM withdrawals WHERE id = ? AND status = 'pending'`
  ).bind(id).first<Withdrawal>()
  if (!withdrawal) return err(c, 'Request not found or already processed', 404)

  // Use D1 batch for atomic operation - all or nothing
  try {
    // Step 1: Check/create user_balances atomically with reservation
    let balanceRecord = await c.env.DB.prepare(
      `SELECT * FROM user_balances WHERE user_id = ?`
    ).bind(withdrawal.user_id).first<UserBalance>()

    if (!balanceRecord) {
      // Get current dynamic balance including existing pending/approved withdrawals as reserved
      const currentBalance = await getAvailableBalance(c.env.DB, withdrawal.user_id)
      const totalEarned = currentBalance.total_earned_paisa
      // CRITICAL FIX: Exclude the current withdrawal from reserved count.
      // getAvailableBalance() counts ALL pending/approved withdrawals including this one,
      // but Step 4 below will add this withdrawal's amount to reserved_paisa.
      // Without this fix, the amount gets double-counted and the balance check always fails.
      const existingReserved = Math.max(0, currentBalance.pending_paisa - withdrawal.amount_paisa)

      // Insert with existing reserved amount accounted for
      await c.env.DB.prepare(
        `INSERT INTO user_balances (user_id, total_earned_paisa, total_withdrawn_paisa, reserved_paisa)
         VALUES (?, ?, 0, ?)`
      ).bind(withdrawal.user_id, totalEarned, existingReserved).run()

      // Create audit log for initialization (reference_id = NULL for init)
      await c.env.DB.prepare(
        `INSERT INTO balance_audit_log (user_id, amount_paisa, change_type, reference_type, reference_id, admin_id, note)
         VALUES (?, ?, 'adjustment', 'initialization', NULL, ?, ?)`
      ).bind(withdrawal.user_id, totalEarned, adminId, `Initialized from earnings - existing reserved: ${existingReserved}`).run()

      balanceRecord = {
        id: 0,
        user_id: withdrawal.user_id,
        total_earned_paisa: totalEarned,
        total_withdrawn_paisa: 0,
        reserved_paisa: existingReserved,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }

    // Step 2: Check available balance
    const explicitAvailable = balanceRecord.total_earned_paisa - balanceRecord.total_withdrawn_paisa - balanceRecord.reserved_paisa
    if (withdrawal.amount_paisa > explicitAvailable) {
      return err(c, 'Insufficient explicit balance - approval not possible', 409)
    }

    // Steps 3-5: ATOMIC BATCH — all-or-nothing to prevent partial failure
    // If status update succeeds but balance doesn't update, we get inconsistent state
    const batchStatements = [
      // Step 3: Update withdrawal status to approved
      c.env.DB.prepare(
        `UPDATE withdrawals SET status = 'approved', approved_by = ?, approved_at = datetime('now')
         WHERE id = ? AND status = 'pending'`
      ).bind(adminId, id),

      // Step 4: Deduct money from user's balance - add to reserved
      c.env.DB.prepare(
        `UPDATE user_balances SET 
           reserved_paisa = reserved_paisa + ?,
           updated_at = datetime('now')
         WHERE user_id = ?`
      ).bind(withdrawal.amount_paisa, withdrawal.user_id),

      // Step 5: Create audit log for the deduction
      c.env.DB.prepare(
        `INSERT INTO balance_audit_log (user_id, amount_paisa, change_type, reference_type, reference_id, admin_id, note)
         VALUES (?, ?, 'withdraw_reserve', 'withdrawal', ?, ?, 'Withdrawal approved - amount reserved')`
      ).bind(withdrawal.user_id, -withdrawal.amount_paisa, id, adminId)
    ]

    const batchResults = await c.env.DB.batch(batchStatements)
    
    // Check if the withdrawal status update actually changed a row (another admin may have approved first)
    if (!batchResults[0].meta.changes) {
      return err(c, 'Request already processed', 409)
    }

    return ok(c, {
      message: 'Withdrawal request approved. Money deducted from balance.',
      amount_paisa: withdrawal.amount_paisa,
      status: 'approved'
    })
  } catch (error: any) {
    console.error('[withdrawal-approve] Error:', error)
    // If any step fails after withdrawal status change, the status change will fail 
    // due to race condition check, so we don't need explicit rollback
    if (error?.message?.includes('UNIQUE') || error?.message?.includes('FOREIGN KEY')) {
      return err(c, 'Database constraint error - request may already be processed', 409)
    }
    return err(c, 'Failed to approve withdrawal', 500)
  }
})

// PATCH /api/admin/withdrawals/:id/complete — mark completed + add TxID
const completeSchema = z.object({
  bkash_txid: z.string().min(1, 'TxID বা পদ্ধতি দিন').max(20)
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

  // For bKash (non-CASH), validate TxID format and check duplicates
  const isCash = bkash_txid === 'CASH' || (withdrawal as any).withdrawal_method === 'cash'
  if (!isCash) {
    if (!/^[A-Z0-9]{8,12}$/.test(bkash_txid)) {
      return err(c, 'বৈধ TxID দিন (৮-১২ অক্ষর)')
    }
    const dupTx = await c.env.DB.prepare(
      'SELECT id FROM withdrawals WHERE bkash_txid = ?'
    ).bind(bkash_txid).first()
    if (dupTx) return err(c, 'এই TxID ইতিমধ্যে ব্যবহার করা হয়েছে', 409)
  }

  try {
    // Get admin ID from context
    const adminId = c.get('userId')

    // Check user_balances has sufficient reserved amount
    const balanceRecord = await c.env.DB.prepare(
      `SELECT reserved_paisa FROM user_balances WHERE user_id = ?`
    ).bind(withdrawal.user_id).first<{ reserved_paisa: number }>()

    if (!balanceRecord || balanceRecord.reserved_paisa < withdrawal.amount_paisa) {
      console.warn(`[withdrawal-complete] Warning: reserved amount mismatch for user ${withdrawal.user_id}`)
    }

    // ATOMIC BATCH: All-or-nothing — prevents money stuck in "reserved" on partial failure
    const batchStatements = [
      // Step 1: Update withdrawal status to completed
      c.env.DB.prepare(
        `UPDATE withdrawals
         SET status = 'completed', bkash_txid = ?, completed_at = datetime('now')
         WHERE id = ? AND status = 'approved'`
      ).bind(bkash_txid, id),

      // Step 2: Move money from reserved to withdrawn
      c.env.DB.prepare(
        `UPDATE user_balances SET 
           reserved_paisa = MAX(0, reserved_paisa - ?),
           total_withdrawn_paisa = total_withdrawn_paisa + ?,
           updated_at = datetime('now')
         WHERE user_id = ?`
      ).bind(withdrawal.amount_paisa, withdrawal.amount_paisa, withdrawal.user_id),

      // Step 3: Audit log
      c.env.DB.prepare(
        `INSERT INTO balance_audit_log (user_id, amount_paisa, change_type, reference_type, reference_id, admin_id, note)
         VALUES (?, ?, 'withdraw_complete', 'withdrawal', ?, ?, ?)`
      ).bind(withdrawal.user_id, -withdrawal.amount_paisa, id, adminId, `Withdrawal completed - TxID: ${bkash_txid}`)
    ]

    const batchResults = await c.env.DB.batch(batchStatements)

    if (!batchResults[0].meta.changes) return err(c, 'অনুরোধ ইতিমধ্যে প্রক্রিয়া করা হয়েছে', 409)

    return ok(c, { message: `TxID ${bkash_txid} দিয়ে উত্তোলন সম্পন্ন হয়েছে।` })
  } catch (error: any) {
    console.error('[withdrawal-complete] Error:', error)
    return err(c, 'Failed to complete withdrawal', 500)
  }
})

// PATCH /api/admin/withdrawals/:id/reject — reject with reason + release reserved money
const rejectSchema = z.object({
  admin_note: z.string().min(1, 'প্রত্যাখ্যানের কারণ দিন')
})

adminWithdrawalRoutes.patch('/:id/reject', zValidator('json', rejectSchema), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')
  const adminId = c.get('userId')
  const { admin_note } = c.req.valid('json')

  try {
    // Get withdrawal to check current status and amount
    const withdrawal = await c.env.DB.prepare(
      `SELECT * FROM withdrawals WHERE id = ? AND status IN ('pending', 'approved')`
    ).bind(id).first<Withdrawal>()

    if (!withdrawal) return err(c, 'অনুরোধ পাওয়া যায়নি বা ইতিমধ্যে প্রক্রিয়া করা হয়েছে', 404)

    const wasApproved = withdrawal.status === 'approved'

    // Update withdrawal status to rejected
    const result = await c.env.DB.prepare(
      `UPDATE withdrawals
       SET status = 'rejected', admin_note = ?, rejected_at = datetime('now')
       WHERE id = ? AND status IN ('pending', 'approved')`
    ).bind(admin_note, id).run()

    if (!result.meta.changes) return err(c, 'অনুরোধ পাওয়া যায়নি বা ইতিমধ্যে প্রক্রিয়া করা হয়েছে', 404)

    // If withdrawal was approved, release the reserved money back to user
    if (wasApproved) {
      const balanceRecord = await c.env.DB.prepare(
        `SELECT * FROM user_balances WHERE user_id = ?`
      ).bind(withdrawal.user_id).first<UserBalance>()

      if (balanceRecord && balanceRecord.reserved_paisa >= withdrawal.amount_paisa) {
        // Release reserved money back to available
        await c.env.DB.prepare(
          `UPDATE user_balances SET 
             reserved_paisa = reserved_paisa - ?,
             updated_at = datetime('now')
           WHERE user_id = ?`
        ).bind(withdrawal.amount_paisa, withdrawal.user_id).run()

        // Create audit log for release
        await c.env.DB.prepare(
          `INSERT INTO balance_audit_log (user_id, amount_paisa, change_type, reference_type, reference_id, admin_id, note)
           VALUES (?, ?, 'withdraw_release', 'withdrawal', ?, ?, ?)`
        ).bind(withdrawal.user_id, withdrawal.amount_paisa, id, adminId, `Withdrawal rejected - money released back to user. Reason: ${admin_note}`).run()
      } else if (balanceRecord) {
        console.warn(`[withdrawal-reject] Warning: reserved amount mismatch for user ${withdrawal.user_id}`)
      }
    }

    return ok(c, { message: 'উত্তোলন অনুরোধ প্রত্যাখ্যান করা হয়েছে।' })
  } catch (error: any) {
    console.error('[withdrawal-reject] Error:', error)
    return err(c, 'Failed to reject withdrawal', 500)
  }
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
