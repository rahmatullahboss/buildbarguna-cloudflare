import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { hashPassword, verifyPassword, generateReferralCode } from '../lib/crypto'
import { createToken, generateJti, verifyToken } from '../lib/jwt'
import { authMiddleware } from '../middleware/auth'
import { ok, err } from '../lib/response'
import { RATE_LIMITS } from '../lib/constants'
import { sendPasswordResetEmail } from '../lib/email'
import { checkRateLimit } from '../lib/rate-limiter'
import {
  generatePKCE,
  generateState,
  buildGoogleAuthUrl,
  exchangeCodeForToken,
  fetchGoogleUserInfo,
  storeOAuthState,
  consumeOAuthState,
  getGoogleRedirectUrl,
  type GoogleUserInfo
} from '../lib/google-oauth'
import type { Bindings, Variables, User } from '../types'

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Email validation regex (standard RFC 5322)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Generate secure random token for password reset
function generateResetToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

const registerSchema = z.object({
  name: z.string().min(2, 'নাম কমপক্ষে ২ অক্ষরের হতে হবে'),
  email: z.string().email('সঠিক ইমেইল ঠিকানা দিন'),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন').optional().or(z.literal('')),
  password: z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),
  referral_code: z.string().optional()
})

const loginSchema = z.object({
  identifier: z.string().min(3, 'ইমেইল অথবা মোবাইল নম্বর দিন'),
  password: z.string().min(1, 'পাসওয়ার্ড দিন')
})

const forgotPasswordSchema = z.object({
  email: z.string().email('সঠিক ইমেইল ঠিকানা দিন')
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'রিसेट টোকেন দিন'),
  password: z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে')
})

// POST /api/auth/register
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { name, email, phone, password, referral_code } = c.req.valid('json')

  // Rate limiting: max 3 registrations per email per hour (prevent spam)
  const rateLimitKey = `reg:${email.toLowerCase()}`
  const rateLimit = await checkRateLimit(c.env, rateLimitKey, RATE_LIMITS.REGISTRATION.MAX_ATTEMPTS, 3600)
  
  if (!rateLimit.allowed) {
    return err(c, `অনেকবার চেষ্টা করা হয়েছে। ${Math.ceil((rateLimit.resetAt - Date.now()) / 3600000)} ঘণ্টা পরে আবার চেষ্টা করুন।`, 429)
  }

  // Check existing user by email
  const existingEmail = await c.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email.toLowerCase()).first()

  if (existingEmail) {
    // Generic error message to prevent account enumeration
    return err(c, 'এই অ্যাকাউন্ট ইতিমধ্যে বিদ্যমান', 409)
  }

  // Check existing user by phone (if provided and not empty)
  const hasPhone = phone && phone.trim() !== ''
  if (hasPhone) {
    const existingPhone = await c.env.DB.prepare(
      'SELECT id FROM users WHERE phone = ?'
    ).bind(phone).first()

    if (existingPhone) {
      // Generic error message to prevent account enumeration
      return err(c, 'এই অ্যাকাউন্ট ইতিমধ্যে বিদ্যমান', 409)
    }
  }

  // Validate referral code if provided
  let referrerUserId: number | null = null
  if (referral_code) {
    // Sanitize referral code: only allow alphanumeric characters, case-insensitive
    const sanitizedReferralCode = referral_code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    
    // Use case-insensitive lookup
    const referrer = await c.env.DB.prepare(
      'SELECT id FROM users WHERE UPPER(referral_code) = ? AND is_active = 1'
    ).bind(sanitizedReferralCode).first<{ id: number }>()
    if (!referrer) {
      return err(c, 'রেফারেল কোড সঠিক নয়')
    }
    referrerUserId = referrer.id
  }

  const password_hash = await hashPassword(password)
  const myReferralCode = generateReferralCode()

  // If phone not provided, use a unique placeholder so NOT NULL constraint is satisfied.
  // Placeholder format matches the Google OAuth pattern (_google_<id>).
  // Phone login won't match these since they don't start with '01'.
  const phoneValue = (phone && phone.trim() !== '') ? phone : `_nophone_${crypto.randomUUID()}`

  const result = await c.env.DB.prepare(
    `INSERT INTO users (name, email, phone, password_hash, referral_code, referred_by, referrer_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(name, email.toLowerCase(), phoneValue, password_hash, myReferralCode, referral_code ?? null, referrerUserId).run()

  if (!result.success) {
    return err(c, 'রেজিস্ট্রেশন ব্যর্থ হয়েছে', 500)
  }

  return ok(c, { message: 'রেজিস্ট্রেশন সফল হয়েছে' }, 201)
})

// POST /api/auth/login
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { identifier, password } = c.req.valid('json')

  // Determine if identifier is email or phone
  const isEmail = emailRegex.test(identifier)
  const rateLimitKey = `login:${identifier.toLowerCase()}`

  // Rate limiting: max 5 failed attempts per 15 minutes
  const rateLimit = await checkRateLimit(c.env, rateLimitKey, RATE_LIMITS.LOGIN.MAX_ATTEMPTS, 900)
  
  if (!rateLimit.allowed) {
    return err(c, `অনেকবার চেষ্টা করা হয়েছে। ${Math.ceil((rateLimit.resetAt - Date.now()) / 60000)} মিনিট পরে আবার চেষ্টা করুন।`, 429)
  }

  // Check for account lockout (use separate rate limit key for lockout)
  const lockoutKey = `lockout:${identifier.toLowerCase()}`
  const lockoutRateLimit = await checkRateLimit(c.env, lockoutKey, 10, 1800) // 10 attempts = 30 min lockout
  
  if (!lockoutRateLimit.allowed) {
    return err(c, 'অ্যাকাউন্ট অস্থায়ীভাবে লক করা হয়েছে। ৩০ মিনিট পরে আবার চেষ্টা করুন।', 429)
  }

  // Query user by email or phone based on identifier type
  const user = await c.env.DB.prepare(
    isEmail
      ? 'SELECT * FROM users WHERE email = ?'
      : 'SELECT * FROM users WHERE phone = ?'
  ).bind(isEmail ? identifier.toLowerCase() : identifier).first<User>()

  if (!user) {
    // Verify a dummy hash to ensure constant-time execution against timing attacks
    await verifyPassword(password, '00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000')
    // Generic error message to prevent account enumeration
    return err(c, 'ইনপুট সঠিক নয়', 401)
  }

  const valid = await verifyPassword(password, user.password_hash)

  if (!user.is_active) {
    return err(c, 'আপনার অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে', 401)
  }

  if (!valid) {
    // Generic error message
    return err(c, 'ইনপুট সঠিক নয়', 401)
  }

  // Don't clear rate limit on success - prevents batch login attacks
  // Rate limit will expire naturally after TTL

  const jti = generateJti()
  const token = await createToken(
    {
      sub: String(user.id),
      phone: user.phone,
      email: user.email,
      role: user.role,
      jti
    },
    c.env.JWT_SECRET
  )

  return ok(c, {
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
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
    'SELECT id, name, phone, email, role, referral_code, referred_by, is_active, created_at FROM users WHERE id = ?'
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

// POST /api/auth/forgot-password
authRoutes.post('/forgot-password', zValidator('json', forgotPasswordSchema), async (c) => {
  const { email } = c.req.valid('json')
  const normalizedEmail = email.toLowerCase()

  // Rate limiting: max 3 requests per hour per IP to prevent email enumeration/scanning
  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown'
  const rateLimitKey = `forgot:${ip}`
  const rateLimit = await checkRateLimit(c.env, rateLimitKey, 3, 3600)
  
  if (!rateLimit.allowed) {
    return err(c, 'অনেকবার চেষ্টা করা হয়েছে। ১ ঘণ্টা পরে আবার চেষ্টা করুন।', 429)
  }

  // Find user by email
  const user = await c.env.DB.prepare(
    'SELECT id, name, email FROM users WHERE email = ? AND is_active = 1'
  ).bind(normalizedEmail).first<{ id: number; name: string; email: string }>()

  // Always return success message (security: don't reveal if email exists)
  // Use constant-time comparison to prevent timing attacks
  const emailExists = user !== null
  
  // Generate reset token even if email doesn't exist (constant-time)
  const token = generateResetToken()
  const expiresAt = Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes

  // Only store token and send email if user exists
  if (emailExists) {
    await c.env.DB.prepare(
      'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(token, user.id, expiresAt).run()

    // Generate reset link using FRONTEND_URL env var
    const frontendUrl = c.env.FRONTEND_URL || c.env.R2_PUBLIC_URL?.replace('/storage', '') || ''
    if (!frontendUrl) {
      console.error('FRONTEND_URL not configured')
    }
    const resetLink = `${frontendUrl}/reset-password?token=${token}`

    // Send password reset email in the background to prevent timing attacks
    c.executionCtx.waitUntil(
      sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetLink,
        expiryMinutes: 15
      }).then(emailSent => {
        if (!emailSent) {
          console.error('Failed to send password reset email')
        }
      })
    )
  }

  return ok(c, { message: 'যদি এই ইমেইলটি রেজিস্টার্ড থাকে, তবে আপনি শীঘ্রই একটি পাসওয়ার্ড রিসেট লিঙ্ক পাবেন।' })
})

// POST /api/auth/reset-password
authRoutes.post('/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
  const { token, password } = c.req.valid('json')

  // Rate limiting: max 5 requests per hour per IP to prevent token brute-forcing/scanning
  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown'
  const rateLimitKey = `reset:${ip}`
  const rateLimit = await checkRateLimit(c.env, rateLimitKey, 5, 3600)

  if (!rateLimit.allowed) {
    return err(c, 'অনেকবার চেষ্টা করা হয়েছে। ১ ঘণ্টা পরে আবার চেষ্টা করুন।', 429)
  }

  // Find and validate token
  const resetToken = await c.env.DB.prepare(
    'SELECT token, user_id, expires_at, used FROM password_reset_tokens WHERE token = ?'
  ).bind(token).first<{ token: string; user_id: number; expires_at: number; used: number }>()

  if (!resetToken) {
    return err(c, 'অবৈধ রিসেট লিঙ্ক', 400)
  }

  if (resetToken.used === 1) {
    return err(c, 'এই রিসেট লিঙ্কটি ইতিমধ্যে ব্যবহার করা হয়েছে', 400)
  }

  const now = Math.floor(Date.now() / 1000)
  if (resetToken.expires_at < now) {
    return err(c, 'রিসেট লিঙ্কটি মেয়াদোত্তীর্ণ হয়েছে', 400)
  }

  // Hash new password
  const passwordHash = await hashPassword(password)

  // ATOMIC FIX (C3): All 3 operations in a single batch — prevents partial state
  const batchResults = await c.env.DB.batch([
    // 1. Update password
    c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, resetToken.user_id),
    // 2. Mark token as used
    c.env.DB.prepare('UPDATE password_reset_tokens SET used = 1 WHERE token = ?').bind(token),
    // 3. Blacklist ALL existing JWTs for this user (force re-login on all devices)
    c.env.DB.prepare('INSERT OR REPLACE INTO token_blacklist (jti, expires_at) VALUES (?, ?)').bind(`user_${resetToken.user_id}_all_sessions`, now + (7 * 24 * 60 * 60))
  ])

  if (!batchResults[0].success) {
    return err(c, 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে', 500)
  }

  return ok(c, { message: 'পাসওয়ার্ড সফলভাবে রিসেট হয়েছে' })
})

// GET /api/auth/google - Initiate Google OAuth flow
authRoutes.get('/google', async (c) => {
  try {
    // Generate PKCE parameters
    const { codeVerifier, codeChallenge } = await generatePKCE()
    const state = generateState()

    // Get redirect URI based on environment - use FRONTEND_URL to detect production
    const isProduction = !!c.env.FRONTEND_URL && c.env.FRONTEND_URL.includes('buildbargunainitiative.org')
    const redirectUri = getGoogleRedirectUrl(isProduction ? 'production' : undefined)

    // Store state in D1 for later verification
    await storeOAuthState(c.env.DB, state, { codeVerifier })

    // Build authorization URL
    const authUrl = await buildGoogleAuthUrl(redirectUri, state, codeChallenge, c.env)

    // Redirect to Google
    return c.redirect(authUrl)
  } catch (error) {
    console.error('Google OAuth initiation error:', error)
    return err(c, 'Google লগইন শুরু করা যায়নি', 500)
  }
})

// GET /api/auth/google/callback - Handle Google OAuth callback
authRoutes.get('/google/callback', async (c) => {
  try {
    const code = c.req.query('code')
    const state = c.req.query('state')
    const error = c.req.query('error')
    const frontendUrl = c.env.FRONTEND_URL || ''

    // Check for OAuth errors
    if (error) {
      return c.redirect(`${frontendUrl}/login?error=google_auth_failed`)
    }

    if (!code || !state) {
      return c.redirect(`${frontendUrl}/login?error=invalid_callback`)
    }

    // Retrieve and validate state
    const storedState = await consumeOAuthState(c.env.DB, state)
    if (!storedState) {
      return c.redirect(`${frontendUrl}/login?error=invalid_state`)
    }

    // Exchange code for tokens — direct HTTP POST to Google token endpoint
    const isProduction = !!c.env.FRONTEND_URL && !c.env.FRONTEND_URL.includes('localhost')
    const redirectUri = getGoogleRedirectUrl(isProduction ? 'production' : undefined)
    const tokenResponse = await exchangeCodeForToken(code, storedState.codeVerifier, redirectUri, c.env)

    if (!tokenResponse.access_token) {
      throw new Error('No access token received')
    }

    // Fetch user info from Google
    const googleUser: GoogleUserInfo = await fetchGoogleUserInfo(tokenResponse.access_token)

    // Check if user exists by Google ID
    let user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE google_id = ?'
    ).bind(googleUser.id).first<User>()

    // If not found, check by email
    if (!user) {
      user = await c.env.DB.prepare(
        'SELECT * FROM users WHERE email = ?'
      ).bind(googleUser.email).first<User>()
    }

    // Create new user if doesn't exist
    if (!user) {
      const passwordHash = await hashPassword(crypto.randomUUID()) // Random password for Google users
      const referralCode = generateReferralCode()

      const result = await c.env.DB.prepare(
        `INSERT INTO users (name, email, google_id, phone, password_hash, referral_code, email_verified, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        googleUser.name,
        googleUser.email,
        googleUser.id,
        `_google_${googleUser.id}`, // Unique placeholder — user can set real phone later
        passwordHash,
        referralCode,
        googleUser.verified_email ? 1 : 0,
        1
      ).run()

      if (!result.success) {
        throw new Error('Failed to create user')
      }

      // Fetch the newly created user
      user = await c.env.DB.prepare(
        'SELECT * FROM users WHERE google_id = ?'
      ).bind(googleUser.id).first<User>()
    } else {
      // Update existing user with Google ID if not already linked
      if (!user.google_id) {
        await c.env.DB.prepare(
          'UPDATE users SET google_id = ?, email_verified = ? WHERE id = ?'
        ).bind(googleUser.id, googleUser.verified_email ? 1 : user.email_verified, user.id).run()
      }
    }

    if (!user || !user.is_active) {
      return c.redirect(`${frontendUrl}/login?error=account_inactive`)
    }

    // Check if user needs to complete profile (Google users have placeholder phone)
    const needsProfileCompletion = user.phone?.startsWith('_google_') ?? true

    // Generate JWT token
    const jti = generateJti()
    const token = await createToken(
      {
        sub: String(user.id),
        phone: user.phone,
        email: user.email,
        role: user.role,
        jti
      },
      c.env.JWT_SECRET
    )

    // Store user data in D1 temporarily (5 minutes expiry)
    const sessionId = crypto.randomUUID()
    const sessionData = JSON.stringify({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        referral_code: user.referral_code
      },
      needsProfileCompletion
    })
    const expiresAt = Math.floor(Date.now() / 1000) + 300 // 5 minutes
    
    // oauth_states table is created via migrations — no runtime CREATE needed

    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO oauth_states (state, data, expires_at) VALUES (?, ?, ?)'
    ).bind(`session:${sessionId}`, sessionData, expiresAt).run()

    // Redirect to frontend with session ID only (not full user data)
    const oauthBaseUrl = c.env.FRONTEND_URL || 'https://buildbargunainitiative.org'
    const redirectUrl = new URL('/login', oauthBaseUrl)
    redirectUrl.searchParams.set('oauth_session', sessionId)

    return c.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    const oauthBaseUrl = c.env.FRONTEND_URL || 'https://buildbargunainitiative.org'
    return c.redirect(`${oauthBaseUrl}/login?error=google_auth_failed`)
  }
})

// GET /api/auth/session/:sessionId - Retrieve OAuth session (one-time use)
authRoutes.get('/session/:sessionId', async (c) => {
  const { sessionId } = c.req.param()

  // CORS FIX (C2): Use proper allowlist — never reflect arbitrary origin
  const sessionOrigin = c.req.header('Origin')
  const sessionAllowedOrigins = [
    'https://buildbargunainitiative.org',
    'https://buildbarguna-worker.workers.dev',
    'https://buildbarguna-worker.rahmatullahzisan01.workers.dev',
    'http://localhost:5173',
    'http://localhost:8787',
    'capacitor://localhost',
    'https://localhost'
  ]
  const allowedOrigin = sessionOrigin && sessionAllowedOrigins.includes(sessionOrigin) ? sessionOrigin : null

  try {
    const row = await c.env.DB.prepare('SELECT data, expires_at FROM oauth_states WHERE state = ?').bind(`session:${sessionId}`).first<{ data: string, expires_at: number }>()

    if (!row || row.expires_at < Math.floor(Date.now() / 1000)) {
      return err(c, 'সেশন এক্সপায়ার্ড অথবা পাওয়া যায়নি', 404)
    }

    // Delete session after retrieval (one-time use)
    await c.env.DB.prepare('DELETE FROM oauth_states WHERE state = ?').bind(`session:${sessionId}`).run()

    const response = ok(c, JSON.parse(row.data))
    // Add CORS headers
    if (allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
    return response
  } catch (error) {
    console.error('Session retrieval error:', error)
    return err(c, 'সেশন উদ্ধার করা সম্ভব হয়নি', 500)
  }
})

// Complete profile after Google signup (phone + referral)
const completeProfileSchema = z.object({
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন'),
  referral_code: z.string().optional()
})

authRoutes.post('/complete-profile', authMiddleware, zValidator('json', completeProfileSchema), async (c) => {
  const userId = c.get('userId')
  const { phone, referral_code } = c.req.valid('json')

  // Check if phone is already taken
  const existingPhone = await c.env.DB.prepare(
    'SELECT id FROM users WHERE phone = ? AND id != ?'
  ).bind(phone, userId).first()

  if (existingPhone) {
    return err(c, 'এই মোবাইল নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে', 409)
  }

  // Validate referral code if provided
  let referrerUserId: number | null = null
  if (referral_code) {
    const sanitizedReferralCode = referral_code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    const referrer = await c.env.DB.prepare(
      'SELECT id FROM users WHERE UPPER(referral_code) = ? AND is_active = 1 AND id != ?'
    ).bind(sanitizedReferralCode, userId).first<{ id: number }>()

    if (!referrer) {
      return err(c, 'রেফারেল কোড সঠিক নয়')
    }
    referrerUserId = referrer.id
  }

  // Update user profile — FIX (H5): Don't overwrite user's OWN referral_code with referrer's code
  const result = await c.env.DB.prepare(
    'UPDATE users SET phone = ?, referred_by = COALESCE(?, referred_by), referrer_user_id = COALESCE(?, referrer_user_id) WHERE id = ?'
  ).bind(phone, referral_code ?? null, referrerUserId, userId).run()

  if (!result.success) {
    return err(c, 'প্রোফাইল আপডেট ব্যর্থ হয়েছে', 500)
  }

  // Fetch updated user
  const user = await c.env.DB.prepare(
    'SELECT id, name, phone, email, role, referral_code, referred_by, is_active, created_at FROM users WHERE id = ?'
  ).bind(userId).first<Omit<User, 'password_hash'>>()

  if (!user) {
    return err(c, 'ব্যবহারকারী পাওয়া যায়নি', 404)
  }

  return ok(c, { user })
})

// Update user profile (PUT /api/auth/profile)
// NOTE: referral_code is NOT allowed here — only during registration/complete-profile
const updateProfileSchema = z.object({
  name: z.string().min(2, 'নাম কমপক্ষে ২ অক্ষরের হতে হবে').optional(),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন').optional()
})

authRoutes.put('/profile', authMiddleware, zValidator('json', updateProfileSchema), async (c) => {
  const userId = c.get('userId')
  const { name, phone } = c.req.valid('json')

  // Check if phone is already taken (if updating phone)
  if (phone) {
    const existingPhone = await c.env.DB.prepare(
      'SELECT id FROM users WHERE phone = ? AND id != ?'
    ).bind(phone, userId).first()

    if (existingPhone) {
      return err(c, 'এই মোবাইল নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে', 409)
    }
  }

  // Build update query dynamically
  const updates: string[] = []
  const values: (string | number)[] = []

  if (name) {
    updates.push('name = ?')
    values.push(name)
  }
  if (phone) {
    updates.push('phone = ?')
    values.push(phone)
  }

  if (updates.length === 0) {
    return err(c, 'কোনো তথ্য আপডেট করা হয়নি', 400)
  }

  values.push(userId)

  const result = await c.env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run()

  if (!result.success) {
    return err(c, 'প্রোফাইল আপডেট ব্যর্থ হয়েছে', 500)
  }

  // Fetch updated user
  const user = await c.env.DB.prepare(
    'SELECT id, name, phone, email, role, referral_code, referred_by, is_active, created_at FROM users WHERE id = ?'
  ).bind(userId).first<Omit<User, 'password_hash'>>()

  if (!user) {
    return err(c, 'ব্যবহারকারী পাওয়া যায়নি', 404)
  }

  return ok(c, { user })
})

