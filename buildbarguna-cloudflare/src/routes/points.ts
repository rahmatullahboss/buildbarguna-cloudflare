import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { ok, err } from '../lib/response'
import { RATE_LIMITS, RATE_LIMIT_ENDPOINTS, EXPORT_TYPES, PAGINATION } from '../lib/constants'
import type { Bindings, Variables } from '../types'

export const pointsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

pointsRoutes.use('*', authMiddleware)

// GET /api/points - User's current point balance
pointsRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  
  const userPoints = await c.env.DB.prepare(
    `SELECT * FROM user_points WHERE user_id = ?`
  ).bind(userId).first()
  
  if (!userPoints) {
    // Initialize user points if not exists
    await c.env.DB.prepare(
      `INSERT INTO user_points (user_id, available_points, lifetime_earned, lifetime_redeemed, monthly_earned, monthly_redeemed)
       VALUES (?, 0, 0, 0, 0, 0)`
    ).bind(userId).run()
    
    const freshPoints = await c.env.DB.prepare(
      `SELECT * FROM user_points WHERE user_id = ?`
    ).bind(userId).first()
    
    return ok(c, freshPoints)
  }
  
  return ok(c, userPoints)
})

// GET /api/points/history - Point transaction history
pointsRoutes.get('/history', async (c) => {
  const userId = c.get('userId')
  const month = c.req.query('month') // Optional month filter (YYYY-MM format)
  const limit = parseInt(c.req.query('limit') || '50')
  
  let query = `
    SELECT pt.*, dt.title as task_title
    FROM point_transactions pt
    LEFT JOIN daily_tasks dt ON pt.task_id = dt.id
    WHERE pt.user_id = ?
  `
  const params: any[] = [userId]
  
  if (month) {
    query += ` AND pt.month_year = ?`
    params.push(month)
  }
  
  query += ` ORDER BY pt.created_at DESC LIMIT ?`
  params.push(limit)
  
  const transactions = await c.env.DB.prepare(query).bind(...params).all()
  
  return ok(c, transactions.results)
})

// GET /api/points/monthly - Monthly point summary
pointsRoutes.get('/monthly', async (c) => {
  const userId = c.get('userId')
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  
  const monthlyData = await c.env.DB.prepare(
    `SELECT 
       month_year,
       SUM(CASE WHEN transaction_type = 'earned' THEN points ELSE 0 END) as earned,
       SUM(CASE WHEN transaction_type = 'redeemed' THEN ABS(points) ELSE 0 END) as redeemed,
       COUNT(*) as transaction_count
     FROM point_transactions
     WHERE user_id = ? AND month_year = ?
     GROUP BY month_year`
  ).bind(userId, currentMonth).first()
  
  // Null check: Return default values if no data
  return ok(c, monthlyData || { month_year: currentMonth, earned: 0, redeemed: 0, transaction_count: 0 })
})

// GET /api/points/leaderboard - Top point earners
pointsRoutes.get('/leaderboard', async (c) => {
  const userId = c.get('userId')
  const limit = parseInt(c.req.query('limit') || PAGINATION.LEADERBOARD_DEFAULT.toString())
  const timeframe = c.req.query('timeframe') || 'all' // 'all', 'month', 'week'
  
  // Rate limiting: Max requests per minute per user
  const rateLimitCheck = await c.env.DB.prepare(
    `INSERT INTO rate_limits (user_id, endpoint, request_count, window_start)
     VALUES (?, ?, 1, datetime('now'))
     ON CONFLICT(user_id, endpoint, window_start) DO UPDATE SET 
       request_count = request_count + 1
     WHERE datetime('now') < datetime(window_start, '+1 minute')`
  ).bind(userId, RATE_LIMIT_ENDPOINTS.LEADERBOARD).run()
  
  // Check if rate limit exceeded
  const currentCount = await c.env.DB.prepare(
    `SELECT request_count FROM rate_limits 
     WHERE user_id = ? AND endpoint = ? 
     AND datetime('now') < datetime(window_start, '+1 minute')`
  ).bind(userId, RATE_LIMIT_ENDPOINTS.LEADERBOARD).first<{ request_count: number }>()
  
  if ((currentCount?.request_count || 0) > RATE_LIMITS.LEADERBOARD.MAX_REQUESTS) {
    return err(c, 'অনেক বেশি request. অনুগ্রহ করে ১ মিনিট অপেক্ষা করুন।', 429)
  }
  
  let query: string
  const params: any[] = []
  
  if (timeframe === 'month') {
    query = `
      SELECT u.id, u.name, 
           up.lifetime_earned, up.available_points, up.monthly_earned,
           (SELECT COUNT(*) FROM task_completions tc WHERE tc.user_id = u.id AND tc.completed_at IS NOT NULL) as tasks_completed
      FROM users u
      JOIN user_points up ON u.id = up.user_id
      WHERE u.is_active = 1
      ORDER BY up.monthly_earned DESC
      LIMIT ?
    `
    params.push(limit)
  } else if (timeframe === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    query = `
      SELECT u.id, u.name,
             COALESCE(SUM(CASE WHEN pt.transaction_type = 'earned' THEN pt.points ELSE 0 END), 0) as weekly_earned,
             up.available_points,
             (SELECT COUNT(*) FROM task_completions tc WHERE tc.user_id = u.id AND tc.task_date >= ?) as tasks_completed
      FROM users u
      JOIN user_points up ON u.id = up.user_id
      LEFT JOIN point_transactions pt ON u.id = pt.user_id AND pt.created_at >= ?
      WHERE u.is_active = 1
      GROUP BY u.id
      ORDER BY weekly_earned DESC
      LIMIT ?
    `
    params.push(weekAgo, weekAgo, limit)
  } else {
    query = `
      SELECT u.id, u.name, 
           up.lifetime_earned, up.available_points, up.monthly_earned,
           (SELECT COUNT(*) FROM task_completions tc WHERE tc.user_id = u.id AND tc.completed_at IS NOT NULL) as tasks_completed
      FROM users u
      JOIN user_points up ON u.id = up.user_id
      WHERE u.is_active = 1
      ORDER BY up.lifetime_earned DESC
      LIMIT ?
    `
    params.push(limit)
  }
  
  const leaderboard = await c.env.DB.prepare(query).bind(...params).all()
  
  // Add rank to results
  const rankedResults = leaderboard.results.map((entry: any, index: number) => ({
    ...entry,
    rank: index + 1
  }))
  
  return ok(c, rankedResults)
})

// GET /api/points/export - Request data export
pointsRoutes.get('/export', async (c) => {
  const userId = c.get('userId')
  const exportType = c.req.query('type') || 'point_history'
  
  // Input validation: Only allow known export types
  if (!EXPORT_TYPES.includes(exportType as any)) {
    return err(c, `অকার্যক এক্সপোর্ট টাইপ। অনুমোদিত: ${EXPORT_TYPES.join(', ')}`, 400)
  }
  
  // Rate limiting: Max export requests per hour per user
  const rateLimitCheck = await c.env.DB.prepare(
    `INSERT INTO rate_limits (user_id, endpoint, request_count, window_start)
     VALUES (?, ?, 1, datetime('now'))
     ON CONFLICT(user_id, endpoint, window_start) DO UPDATE SET 
       request_count = request_count + 1
     WHERE datetime('now') < datetime(window_start, '+1 hour')`
  ).bind(userId, RATE_LIMIT_ENDPOINTS.EXPORT).run()
  
  const currentCount = await c.env.DB.prepare(
    `SELECT request_count FROM rate_limits 
     WHERE user_id = ? AND endpoint = ? 
     AND datetime('now') < datetime(window_start, '+1 hour')`
  ).bind(userId, RATE_LIMIT_ENDPOINTS.EXPORT).first<{ request_count: number }>()
  
  if ((currentCount?.request_count || 0) > RATE_LIMITS.EXPORT.MAX_REQUESTS) {
    return err(c, 'অনেক বেশি এক্সপোর্ট অনুরোধ। অনুগ্রহ করে ১ ঘণ্টা অপেক্ষা করুন।', 429)
  }
  
  // Check if user already has a pending export
  const existingExport = await c.env.DB.prepare(
    `SELECT * FROM data_exports WHERE user_id = ? AND status IN ('pending', 'processing') ORDER BY requested_at DESC LIMIT 1`
  ).bind(userId).first()
  
  if (existingExport) {
    return ok(c, { 
      message: 'আপনার পূর্বের এক্সপোর্ট এখনও প্রসেস হচ্ছে',
      export_id: existingExport.id,
      status: existingExport.status
    })
  }
  
  // Create new export request
  const exportResult = await c.env.DB.prepare(
    `INSERT INTO data_exports (user_id, export_type, status)
     VALUES (?, ?, 'pending')`
  ).bind(userId, exportType).run()
  
  return ok(c, {
    message: 'আপনার ডেটা এক্সপোর্ট অনুরোধ গ্রহণ করা হয়েছে',
    export_id: exportResult.meta.last_row_id,
    export_type: exportType,
    estimated_time: '২-৫ মিনিট'
  })
})

// GET /api/points/export/status - Check export status
pointsRoutes.get('/export/status', async (c) => {
  const userId = c.get('userId')
  const exportId = c.req.query('id')
  
  if (!exportId) {
    // Get latest export
    const latestExport = await c.env.DB.prepare(
      `SELECT * FROM data_exports WHERE user_id = ? ORDER BY requested_at DESC LIMIT 1`
    ).bind(userId).first()
    
    if (!latestExport) {
      return ok(c, { message: 'কোনো এক্সপোর্ট অনুরোধ নেই' })
    }
    
    return ok(c, latestExport)
  }
  
  const exportRecord = await c.env.DB.prepare(
    `SELECT * FROM data_exports WHERE id = ? AND user_id = ?`
  ).bind(exportId, userId).first()
  
  if (!exportRecord) {
    return err(c, 'এক্সপোর্ট পাওয়া যায়নি', 404)
  }
  
  return ok(c, exportRecord)
})

// GET /api/points/badges - User's earned badges
pointsRoutes.get('/badges', async (c) => {
  const userId = c.get('userId')
  
  const badges = await c.env.DB.prepare(
    `SELECT * FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC`
  ).bind(userId).all()
  
  // Get available badges not yet earned (from badge_definitions table or hardcoded defaults)
  const badgeDefinitions = [
    { badge_type: 'first_task', badge_name: 'First Steps', badge_description: 'Completed your first task' },
    { badge_type: '10_tasks', badge_name: 'Getting Started', badge_description: 'Completed 10 tasks' },
    { badge_type: '50_tasks', badge_name: 'Dedicated Member', badge_description: 'Completed 50 tasks' },
    { badge_type: '100_tasks', badge_name: 'Task Master', badge_description: 'Completed 100 tasks' },
    { badge_type: 'first_reward', badge_name: 'Reward Winner', badge_description: 'Redeemed your first reward' },
    { badge_type: 'consistent_performer', badge_name: 'Consistent Performer', badge_description: 'Completed tasks 7 days in a row' }
  ]
  
  const earnedBadgeTypes = new Set(badges.results.map((b: any) => b.badge_type))
  const availableBadges = badgeDefinitions.filter(b => !earnedBadgeTypes.has(b.badge_type))
  
  return ok(c, {
    earned: badges.results,
    available: availableBadges,
    total_earned: badges.results.length,
    total_available: availableBadges.length
  })
})
