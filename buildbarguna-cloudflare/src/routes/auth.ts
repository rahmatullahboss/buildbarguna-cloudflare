import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { hashPassword, verifyPassword, generateReferralCode } from '../lib/crypto'
import { createToken, generateJti, verifyToken } from '../lib/jwt'
import { authMiddleware } from '../middleware/auth'
import { ok, err } from '../lib/response'
import { RATE_LIMITS } from '../lib/constants'
import type { Bindings, Variables, User } from '../types'

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// In-memory rate limiting to minimize KV writes
const authRateLimitCache = new Map<string, { count: number; expiry: number }>()

function checkAuthRateLimit(key: string, maxAttempts: number, windowSeconds: number): boolean {
  const now = Date.now()
  const cached = authRateLimitCache.get(key)
  
  if (cached && cached.expiry > now) {
    if (cached.count >= maxAttempts) {
      return false // Rate limited
    }
    cached.count++
    return true
  }
  
  // New entry
  authRateLimitCache.set(key, { count: 1, expiry: now + windowSeconds * 1000 })
  return true
}

const registerSchema = z.object({
  name: z.string().min(2, 'নাম কমপক্ষে ২ অক্ষরের হতে হবে'),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন'),
  password: z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),
  referral_code: z.string().optional()
})

const loginSchema = z.object({
  phone: z.string(),
  password: z.string()
})

// POST /api/auth/register
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { name, phone, password, referral_code } = c.req.valid('json')

  // Rate limiting: max 3 registrations per phone per hour (prevent spam)
  // Use in-memory rate limiting to minimize KV writes
  const rateLimitKey = `reg:${phone}`
  if (!checkAuthRateLimit(rateLimitKey, RATE_LIMITS.REGISTRATION.MAX_ATTEMPTS, 3600)) {
    return err(c, `অনেকবার চেষ্টা করা হয়েছে। ${RATE_LIMITS.REGISTRATION.WINDOW_HOURS} ঘণ্টা পরে আবার চেষ্টা করুন।`, 429)
  }

  // Check existing user
  const existing = await c.env.DB.prepare(
    'SELECT id FROM users WHERE phone = ?'
  ).bind(phone).first()

  if (existing) {
    return err(c, 'এই মোবাইল নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট আছে', 409)
  }

  // Validate referral code if provided — store referrer's integer ID (not code string)
  let referrerUserId: number | null = null
  if (referral_code) {
    const referrer = await c.env.DB.prepare(
      'SELECT id FROM users WHERE referral_code = ? AND is_active = 1'
    ).bind(referral_code).first<{ id: number }>()
    if (!referrer) {
      return err(c, 'রেফারেল কোড সঠিক নয়')
    }
    referrerUserId = referrer.id
  }

  const password_hash = await hashPassword(password)
  const myReferralCode = generateReferralCode()

  const result = await c.env.DB.prepare(
    `INSERT INTO users (name, phone, password_hash, referral_code, referred_by, referrer_user_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(name, phone, password_hash, myReferralCode, referral_code ?? null, referrerUserId).run()

  if (!result.success) {
    return err(c, 'রেজিস্ট্রেশন ব্যর্থ হয়েছে', 500)
  }

  return ok(c, { message: 'রেজিস্ট্রেশন সফল হয়েছে' }, 201)
})

// POST /api/auth/login
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { phone, password } = c.req.valid('json')

  // Rate limiting: max 5 failed attempts per phone per 15 minutes
  // Use in-memory rate limiting to minimize KV writes
  const rateLimitKey = `login:${phone}`
  if (!checkAuthRateLimit(rateLimitKey, RATE_LIMITS.LOGIN.MAX_ATTEMPTS, 900)) {
    return err(c, `অনেকবার চেষ্টা করা হয়েছে। ${RATE_LIMITS.LOGIN.WINDOW_MINUTES} মিনিট পরে আবার চেষ্টা করুন।`, 429)
  }

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE phone = ?'
  ).bind(phone).first<User>()

  if (!user) {
    return err(c, 'মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়', 401)
  }

  if (!user.is_active) {
    return err(c, 'আপনার অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে', 401)
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return err(c, 'মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়', 401)
  }

  // Don't clear rate limit on success - prevents batch login attacks
  // Rate limit will expire naturally after TTL

  const jti = generateJti()
  const token = await createToken(
    { sub: String(user.id), phone: user.phone, role: user.role, jti },
    c.env.JWT_SECRET
  )

  return ok(c, {
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      referral_code: user.referral_code
    }
  })
})

// POST /api/auth/logout
authRoutes.post('/logout', authMiddleware, async (c) => {
  const authHeader = c.req.header('Authorization')!
  const token = authHeader.slice(7)
  const payload = await verifyToken(token, c.env.JWT_SECRET)

  if (payload && payload.exp > Math.floor(Date.now() / 1000)) {
    // D1 blacklist — immediate consistency, not KV's eventual 60s lag
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO token_blacklist (jti, expires_at) VALUES (?, ?)'
    ).bind(payload.jti, payload.exp).run()
  }

  return ok(c, { message: 'লগআউট সফল হয়েছে' })
})

// GET /api/auth/me
authRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare(
    'SELECT id, name, phone, role, referral_code, referred_by, is_active, created_at FROM users WHERE id = ?'
  ).bind(userId).first<Omit<User, 'password_hash'>>()

  if (!user) return err(c, 'ব্যবহারকারী পাওয়া যায়নি', 404)

  // Compute balance: project earnings + referral bonuses
  const [balanceRow, referralBonusRow] = await Promise.all([
    c.env.DB.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM earnings WHERE user_id = ?'
    ).bind(userId).first<{ total: number }>(),
    c.env.DB.prepare(
      'SELECT COALESCE(SUM(amount_paisa), 0) as total FROM referral_bonuses WHERE referrer_user_id = ?'
    ).bind(userId).first<{ total: number }>()
  ])

  const balance_paisa = (balanceRow?.total ?? 0) + (referralBonusRow?.total ?? 0)
  return ok(c, { ...user, balance_paisa })
})
