> **BrainSync Context Pumper** 🧠
> Dynamically loaded for active file: `buildbarguna-cloudflare/src/lib/email.ts` (Domain: **Generic Logic**)

### 📐 Generic Logic Conventions & Fixes
- **[convention] Fixed null crash in Authorization — confirmed 3x**: - import { getToken, request } from '../lib/api'
+ import { getToken } from '../lib/api'
-       const data = await request<ShareCertificateData>(
+       const res = await fetch(`/api/shares/certificate/${purchaseId}/preview`, {
-         `/shares/certificate/${purchaseId}/preview`
+         headers: { 'Authorization': `Bearer ${token}` }
-       )
+       })
-       // Generate PDF entirely in the browser
+       if (!res.ok) {
-       await downloadShareCertificate(data)
+         const json = await res.json()
-     } catch (err: any) {
+         throw new Error(json.error || 'Preview data fetch failed')
-       console.error('Certificate generation error:', err)
+       }
-       setError(err.message || 'সার্টিফিকেট তৈরি ব্যর্থ হয়েছে')
+ 
-     } finally {
+       const json = await res.json() as { data: ShareCertificateData }
-       setDownloading(false)
+ 
-     }
+       // Generate PDF entirely in the browser
-   }
+       await downloadShareCertificate(json.data)
- 
+     } catch (err: any) {
-   const clearError = () => setError(null)
+       console.error('Certificate generation error:', err)
- 
+       setError(err.message || 'সার্টিফিকেট তৈরি ব্যর্থ হয়েছে')
-   return {
+     } finally {
-     downloading,
+       setDownloading(false)
-     error,
+     }
-     downloadCertificate,
+   }
-     clearError
+ 
-   }
+   const clearError = () => setError(null)
- }
+ 
- 
+   return {
+     downloading,
+     error,
+     downloadCertificate,
+     clearError
+   }
+ }
+ 

📌 IDE AST Context: Modified symbols likely include [UseCertificateDownloadReturn, useCertificateDownload]
- **[problem-fix] Fixed null crash in Bolt — parallelizes async operations for speed**: -   const [rows, countRow] = await Promise.all([
+   // ⚡ Bolt: Use db.batch() instead of Promise.all to prevent per-query HTTP network overhead in D1
-     c.env.DB.prepare(
+   const results = await c.env.DB.batch([
-       `SELECT p.id, p.title, p.description, p.image_url, p.total_capital, p.total_shares,
+     c.env.DB.prepare(
-               p.share_price, p.status, p.location, p.category, p.start_date,
+       `SELECT p.id, p.title, p.description, p.image_url, p.total_capital, p.total_shares,
-               p.expected_end_date, p.progress_pct, p.completed_at, p.created_at,
+               p.share_price, p.status, p.location, p.category, p.start_date,
-               COALESCE(SUM(us.quantity), 0) as sold_shares
+               p.expected_end_date, p.progress_pct, p.completed_at, p.created_at,
-        FROM projects p
+               COALESCE(SUM(us.quantity), 0) as sold_shares
-        LEFT JOIN user_shares us ON us.project_id = p.id
+        FROM projects p
-        WHERE p.status IN ('active', 'completed')
+        LEFT JOIN user_shares us ON us.project_id = p.id
-        GROUP BY p.id
+        WHERE p.status IN ('active', 'completed')
-        ORDER BY p.status ASC, p.created_at DESC
+        GROUP BY p.id
-        LIMIT ? OFFSET ?`
+        ORDER BY p.status ASC, p.created_at DESC
-     ).bind(limit, offset).all<Project & { sold_shares: number }>(),
+        LIMIT ? OFFSET ?`
-     c.env.DB.prepare(
+     ).bind(limit, offset),
-       `SELECT COUNT(*) as total FROM projects WHERE status IN ('active', 'completed')`
+     c.env.DB.prepare(
-     ).first<{ total: number }>()
+       `SELECT COUNT(*) as total FROM projects WHERE status IN ('active', 'completed')`
-   ])
+     )
- 
+   ])
-   return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
+ 
- })
+   const rows = results[0].results as unknown as (Project & { sold_shares: number })[]
- 
+   const countRow = results[1].results?.[0] as unknown as { total: number } | undefined
- // GET /api/projects/:id — public
+ 
- projectRoutes.get('/:id', async (c) => {
+   return ok(c, paginate(rows, countRow?.total ?? 0, page, limit))
-   const id = parseInt(c.req.param('id'))
+ })
-   if (isNaN(id)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')
+ 
- 
+ // GET /api/projects/:id — public
-   const [project, soldRow] = await Promise.all([
+ projectRoutes.get('/:id', async (c) => {
-     c.env.DB.prepare(
+   const id = parseInt(c.req.param('id'))
-       `SELECT id, title, description, image_url, total_capital, total_shares, share_price,
+   if (isNaN(id)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')
-               status, location, category, start_date, expected_end_date, progress_pct,
+ 
-               completed_at, created_at, updated_at
+   // ⚡ Bolt: Use db.batch() instead of Promise.all to prevent per-query HTTP network overhead in D1
-        FROM projects WHERE id = ?`
+   const results = await c.env.DB.batch([
-     ).bind(id).first<Project>(),
+     c.env.DB.prepare(
-     c.env.DB.prepare(
+       `SELECT id, title, description, image_url, total_capital, total_shares, share_price,
-       'SELECT COALESCE(SUM(quantity), 0) as sold FROM user_shares WHERE project_id = ?'
+               status, location, category, start_date, expected_end_date, progress_pct,
-     ).bind(id).first<{ sold: number }>()
+               completed_at, created_at, updated_at
-   ])
+        FROM projects WHERE id = ?`
- 
+     ).bind(id),
-   if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)
+     c.env.DB.prepare(
- 
+       'SELECT COALESCE(SUM(quantity), 0) as sold FROM user_shares WHERE project_id = ?'
-   return ok(c, {
+     ).bind(id)
-     ...project,
+   ])
-     sold_shares: soldRow?.sold ?? 0,
+ 
-     available_shares: project.total_shares - (soldRow?.sold ?? 0)
+   const project = results[0].results?.[0] as unknown as Project | undefined
-   })
+   const soldRow = results[1].results?.[0] as unknown as { sold: number } | undefined
- })
+ 
- 
+   if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)
+   return ok(c, {
+     ...project,
+     sold_shares: soldRow?.sold ?? 0,
+     available_shares: project.total_shares - (soldRow?.sold ?? 0)
+   })
+ })
+ 
+ 

📌 IDE AST Context: Modified symbols likely include [projectRoutes, projectRoutes.get('/') callback, projectRoutes.get('/:id') callback]
- **[problem-fix] Fixed null crash in HSTS — prevents XSS injection attacks**: -   // Referrer policy
+   // HSTS - enforce HTTPS
-   c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
+   c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
-   
+ 
-   // Permissions policy (disable unnecessary features)
+   // XSS Protection
-   c.header('Permissions-Policy', [
+   c.header('X-XSS-Protection', '1; mode=block')
-     'accelerometer=()',
+ 
-     'ambient-light-sensor=()',
+   // Referrer policy
-     'autoplay=()',
+   c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
-     'camera=()',
+   
-     'cross-origin-isolated=()',
+   // Permissions policy (disable unnecessary features)
-     'display-capture=()',
+   c.header('Permissions-Policy', [
-     'document-domain=()',
+     'accelerometer=()',
-     'encrypted-media=()',
+     'ambient-light-sensor=()',
-     'execution-while-not-rendered=()',
+     'autoplay=()',
-     'execution-while-out-of-viewport=()',
+     'camera=()',
-     'fullscreen=()',
+     'cross-origin-isolated=()',
-     'geolocation=()',
+     'display-capture=()',
-     'gyroscope=()',
+     'document-domain=()',
-     'keyboard-map=()',
+     'encrypted-media=()',
-     'microphone=()',
+     'execution-while-not-rendered=()',
-     'midi=()',
+     'execution-while-out-of-viewport=()',
-     'navigation-override=()',
+     'fullscreen=()',
-     'payment=()',
+     'geolocation=()',
-     'picture-in-picture=()',
+     'gyroscope=()',
-     'publickey-credentials-get=()',
+     'keyboard-map=()',
-     'screen-wake-lock=()',
+     'microphone=()',
-     'sync-xhr=()',
+     'midi=()',
-     'usb=()',
+     'navigation-override=()',
-     'web-share=()',
+     'payment=()',
-     'xr-spatial-tracking=()'
+     'picture-in-picture=()',
-   ].join(', '))
+     'publickey-credentials-get=()',
- })
+     'screen-wake-lock=()',
- 
+     'sync-xhr=()',
- // Validate JWT_SECRET is properly set (fail fast, not silently)
+     'usb=()',
- app.use('/api/*', async (c, next) => {
+     'web-share=()',
-   if (!c.env.JWT_SECRET || c.env.JWT_SECRET.length < 32) {
+     'xr-spatial-tracking=()'
-     return c.json({ success: false, error: 'Server misconfiguration' }, 500)
+   ].join(', '))
-   }
+ })
-   await next()
+ 
- })
+ // Validate JWT_SECRET is properly set (fail fast, not silently)
- 
+ app.use('/api/*', async (c, next) => {
- // Validate required secrets on application startup (health check will fail if missing)
+   if (!c.env.JWT_SECRET || c.env.JWT_SECRET.length < 32) {
- const REQUIRED_SECRETS = ['JWT_SECRET'] as const
+     return c.json({ success: false, error: 'Server misconfiguration' }, 500)
- 
+   }
- app.use('/api/health/ready', async (c) => {
+   await next()
-   const missingSecrets: string[] = []
+ })
-   
+ 
-   // Check core secrets
+ // Validate required secrets on application startup (health check will fail if missing)
-   for (const secret of REQUIRED_SECRETS) {
+ const REQUIRED_SECRETS = ['JWT_SECRET'] as const
-     if (!c.env[secret]) {
+ 
-       missingSecrets.push(secret)
+ app.use('/api/health/ready', async (c) => {
-     }
+   const missingSecrets: string[] = []
-   }
+   
-   
+   // Check core secrets
-   if (missingSecrets.length > 0) {
+   for (const secret of REQUIRED_SECRETS) {
-     return c.json({
+     if (!c.env[secret]) {
-       success: false,
+       missingSecrets.push(secret)
-       status: 'unhealthy',
+     }
-       error: 'Missing required secrets',
+   }
-       missing_secrets: missingSecrets
+   
-     }, 500)
+   if (missingSecrets.length > 0) {
-   }
+     return c.json({
-   
+       success: false,
-   // Check database connectivity
+       status: 'unhealthy',
-   try {
+       error: 'Missing required secrets',
-     await c.env.DB.prepare('SELECT 1 as check').first()
+       missing_secrets: missingSecrets
-   } catch (error) {
+     }, 500)
-     return c.json({
+   }
-       success: false,
+   
-       status: 'unhealthy',
+   // Check database connectivity
-       error: 'Database connection failed',
+   try {
-       details: error instanceof Error ? error.message : 'Unknown error'
+     await c.env.DB.prepare('SELECT 1 as check').first()
-     }, 500)
+   } catch (error) {
-   }
+     return c.json({
-   
+       success: false,
-   // Check KV connectivity
+       status: 'unhealthy',
-   try {
+       error: 'Database connection failed',
-     await c.env.SESSIONS.get('health_check')
+       details: error instanceof Error ? error.message : 'Unknown error'
-   } catch (error) {
+     }, 500)
-     return c.json({
+   }
-       success: false,
+   
-       status: 'unhealthy',
+   // Check KV connectivity
-       error: 'KV connection failed',
+   try {
-       details: error instanceof Error ? error.message : 'Unknown error'
+     await c.env.SESSIONS.get('health_check')
-     }, 500)
+   } catch (error) {
-   }
+     return c.json({
-   
+       success: false,
-   return c.json({
+       status: 'unhealthy',
-     success: true,
+       error: 'KV connection failed',
-     status: 'healthy',
+       details: error instanceof Error ? error.message : 'Unknown error'
-     checks: {
+     }, 500)
-       secrets: 'ok',
+   }
-       database: 'ok',
+   
-       kv: 'ok'
+   return c.json({
-     },
+     success: true,
-     timestamp: new Date().toISOString()
+     status: 'healthy',
-   })
+     checks: {
- })
+       secrets: 'ok',
- 
+       database: 'ok',
- // Global request size limit — reject bodies > 1MB to prevent timeout/DoS
+       kv: 'ok'
- app.use('/api/*', async (c, next) => {
+     },
-   const contentLength = c.req.header('Content-Length')
+     timestamp: new Date().toISOString()
-   if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
+   })
-     return c.json({ success: false, error: 'অনুরোধ অনেক বড়' }, 413)
+ })
-   }
+ 
-   await next()
+ // Global request size limit — reject bodies > 1MB to prevent timeout/DoS
- })
+ app.use('/api/*', async (c, next) => {
- 
+   const contentLength = c.req.header('Content-Length')
- // Security: Block common attack patterns and malicious scanners
+   if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
- app.use('*', async (c, next) => {
+     return c.json({ success: false, error: 'অনুরোধ অনেক বড়' }, 413)
-   const path = c.req.path.toLowerCase()
+   }
-   
+   await next()
-   // Block common attack/scanner patterns
+ })
-   const blockedPatterns = [
+ 
-     '.git', '.env', '.vscode', '.idea', '.docker',
+ // Security: Block common attack patterns and malicious scanners
-     'wp-admin', 'wp-login', 'wp-content', 'wordpress',
+ app.use('*', async (c, next) => {
-     'phpmyadmin', 'pma', 'myadmin',
+   const path = c.req.path.toLowerCase()
-     'admin.php', 'administrator',
+   
-     '.php', '.asp', '.aspx', '.jsp', '.cgi',
+   // Block common attack/scanner patterns
-     'shell', 'cmd', 'exec', 'system',
+   const blockedPatterns = [
-     'etc/passwd', 'etc/shadow',
+     '.git', '.env', '.vscode', '.idea', '.docker',
-     'proc/self',
+     'wp-admin', 'wp-login', 'wp-content', 'wordpress',
-     'boot.ini', 'win.ini',
+     'phpmyadmin', 'pma', 'myadmin',
-     'web.config', 'web.xml',
+     'admin.php', 'administrator',
-     'pom.properties', 'maven',
+     '.php', '.asp', '.aspx', '.jsp', '.cgi',
-     'actuator', 'trace.axd', 'telescope',
+     'shell', 'cmd', 'exec', 'system',
-     'graphql', 'api/gql', 'api/graphql',
+     'etc/passwd', 'etc/shadow',
-     'swagger', 'api-docs', 'v2/api-docs', 'v3/api-docs',
+     'proc/self',
-     'info.php', 'config.json', 'sftp.json',
+     'boot.ini', 'win.ini',
-     'debug/default/view', 'panel=config'
+     'web.config', 'web.xml',
-   ]
+     'pom.properties', 'maven',
-   
+     'actuator', 'trace.axd', 'telescope',
-   // Check if request matches any blocked pattern
+     'graphql', 'api/gql', 'api/graphql',
-   if (blockedPatterns.some(pattern => path.includes(pattern))) {
+     'swagger', 'api-docs', 'v2/api-docs', 'v3/api-docs',
-     console.log(`[Security] Blocked malicious request: ${c.req.method} ${c.req.path}`)
+     'info.php', 'config.json', 'sftp.json',
-     // Return 404 to not reveal that we're blocking
+     'debug/default/view', 'panel=config'
-     return c.json({ success: false, error: 'Not found' }, 404)
+   ]
-   }
+   
-   
+   // Check if request matches any blocked pattern
-   await next()
+   if (blockedPatterns.some(pattern => path.includes(pattern))) {
- })
+     console.log(`[Security] Blocked malicious request: ${c.req.method} ${c.req.path}`)
- 
+     // Return 404 to not reveal that we're blocking
- // Rate limiting middleware using in-memory cache
+     return c.json({ success: false, error: 'Not found' }, 404)
- const rateLimitCache = new Map<string, { count: number; expiry: number }>()
+   }
- const RATE_LIMIT_WINDOW = 60 // 60 seconds
+   
- const RATE_LIMIT_MAX = 100
+   await next()
- 
+ })
- // We do lazy cleanup on each request occasionally to avoid memory leaks
+ 
- let lastCleanup = Date.now()
+ // Rate limiting middleware using in-memory cache
- 
+ const rateLimitCache = new Map<string, { count: number; expiry: number }>()
- app.use('/api/*', async (c, next) => {
+ const RATE_LIMIT_WINDOW = 60 // 60 seconds
-   const ip = c.req.header('CF-Connecting-IP') || 'unknown'
+ const RATE_LIMIT_MAX = 100
-   const key = `rate_limit:${ip}`
+ 
-   const now = Date.now()
+ // We do lazy cleanup on each request occasionally to avoid memory leaks
-   
+ let lastCleanup = Date.now()
-   // Lazy cleanup every 5 minutes
+ 
-   if (now - lastCleanup > 300000) {
+ app.use('/api/*', async (c, next) => {
-     lastCleanup = now
+   const ip = c.req.header('CF-Connecting-IP') || 'unknown'
-     for (const [k, v] of rateLimitCache.entries()) {
+   const key = `rate_limit:${ip}`
-       if (v.expiry <= now) rateLimitCache.delete(k)
+   const now = Date.now()
-     }
+   
-   }
+   // Lazy cleanup every 5 minutes
- 
+   if (now - lastCleanup > 300000) {
-   const cached = rateLimitCache.get(key)
+     lastCleanup = now
-   
+     for (const [k, v] of rateLimitCache.entries()) {
-   if (cached && cached.expiry > now) {
+       if (v.expiry <= now) rateLimitCache.delete(k)
-     if (cached.count > RATE_LIMIT_MAX) {
+     }
-       console.log(`[RateLimit] Blocked ${ip} - ${cached.count} requests`)
+   }
-       return c.json({ success: false, error: 'অনুরোধের সীমা অতিক্রম করেছে' }, 429)
+ 
-     }
+   const cached = rateLimitCache.get(key)
-     cached.count++
+   
-   } else {
+   if (cached && cached.expiry > now) {
-     rateLimitCache.set(key, { count: 1, expiry: now + RATE_LIMIT_WINDOW * 1000 })
+     if (cached.count > RATE_LIMIT_MAX) {
-   }
+       console.log(`[RateLimit] Blocked ${ip} - ${cached.count} requests`)
-   
+       return c.json({ success: false, error: 'অনুরোধের সীমা অতিক্রম করেছে' }, 429)
-   await next()
+     }
- })
+     cached.count++
- 
+   } else {
- // Global error handler — sanitize internal errors, never leak stack traces
+     rateLimitCache.set(key, { count: 1, expiry: now + RATE_LIMIT_WINDOW * 1000 })
- app.onError((err, c) => {
+   }
-   console.error('[unhandled]', err)
+   
-   // Never expose internal error details to client
+   await next()
-   return c.json({ success: false, error: 'সার্ভার সমস্যা হয়েছে। আবার চেষ্টা করুন।' }, 500)
+ })
- })
+ 
- 
+ // Global error handler — sanitize internal errors, never leak stack traces
- // API Routes
+ app.onError((err, c) => {
- app.route('/api/auth', authRoutes)
+   console.error('[unhandled]', err)
- app.route('/api/projects', projectRoutes)
+   // Never expose internal error details to client
- app.route('/api/shares', shareRoutes)
+   return c.json({ success: false, error: 'সার্ভার সমস্যা হয়েছে। আবার চেষ্টা করুন।' }, 500)
- app.route('/api/earnings', earningRoutes)
+ })
- app.route('/api/withdrawals', withdrawalRoutes)
+ 
- app.route('/api/admin/withdrawals', adminWithdrawalRoutes)
+ // API Routes
- app.route('/api/rewards', rewardsRoutes)
+ app.route('/api/auth', authRoutes)
- app.route('/api/tasks', taskRoutes)
+ app.route('/api/projects', projectRoutes)
- app.route('/api/points', pointsRoutes)
+ app.route('/api/shares', shareRoutes)
- app.route('/api/notifications', notificationsRoutes)
+ app.route('/api/earnings', earningRoutes)
- app.route('/api/admin', adminRoutes)
+ app.route('/api/withdrawals', withdrawalRoutes)
- app.route('/api/project-data', projectUpdatesRoutes)  // project updates & gallery (separate from /api/projects to avoid route conflict)
+ app.route('/api/admin/withdrawals', adminWithdrawalRoutes)
- app.route('/api/upload', uploadRoutes)
+ app.route('/api/rewards', rewardsRoutes)
- app.route('/api/referrals', referralRoutes)
+ app.route('/api/tasks', taskRoutes)
- app.route('/api/admin/referrals', adminReferralRoutes)
+ app.route('/api/points', pointsRoutes)
- 
+ app.route('/api/notifications', notificationsRoutes)
- // Project Finance & Profit Distribution Routes
+ app.route('/api/admin', adminRoutes)
- app.route('/api/finance', financeRoutes)
+ app.route('/api/project-data', projectUpdatesRoutes)  // project updates & gallery (separate from /api/projects to avoid route conflict)
- app.route('/api/profit', profitRoutes)
+ app.route('/api/upload', uploadRoutes)
- app.route('/api/profit', userProfitRoutes)  // User-accessible profit routes (my-profits)
+ app.route('/api/referrals', referralRoutes)
- app.route('/api/company-expenses', companyExpenseRoutes)
+ app.route('/api/admin/referrals', adminReferralRoutes)
- // Member Registration Routes
+ // Project Finance & Profit Distribution Routes
- app.route('/api/member', memberRoutes)
+ app.route('/api/finance', financeRoutes)
- 
+ app.route('/api/profit', profitRoutes)
- // Health check
+ app.route('/api/profit', userProfitRoutes)  // User-accessible profit routes (my-profits)
- app.get('/api/health', (c) => c.json({
+ app.route('/api/company-expenses', companyExpenseRoutes)
-   status: 'ok',
+ 
-   project: 'BuildBarguna',
+ // Member Registration Routes
-   time: new Date().toISOString()
+ app.route('/api/member', memberRoutes)
- }))
+ 
- 
+ // Health check
- // App download redirect — uses R2_PUBLIC_URL secret at runtime
+ app.get('/api/health', (c) => c.json({
- // No VITE env var needed — always points to correct URL
+   status: 'ok',
- app.get('/api/download/app', (c) => {
+   project: 'BuildBarguna',
-   const publicUrl = c.env.R2_PUBLIC_URL
+   time: new Date().toISOString()
-   if (!publicUrl) {
+ }))
-     return c.json({ success: false, error: 'Download not available' }, 503)
+ 
-   }
+ // App download redirect — uses R2_PUBLIC_URL secret at runtime
-   const apkUrl = `${publicUrl}/builds/android/buildbarguna-latest-release.apk`
+ // No VITE env var needed — always points to correct URL
-   return c.redirect(apkUrl, 302)
+ app.get('/api/download/app', (c) => {
- })
+   const publicUrl = c.env.R2_PUBLIC_URL
- 
+   if (!publicUrl) {
- // Favicon — serve empty 204
+     return c.json({ success: false, error: 'Download not available' }, 503)
- app.get('/favicon.ico', (c) => new Response(null, { status: 204 }))
+   }
- 
+   const apkUrl = `${publicUrl}/builds/android/buildbarguna-latest-release.apk`
- // Catch-all for /api/* routes that didn't match (return 404, don't fall to SPA)
+   return c.redirect(apkUrl, 302)
- app.on(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], '/api/*', (c) => {
+ })
-   return c.json({ success: false, error: 'API endpoint not found' }, 404)
+ 
- })
+ // Favicon — serve empty 204
- 
+ app.get('/favicon.ico', (c) => new Response(null, { status: 204 }))
- // Export: fetch handler + scheduled (Cron Trigger)
+ 
- export default {
+ // Catch-all for /api/* routes that didn't match (return 404, don't fall to SPA)
-   fetch: app.fetch,
+ app.on(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], '/api/*', (c) => {
-   async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
+   return c.json({ success: false, error: 'API endpoint not found' }, 404)
-     console.log(`[cron] Starting scheduled job at ${new Date().toISOString()}`)
+ })
-     const startTime = Date.now()
+ 
- 
+ // Export: fetch handler + scheduled (Cron Trigger)
-     // Run token blacklist cleanup
+ export default {
-     ctx.waitUntil((async () => {
+   fetch: app.fetch,
-       try {
+   async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
-         console.log('[cron] Starting token blacklist cleanup...')
+     console.log(`[cron] Starting scheduled job at ${new Date().toISOString()}`)
-         await cleanupTokenBlacklist(env)
+     const startTime = Date.now()
-         const duration = Date.now() - startTime
+ 
-         console.log(`[cron] Token blacklist cleanup completed in ${duration}ms`)
+     // Run token blacklist cleanup
- 
+     ctx.waitUntil((async () => {
-         // Store cron execution status for monitoring
+       try {
-         await env.SESSIONS.put('last_cron_execution', JSON.stringify({
+         console.log('[cron] Starting token blacklist cleanup...')
-           timestamp: new Date().toISOString(),
+         await cleanupTokenBlacklist(env)
-           duration_ms: duration,
+         const duration = Date.now() - startTime
-           success: true,
+         console.log(`[cron] Token blacklist cleanup completed in ${duration}ms`)
-           tasks: [{ task: 'token_blacklist_cleanup', status: 'fulfilled', error: null }]
+ 
-         }), { expirationTtl: 86400 }) // Keep for 24 hours for monitoring
+         // Store cron execution status for monitoring
- 
+         await env.SESSIONS.put('last_cron_execution', JSON.stringify({
-       } catch (error) {
+           timestamp: new Date().toISOString(),
-         const duration = Date.now() - startTime
+           duration_ms: duration,
-         console.error(`[cron] Critical error after ${duration}ms:`, error)
+           success: true,
-         // Store error for monitoring
+           tasks: [{ task: 'token_blacklist_cleanup', status: 'fulfilled', error: null }]
-         await env.SESSIONS.put('last_cron_error', JSON.stringify({
+         }), { expirationTtl: 86400 }) // Keep for 24 hours for monitoring
-           timestamp: new Date().toISOString(),
+ 
-           error: error instanceof Error ? error.message : String(error),
+       } catch (error) {
-           stack: error instanceof Error ? error.stack : null
+         const duration = Date.now() - startTime
-         }), { expirationTtl: 86400 })
+         console.error(`[cron] Critical error after ${duration}ms:`, error)
-       }
+         // Store error for monitoring
-     })())
+         await env.SESSIONS.put('last_cron_error', JSON.stringify({
-   }
+           timestamp: new Date().toISOString(),
- }
+           error: error instanceof Error ? error.message : String(error),
- 
+           stack: error instanceof Error ? error.stack : null
- // Export scheduled handler for cron jobs
+         }), { expirationTtl: 86400 })
- export { scheduled }
+       }
- 
+     })())
- // Export Durable Objects
+   }
- export { RateLimiter }
+ }
+ // Export scheduled handler for cron jobs
+ export { scheduled }
+ 
+ // Export Durable Objects
+ export { RateLimiter }
+ 

📌 IDE AST Context: Modified symbols likely include [app, migrationBootstrap, ensureMigrations, app.get('/api/health/migrations') callback, app.use('/api/*') callback]
