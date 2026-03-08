import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { runMigrations, getMigrationStatus } from './lib/migrations'
import { authRoutes } from './routes/auth'
import { projectRoutes } from './routes/projects'
import { shareRoutes } from './routes/shares'
import { earningRoutes } from './routes/earnings'
import { withdrawalRoutes, adminWithdrawalRoutes } from './routes/withdrawals'
import { taskRoutes } from './routes/tasks'
import { pointsRoutes } from './routes/points'
import { rewardsRoutes } from './routes/rewards'
import { notificationsRoutes } from './routes/notifications'
import { adminRoutes } from './routes/admin'
import { uploadRoutes } from './routes/upload'
import { referralRoutes, adminReferralRoutes } from './routes/referrals'
import { financeRoutes } from './routes/project-finance'
import { profitRoutes } from './routes/profit-distribution'
import { companyExpenseRoutes } from './routes/company-expenses'
import { memberRoutes } from './routes/member'
import { distributeMonthlyEarnings, cleanupTokenBlacklist } from './cron/earnings'
import type { Bindings, Variables } from './types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
let migrationBootstrap: Promise<void> | null = null

async function ensureMigrations(env: Bindings) {
  if (!migrationBootstrap) {
    migrationBootstrap = (async () => {
      const needsMigration = await env.SESSIONS.get('needs_migration')

      if (needsMigration !== 'true') {
        return
      }

      console.log('[Startup] Migration flag detected, running migrations...')
      const result = await runMigrations(env)

      if (!result.success) {
        console.error('[Startup] Migration failed:', result.error)
        return
      }

      console.log('[Startup] Migrations complete:', result.applied)
      await env.SESSIONS.put('needs_migration', 'false', { expirationTtl: 86400 })
    })()
  }

  await migrationBootstrap
}

// Add migration status endpoint for monitoring
app.get('/api/health/migrations', async (c) => {
  try {
    const status = await getMigrationStatus(c.env)
    return c.json({
      success: true,
      data: status
    })
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

// Global middleware
app.use('*', logger())
app.use('/api/*', async (c, next) => {
  await ensureMigrations(c.env)
  await next()
})
app.use('/api/*', cors({
  // Restrict to known origins — never use '*' with Authorization header
  origin: (origin) => {
    const allowed = [
      // Production domains
      'https://buildbarguna-worker.workers.dev',
      'https://buildbarguna-worker.rahmatullahzisan01.workers.dev',
      // Local development
      'http://localhost:5173',
      'http://localhost:8787',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8787',
      // Capacitor Android app origins
      // androidScheme: 'https' → uses capacitor://localhost
      'capacitor://localhost',
      'https://localhost',
      // Capacitor fallback schemes
      'http://localhost',
      'ionic://localhost',
    ]
    // Allow requests with no origin (e.g. native app direct requests)
    if (!origin) return '*'
    return allowed.includes(origin) ? origin : null
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Validate JWT_SECRET is properly set (fail fast, not silently)
app.use('/api/*', async (c, next) => {
  if (!c.env.JWT_SECRET || c.env.JWT_SECRET.length < 32) {
    return c.json({ success: false, error: 'Server misconfiguration' }, 500)
  }
  await next()
})

// Global request size limit — reject bodies > 1MB to prevent timeout/DoS
app.use('/api/*', async (c, next) => {
  const contentLength = c.req.header('Content-Length')
  if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
    return c.json({ success: false, error: 'অনুরোধ অনেক বড়' }, 413)
  }
  await next()
})

// Global error handler — sanitize internal errors, never leak stack traces
app.onError((err, c) => {
  console.error('[unhandled]', err)
  // Never expose internal error details to client
  return c.json({ success: false, error: 'সার্ভার সমস্যা হয়েছে। আবার চেষ্টা করুন।' }, 500)
})

// API Routes
app.route('/api/auth', authRoutes)
app.route('/api/projects', projectRoutes)
app.route('/api/shares', shareRoutes)
app.route('/api/earnings', earningRoutes)
app.route('/api/withdrawals', withdrawalRoutes)
app.route('/api/admin/withdrawals', adminWithdrawalRoutes)
app.route('/api/tasks', taskRoutes)
app.route('/api/points', pointsRoutes)
app.route('/api/rewards', rewardsRoutes)
app.route('/api/notifications', notificationsRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/upload', uploadRoutes)
app.route('/api/referrals', referralRoutes)
app.route('/api/admin/referrals', adminReferralRoutes)

// Project Finance & Profit Distribution Routes
app.route('/api/finance', financeRoutes)
app.route('/api/profit', profitRoutes)
app.route('/api/company-expenses', companyExpenseRoutes)

// Member Registration Routes
app.route('/api/member', memberRoutes)

// Health check
app.get('/api/health', (c) => c.json({
  status: 'ok',
  project: 'BuildBarguna',
  time: new Date().toISOString()
}))

// App download redirect — uses R2_PUBLIC_URL secret at runtime
// No VITE env var needed — always points to correct URL
app.get('/api/download/app', (c) => {
  const publicUrl = c.env.R2_PUBLIC_URL
  if (!publicUrl) {
    return c.json({ success: false, error: 'Download not available' }, 503)
  }
  const apkUrl = `${publicUrl}/builds/android/buildbarguna-latest-release.apk`
  return c.redirect(apkUrl, 302)
})

// Favicon — return empty 204 to prevent 500 from static asset handler
app.get('/favicon.ico', (c) => new Response(null, { status: 204 }))

// 404 for unmatched API routes
app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ success: false, error: 'রুট পাওয়া যায়নি' }, 404)
  }
  // For non-API routes, let Workers Static Assets handle SPA fallback
  return c.notFound()
})

// Export: fetch handler + scheduled (Cron Trigger)
export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    // Run earnings distribution + token blacklist cleanup together
    ctx.waitUntil(Promise.all([
      distributeMonthlyEarnings(env),
      cleanupTokenBlacklist(env)
    ]))
  }
}
