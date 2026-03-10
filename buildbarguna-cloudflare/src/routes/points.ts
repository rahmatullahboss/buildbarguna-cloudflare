import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { ok, err, getPagination, paginate } from '../lib/response'
import { RATE_LIMITS, RATE_LIMIT_ENDPOINTS, EXPORT_TYPES, PAGINATION, POINTS_SYSTEM } from '../lib/constants'
import type { Bindings, Variables } from '../types'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

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

// Validation schema for withdrawal
const withdrawSchema = z.object({
  amount_points: z.number().min(POINTS_SYSTEM.MIN_WITHDRAWAL_POINTS, `ন্যূনতম ${POINTS_SYSTEM.MIN_WITHDRAWAL_POINTS} পয়েন্ট প্রয়োজন`),
  bkash_number: z.string().regex(/^01[3-9]\d{8}$/, 'সঠিক bKash নম্বর দিন (01XXXXXXXXX)')
})

// POST /api/points/withdraw - Request points withdrawal
pointsRoutes.post('/withdraw', zValidator('json', withdrawSchema), async (c) => {
  const userId = c.get('userId')
  const { amount_points, bkash_number } = c.req.valid('json')
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

  // Rate limiting: Check hourly limit
  const rateLimitCheck = await c.env.DB.prepare(
    `INSERT INTO rate_limits (user_id, endpoint, request_count, window_start)
     VALUES (?, ?, 1, datetime('now'))
     ON CONFLICT(user_id, endpoint, window_start) DO UPDATE SET
       request_count = request_count + 1
     WHERE datetime('now') < datetime(window_start, '+1 hour')`
  ).bind(userId, RATE_LIMIT_ENDPOINTS.POINTS_WITHDRAW).run()

  const currentCount = await c.env.DB.prepare(
    `SELECT request_count FROM rate_limits
     WHERE user_id = ? AND endpoint = ?
     AND datetime('now') < datetime(window_start, '+1 hour')`
  ).bind(userId, RATE_LIMIT_ENDPOINTS.POINTS_WITHDRAW).first<{ request_count: number }>()

  if ((currentCount?.request_count || 0) > RATE_LIMITS.POINTS_WITHDRAW.MAX_PER_HOUR) {
    return err(c, 'প্রতি ঘণ্টায় সর্বোচ্চ ৩টি উত্তোলন করা যায়', 429)
  }

  // Check monthly withdrawal limit
  const monthlyWithdrawals = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM point_withdrawals
     WHERE user_id = ? AND strftime('%Y-%m', requested_at) = ?`
  ).bind(userId, currentMonth).first<{ count: number }>()

  if ((monthlyWithdrawals?.count || 0) >= POINTS_SYSTEM.MAX_WITHDRAWALS_PER_MONTH) {
    return err(c, `প্রতি মাসে সর্বোচ্চ ${POINTS_SYSTEM.MAX_WITHDRAWALS_PER_MONTH}টি উত্তোলন করা যায়`, 400)
  }

  // Get user points with explicit type
  const userPoints = await c.env.DB.prepare(
    `SELECT available_points FROM user_points WHERE user_id = ?`
  ).bind(userId).first<{ available_points: number }>()

  const balance = userPoints?.available_points || 0

  // Check minimum (also validated by schema, but double-check)
  if (amount_points < POINTS_SYSTEM.MIN_WITHDRAWAL_POINTS) {
    return err(c, `ন্যূনতম ${POINTS_SYSTEM.MIN_WITHDRAWAL_POINTS} পয়েন্ট প্রয়োজন`, 400)
  }

  // Check balance
  if (balance < amount_points) {
    return err(c, `পর্যাপ্ত পয়েন্ট নেই। আপনার আছে ${balance} পয়েন্ট`, 400)
  }

  // Check for pending withdrawal
  const existingPending = await c.env.DB.prepare(
    `SELECT id FROM point_withdrawals
     WHERE user_id = ? AND status = 'pending'`
  ).bind(userId).first()

  if (existingPending) {
    return err(c, 'আপনার একটি উত্তোলন অনুরোধ ইতিমধ্যে অপেক্ষমান', 400)
  }

  // Calculate taka (10 points = 1 taka)
  const amount_taka = Math.floor(amount_points / POINTS_SYSTEM.POINTS_TO_TAKA_DIVISOR)

  // CRITICAL FIX: Deduct points immediately to prevent double-spending
  // This locks the points so they can't be used for rewards while withdrawal is pending
  const deductResult = await c.env.DB.prepare(
    `UPDATE user_points SET
       available_points = available_points - ?,
       lifetime_redeemed = lifetime_redeemed + ?,
       updated_at = datetime('now')
     WHERE user_id = ? AND available_points >= ?`
  ).bind(amount_points, amount_points, userId, amount_points).run()

  if (!deductResult.meta.changes || deductResult.meta.changes === 0) {
    return err(c, 'পর্যাপ্ত পয়েন্ট নেই। অনুগ্রহ করে আবার চেষ্টা করুন।', 400)
  }

  try {
    // Create withdrawal request
    await c.env.DB.prepare(
      `INSERT INTO point_withdrawals (user_id, amount_points, amount_taka, bkash_number, status)
       VALUES (?, ?, ?, ?, 'pending')`
    ).bind(userId, amount_points, amount_taka, bkash_number).run()

    // Create transaction record for withdrawal
    await c.env.DB.prepare(
      `INSERT INTO point_transactions (user_id, points, transaction_type, description, month_year)
       VALUES (?, ?, 'withdrawn', ?, ?)`
    ).bind(userId, -amount_points, `Withdrawal request: ${amount_points} points to bKash`, currentMonth).run()

    // Create notification for user
    await c.env.DB.prepare(
      `INSERT INTO notifications (user_id, type, title, message, reference_type)
       VALUES (?, 'withdrawal_request', 'উত্তোলন অনুরোধ জমা দেওয়া হয়েছে', ?, 'point_withdrawal')`
    ).bind(userId, `আপনার ${amount_points} পয়েন্ট (${amount_taka} টাকা) উত্তোলন অনুরোধ জমা দেওয়া হয়েছে।`).run()

    // Notify admins
    await c.env.DB.prepare(
      `INSERT INTO notifications (user_id, type, title, message, reference_type)
       SELECT id, 'new_withdrawal', 'নতুন পয়েন্ট উত্তোলন অনুরোধ',
              ? || ' - ' || ? || ' পয়েন্ট', 'point_withdrawal'
       FROM users WHERE role = 'admin' AND is_active = 1 LIMIT 5`
    ).bind(bkash_number, amount_points.toString()).run()

    return ok(c, {
      message: 'উত্তোলন অনুরোধ সফলভাবে জমা দেওয়া হয়েছে!',
      amount_points,
      amount_taka,
      status: 'pending'
    }, 201)

  } catch (error) {
    console.error('Withdrawal creation error:', error)

    // Rollback: restore points
    await c.env.DB.prepare(
      `UPDATE user_points SET
         available_points = available_points + ?,
         updated_at = datetime('now')
       WHERE user_id = ?`
    ).bind(amount_points, userId).run()

    return err(c, 'উত্তোলন অনুরোধ তৈরি করতে সমস্যা হচ্ছে', 500)
  }
})

// GET /api/points/withdrawals - Withdrawal history
pointsRoutes.get('/withdrawals', async (c) => {
  const userId = c.get('userId')
  const { page, limit, offset } = getPagination(c.req.query())

  const [countResult, historyResult] = await Promise.all([
    c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM point_withdrawals WHERE user_id = ?`
    ).bind(userId).first() as Promise<{ total: number }>,
    c.env.DB.prepare(
      `SELECT * FROM point_withdrawals
       WHERE user_id = ?
       ORDER BY requested_at DESC
       LIMIT ? OFFSET ?`
    ).bind(userId, limit, offset).all()
  ])

  return ok(c, paginate(historyResult.results, countResult.total, page, limit))
})

