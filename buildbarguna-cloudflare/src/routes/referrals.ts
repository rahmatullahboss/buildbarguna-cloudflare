import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err } from '../lib/response'
import type { Bindings, Variables } from '../types'

export const referralRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// In-memory rate limiting to minimize KV writes
const referralRateLimitCache = new Map<string, { count: number; expiry: number }>()

function checkReferralRateLimit(key: string, maxAttempts: number, windowSeconds: number): boolean {
  const now = Date.now()
  const cached = referralRateLimitCache.get(key)
  
  if (cached && cached.expiry > now) {
    if (cached.count >= maxAttempts) {
      return false
    }
    cached.count++
    return true
  }
  
  referralRateLimitCache.set(key, { count: 1, expiry: now + windowSeconds * 1000 })
  return true
}

// GET /api/referrals/check — PUBLIC, no auth needed (used by Register page)
// Rate limited: max 10 checks per IP per minute via in-memory
referralRoutes.get('/check', async (c) => {
  const code = c.req.query('code')
  if (!code) return err(c, 'কোড দিন')

  // Basic format check — referral codes are 8 alphanumeric chars
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return err(c, 'রেফারেল কোড সঠিক নয়', 404)

  // Rate limit: 10 requests per IP per minute (in-memory)
  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown'
  if (!checkReferralRateLimit(`ref_check:${ip}`, 10, 60)) {
    return err(c, 'অনেকবার চেষ্টা করা হয়েছে। ১ মিনিট পরে আবার চেষ্টা করুন।', 429)
  }

  const referrer = await c.env.DB.prepare(
    'SELECT name FROM users WHERE referral_code = ? AND is_active = 1'
  ).bind(code).first<{ name: string }>()

  if (!referrer) return err(c, 'রেফারেল কোড সঠিক নয়', 404)

  const maskedName = referrer.name.charAt(0) + '***'
  return ok(c, { valid: true, referrer_name: maskedName })
})

referralRoutes.use('*', authMiddleware)

// GET /api/referrals/my-code
// Returns the current user's referral code and a shareable link
referralRoutes.get('/my-code', async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare(
    'SELECT referral_code FROM users WHERE id = ?'
  ).bind(userId).first<{ referral_code: string }>()

  if (!user) return err(c, 'ব্যবহারকারী পাওয়া যায়নি', 404)

  // Build share link from request origin — no hardcoded domain
  const origin = new URL(c.req.url).origin

  return ok(c, {
    referral_code: user.referral_code,
    share_link: `${origin}/register?ref=${user.referral_code}`
  })
})

// GET /api/referrals/stats
// Returns how many users this person referred and total bonus earned
referralRoutes.get('/stats', async (c) => {
  const userId = c.get('userId')

  const user = await c.env.DB.prepare(
    'SELECT referral_code FROM users WHERE id = ?'
  ).bind(userId).first<{ referral_code: string }>()

  if (!user) return err(c, 'ব্যবহারকারী পাওয়া যায়নি', 404)

  const origin = new URL(c.req.url).origin

  const [referredUsers, bonusSummary, recentReferrals] = await Promise.all([
    // Total referred user count — use referrer_user_id FK (not string code)
    c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM users WHERE referrer_user_id = ?`
    ).bind(userId).first<{ total: number }>(),

    // Total bonus earned from referrals
    c.env.DB.prepare(
      `SELECT COALESCE(SUM(amount_paisa), 0) as total_bonus_paisa,
              COUNT(*) as bonuses_earned
       FROM referral_bonuses WHERE referrer_user_id = ?`
    ).bind(userId).first<{ total_bonus_paisa: number; bonuses_earned: number }>(),

    // Recent referred users — use referrer_user_id FK (not string code)
    c.env.DB.prepare(
      `SELECT
         u.name,
         u.created_at,
         CASE WHEN EXISTS (
           SELECT 1 FROM share_purchases sp
           WHERE sp.user_id = u.id AND sp.status = 'approved'
         ) THEN 1 ELSE 0 END as has_invested,
         CASE WHEN rb.id IS NOT NULL THEN 1 ELSE 0 END as bonus_credited
       FROM users u
       LEFT JOIN referral_bonuses rb
         ON rb.referred_user_id = u.id AND rb.referrer_user_id = ?
       WHERE u.referrer_user_id = ?
       ORDER BY u.created_at DESC
       LIMIT 20`
    ).bind(userId, userId).all()
  ])

  // Mask names for privacy — show first char + ***
  const maskedReferrals = (recentReferrals.results as Array<{
    name: string
    created_at: string
    has_invested: number
    bonus_credited: number
  }>).map(r => ({
    name: r.name.charAt(0) + '***',
    joined_at: r.created_at,
    has_invested: r.has_invested === 1,
    bonus_credited: r.bonus_credited === 1
  }))

  return ok(c, {
    referral_code: user.referral_code,
    share_link: `${origin}/register?ref=${user.referral_code}`,
    total_referred: referredUsers?.total ?? 0,
    total_bonus_paisa: bonusSummary?.total_bonus_paisa ?? 0,
    bonuses_earned: bonusSummary?.bonuses_earned ?? 0,
    referrals: maskedReferrals
  })
})

// ─── ADMIN: Referral Settings ─────────────────────────────────────────────────

export const adminReferralRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminReferralRoutes.use('*', authMiddleware)
adminReferralRoutes.use('*', adminMiddleware)

// GET /api/admin/referrals/settings
adminReferralRoutes.get('/settings', async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT value FROM withdrawal_settings WHERE key = 'referral_bonus_paisa'`
  ).first<{ value: string }>()

  return ok(c, {
    referral_bonus_paisa: parseInt(row?.value ?? '5000')
  })
})

// PATCH /api/admin/referrals/settings — Zod validated, capped at ৳1000
const referralSettingsSchema = z.object({
  referral_bonus_paisa: z.number().int().min(0).max(100_000, 'সর্বোচ্চ ১,০০,০০০ পয়সা (৳১,০০০) দেওয়া যাবে')
})

adminReferralRoutes.patch('/settings', zValidator('json', referralSettingsSchema), async (c) => {
  const { referral_bonus_paisa } = c.req.valid('json')

  await c.env.DB.prepare(
    `INSERT INTO withdrawal_settings (key, value) VALUES ('referral_bonus_paisa', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).bind(String(referral_bonus_paisa)).run()

  return ok(c, { message: 'রেফারেল বোনাস আপডেট হয়েছে', referral_bonus_paisa })
})

// GET /api/admin/referrals/stats — global referral network overview
adminReferralRoutes.get('/stats', async (c) => {
  const [totalBonuses, topReferrers] = await Promise.all([
    c.env.DB.prepare(
      `SELECT COUNT(*) as total_bonuses,
              COALESCE(SUM(amount_paisa), 0) as total_paid_paisa
       FROM referral_bonuses`
    ).first<{ total_bonuses: number; total_paid_paisa: number }>(),

    // Fix: don't use alias in HAVING — SQLite doesn't support it reliably.
    // Use subquery inline in HAVING instead.
    c.env.DB.prepare(
      `SELECT u.name, u.phone, u.referral_code,
              COUNT(rb.id) as bonuses_count,
              COALESCE(SUM(rb.amount_paisa), 0) as total_earned_paisa,
              (SELECT COUNT(*) FROM users u2 WHERE u2.referrer_user_id = u.id) as referred_count
       FROM users u
       LEFT JOIN referral_bonuses rb ON rb.referrer_user_id = u.id
       GROUP BY u.id
       HAVING (SELECT COUNT(*) FROM users u2 WHERE u2.referrer_user_id = u.id) > 0
       ORDER BY total_earned_paisa DESC
       LIMIT 10`
    ).all()
  ])

  return ok(c, {
    total_bonuses_issued: totalBonuses?.total_bonuses ?? 0,
    total_bonus_paid_paisa: totalBonuses?.total_paid_paisa ?? 0,
    top_referrers: topReferrers.results
  })
})
