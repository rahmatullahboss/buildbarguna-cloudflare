// Import regenerator-runtime for pdf-lib async/await support
import 'regenerator-runtime/runtime'

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { runMigrations, getMigrationStatus } from './lib/migrations'
import { authRoutes } from './routes/auth'
import { projectRoutes } from './routes/projects'
import { shareRoutes } from './routes/shares'
import { earningRoutes } from './routes/earnings'
import { withdrawalRoutes, adminWithdrawalRoutes } from './routes/withdrawals'
import { rewardsRoutes } from './routes/rewards'
import { taskRoutes } from './routes/tasks'
import { pointsRoutes } from './routes/points'
import { notificationsRoutes } from './routes/notifications'
import { adminRoutes } from './routes/admin'
import { uploadRoutes } from './routes/upload'
import { referralRoutes, adminReferralRoutes } from './routes/referrals'
import { financeRoutes } from './routes/project-finance'
import { profitRoutes, userProfitRoutes } from './routes/profit-distribution'
import { companyExpenseRoutes } from './routes/company-expenses'
import { memberRoutes } from './routes/member'
import { distributeMonthlyEarnings, cleanupTokenBlacklist } from './cron/earnings'
import { scheduled } from './scheduled'
import { RateLimiter } from './durable-objects/rate-limiter'
import type { Bindings, Variables } from './types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
let migrationBootstrap: Promise<void> | null = null

async function ensureMigrations(env: Bindings) {
  if (!migrationBootstrap) {
    migrationBootstrap = (async () => {
      try {
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
        
        try {
          await env.SESSIONS.put('needs_migration', 'false', { expirationTtl: 86400 })
        } catch (kvErr) {
          console.warn('[Startup] Could not update migration flag in KV (limit might be exhausted):', kvErr)
        }
      } catch (err) {
        console.warn('[Startup] KV check failed (limit might be exhausted), proceeding without migration check:', err)
      }
    })()
  }

  try {
    await migrationBootstrap
  } catch (err) {
    console.error('[Startup] Unhandled error in migration bootstrap:', err)
    // Don't throw here, allow the app to boot even if migrations fail
  }
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
app.use('/api/*', logger())

// Request ID middleware for tracing
app.use('/api/*', async (c, next) => {
  // Use existing request ID or generate new one
  const requestId = c.req.header('X-Request-ID') || crypto.randomUUID()
  c.set('requestId', requestId)
  
  // Add request ID to response headers
  c.res.headers.set('X-Request-ID', requestId)
  
  await next()
})

app.use('/api/*', async (c, next) => {
  await ensureMigrations(c.env)
  await next()
  // Prevent Cloudflare CDN from caching API responses
  c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
})
app.use('/api/*', cors({
  // Restrict to known origins — never use '*' with Authorization header
  origin: (origin) => {
    const allowed = [
      // Production domains
      'https://buildbarguna-worker.workers.dev',
      'https://buildbarguna-worker.rahmatullahzisan01.workers.dev',
      'https://buildbargunainitiative.org',
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
    // For no-origin requests (e.g., native apps, server-to-server), 
    // deny by default to prevent unauthorized cross-origin use
    if (!origin) return null
    
    // Allow if origin is in allowlist
    return allowed.includes(origin) ? origin : null
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Security headers middleware (CSP, X-Frame-Options, etc.)
app.use('/api/*', async (c, next) => {
  await next()
  
  // Content Security Policy - restrict resource loading
  c.header('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://buildbarguna-worker.workers.dev",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '))
  
  // Prevent clickjacking
  c.header('X-Frame-Options', 'DENY')
  
  // Prevent MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff')
  
  // Referrer policy
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions policy (disable unnecessary features)
  c.header('Permissions-Policy', [
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=()',
    'camera=()',
    'cross-origin-isolated=()',
    'display-capture=()',
    'document-domain=()',
    'encrypted-media=()',
    'execution-while-not-rendered=()',
    'execution-while-out-of-viewport=()',
    'fullscreen=()',
    'geolocation=()',
    'gyroscope=()',
    'keyboard-map=()',
    'microphone=()',
    'midi=()',
    'navigation-override=()',
    'payment=()',
    'picture-in-picture=()',
    'publickey-credentials-get=()',
    'screen-wake-lock=()',
    'sync-xhr=()',
    'usb=()',
    'web-share=()',
    'xr-spatial-tracking=()'
  ].join(', '))
})

// Validate JWT_SECRET is properly set (fail fast, not silently)
app.use('/api/*', async (c, next) => {
  if (!c.env.JWT_SECRET || c.env.JWT_SECRET.length < 32) {
    return c.json({ success: false, error: 'Server misconfiguration' }, 500)
  }
  await next()
})

// Validate required secrets on application startup (health check will fail if missing)
const REQUIRED_SECRETS = ['JWT_SECRET'] as const

app.use('/api/health/ready', async (c) => {
  const missingSecrets: string[] = []
  
  // Check core secrets
  for (const secret of REQUIRED_SECRETS) {
    if (!c.env[secret]) {
      missingSecrets.push(secret)
    }
  }
  
  if (missingSecrets.length > 0) {
    return c.json({
      success: false,
      status: 'unhealthy',
      error: 'Missing required secrets',
      missing_secrets: missingSecrets
    }, 500)
  }
  
  // Check database connectivity
  try {
    await c.env.DB.prepare('SELECT 1 as check').first()
  } catch (error) {
    return c.json({
      success: false,
      status: 'unhealthy',
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
  
  // Check KV connectivity
  try {
    await c.env.SESSIONS.get('health_check')
  } catch (error) {
    return c.json({
      success: false,
      status: 'unhealthy',
      error: 'KV connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
  
  return c.json({
    success: true,
    status: 'healthy',
    checks: {
      secrets: 'ok',
      database: 'ok',
      kv: 'ok'
    },
    timestamp: new Date().toISOString()
  })
})

// Global request size limit — reject bodies > 1MB to prevent timeout/DoS
app.use('/api/*', async (c, next) => {
  const contentLength = c.req.header('Content-Length')
  if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
    return c.json({ success: false, error: 'অনুরোধ অনেক বড়' }, 413)
  }
  await next()
})

// Security: Block common attack patterns and malicious scanners
app.use('*', async (c, next) => {
  const path = c.req.path.toLowerCase()
  
  // Block common attack/scanner patterns
  const blockedPatterns = [
    '.git', '.env', '.vscode', '.idea', '.docker',
    'wp-admin', 'wp-login', 'wp-content', 'wordpress',
    'phpmyadmin', 'pma', 'myadmin',
    'admin.php', 'administrator',
    '.php', '.asp', '.aspx', '.jsp', '.cgi',
    'shell', 'cmd', 'exec', 'system',
    'etc/passwd', 'etc/shadow',
    'proc/self',
    'boot.ini', 'win.ini',
    'web.config', 'web.xml',
    'pom.properties', 'maven',
    'actuator', 'trace.axd', 'telescope',
    'graphql', 'api/gql', 'api/graphql',
    'swagger', 'api-docs', 'v2/api-docs', 'v3/api-docs',
    'info.php', 'config.json', 'sftp.json',
    'debug/default/view', 'panel=config'
  ]
  
  // Check if request matches any blocked pattern
  if (blockedPatterns.some(pattern => path.includes(pattern))) {
    console.log(`[Security] Blocked malicious request: ${c.req.method} ${c.req.path}`)
    // Return 404 to not reveal that we're blocking
    return c.json({ success: false, error: 'Not found' }, 404)
  }
  
  await next()
})

// Rate limiting middleware using in-memory cache
const rateLimitCache = new Map<string, { count: number; expiry: number }>()
const RATE_LIMIT_WINDOW = 60 // 60 seconds
const RATE_LIMIT_MAX = 100

// We do lazy cleanup on each request occasionally to avoid memory leaks
let lastCleanup = Date.now()

app.use('/api/*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  const key = `rate_limit:${ip}`
  const now = Date.now()
  
  // Lazy cleanup every 5 minutes
  if (now - lastCleanup > 300000) {
    lastCleanup = now
    for (const [k, v] of rateLimitCache.entries()) {
      if (v.expiry <= now) rateLimitCache.delete(k)
    }
  }

  const cached = rateLimitCache.get(key)
  
  if (cached && cached.expiry > now) {
    if (cached.count > RATE_LIMIT_MAX) {
      console.log(`[RateLimit] Blocked ${ip} - ${cached.count} requests`)
      return c.json({ success: false, error: 'অনুরোধের সীমা অতিক্রম করেছে' }, 429)
    }
    cached.count++
  } else {
    rateLimitCache.set(key, { count: 1, expiry: now + RATE_LIMIT_WINDOW * 1000 })
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
app.route('/api/rewards', rewardsRoutes)
app.route('/api/tasks', taskRoutes)
app.route('/api/points', pointsRoutes)
app.route('/api/notifications', notificationsRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/upload', uploadRoutes)
app.route('/api/referrals', referralRoutes)
app.route('/api/admin/referrals', adminReferralRoutes)

// Project Finance & Profit Distribution Routes
app.route('/api/finance', financeRoutes)
app.route('/api/profit', profitRoutes)
app.route('/api/profit', userProfitRoutes)  // User-accessible profit routes (my-profits)
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

// Favicon — serve empty 204
app.get('/favicon.ico', (c) => new Response(null, { status: 204 }))

// Catch-all for /api/* routes that didn't match (return 404, don't fall to SPA)
app.on(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], '/api/*', (c) => {
  return c.json({ success: false, error: 'API endpoint not found' }, 404)
})

// Export: fetch handler + scheduled (Cron Trigger)
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    console.log(`[cron] Starting scheduled job at ${new Date().toISOString()}`)
    const startTime = Date.now()

    // Run earnings distribution + token blacklist cleanup with error handling
    ctx.waitUntil((async () => {
      try {
        const results = await Promise.allSettled([
          (async () => {
            console.log('[cron] Starting earnings distribution...')
            await distributeMonthlyEarnings(env)
            console.log('[cron] Earnings distribution completed')
          })(),
          (async () => {
            console.log('[cron] Starting token blacklist cleanup...')
            await cleanupTokenBlacklist(env)
            console.log('[cron] Token blacklist cleanup completed')
          })()
        ])

        const duration = Date.now() - startTime

        results.forEach((result, i) => {
          if (result.status === 'rejected') {
            console.error(`[cron] Task ${i} failed after ${duration}ms:`, result.reason)
          }
        })

        const allSucceeded = results.every(r => r.status === 'fulfilled')
        console.log(`[cron] ${allSucceeded ? 'All tasks completed' : 'Some tasks failed'} in ${duration}ms`)

        // Store cron execution status for monitoring
        await env.SESSIONS.put('last_cron_execution', JSON.stringify({
          timestamp: new Date().toISOString(),
          duration_ms: duration,
          success: allSucceeded,
          tasks: results.map((r, i) => ({
            task: i === 0 ? 'earnings_distribution' : 'token_blacklist_cleanup',
            status: r.status,
            error: r.status === 'rejected' ? String(r.reason) : null
          }))
        }), { expirationTtl: 86400 }) // Keep for 24 hours for monitoring

      } catch (error) {
        const duration = Date.now() - startTime
        console.error(`[cron] Critical error after ${duration}ms:`, error)
        // Store error for monitoring
        await env.SESSIONS.put('last_cron_error', JSON.stringify({
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : null
        }), { expirationTtl: 86400 })
      }
    })())
  }
}

// Export scheduled handler for cron jobs
export { scheduled }

// Export Durable Objects
export { RateLimiter }
