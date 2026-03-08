import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { ok, err } from '../lib/response'
import { TASK_DEFAULTS, FRAUD_THRESHOLDS, RATE_LIMITS, TIMING } from '../lib/constants'
import type { Bindings, Variables, DailyTask } from '../types'

export const taskRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Public route: redirect to task URL (no auth required for the redirect itself)
// The task completion will be tracked separately when user completes the task
taskRoutes.get('/public/:id/redirect', async (c) => {
  const taskId = parseInt(c.req.param('id'))
  if (isNaN(taskId)) return c.redirect('/', 302)

  const task = await c.env.DB.prepare(
    'SELECT destination_url FROM daily_tasks WHERE id = ? AND is_active = 1'
  ).bind(taskId).first<{ destination_url: string }>()

  if (!task) return c.redirect('/', 302)
  
  // Redirect to the actual destination
  return c.redirect(task.destination_url, 302)
})

taskRoutes.use('*', authMiddleware)

// POST /api/tasks/:id/click — track that user clicked the task link
taskRoutes.post('/:id/click', async (c) => {
  const taskId = parseInt(c.req.param('id'))
  if (isNaN(taskId)) return err(c, 'অকার্যকর টাস্ক আইডি')
  const userId = c.get('userId')
  const today = new Date().toISOString().slice(0, 10)

  const task = await c.env.DB.prepare(
    'SELECT id FROM daily_tasks WHERE id = ? AND is_active = 1'
  ).bind(taskId).first()

  if (!task) return err(c, 'টাস্ক পাওয়া যায়নি', 404)

  // Log the click (upsert clicked_at)
  await c.env.DB.prepare(
    `INSERT INTO task_completions (user_id, task_id, task_date, clicked_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, task_id, task_date) DO UPDATE SET clicked_at = datetime('now')`
  ).bind(userId, taskId, today).run()

  return ok(c, { message: 'ক্লিক ট্র্যাক করা হয়েছে' })
})

// GET /api/tasks — today's tasks with completion status and points
taskRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  const rows = await c.env.DB.prepare(
    `SELECT t.*,
       CASE WHEN tc.id IS NOT NULL THEN 1 ELSE 0 END as completed,
       tc.points_earned,
       tc.clicked_at,
       tc.completed_at as completion_timestamp
     FROM daily_tasks t
     LEFT JOIN task_completions tc
       ON tc.task_id = t.id AND tc.user_id = ? AND tc.task_date = ?
     WHERE t.is_active = 1
     ORDER BY t.id ASC`
  ).bind(userId, today).all()

  return ok(c, rows.results)
})

// GET /api/tasks/:id/redirect — log click then redirect to ACTUAL destination
taskRoutes.get('/:id/redirect', async (c) => {
  const taskId = parseInt(c.req.param('id'))
  if (isNaN(taskId)) return err(c, 'অকার্যকর টাস্ক আইডি')
  const userId = c.get('userId')
  const today = new Date().toISOString().slice(0, 10)

  const task = await c.env.DB.prepare(
    'SELECT * FROM daily_tasks WHERE id = ? AND is_active = 1'
  ).bind(taskId).first<DailyTask>()

  if (!task) return err(c, 'টাস্ক পাওয়া যায়নি', 404)

  // Log the click (upsert clicked_at)
  await c.env.DB.prepare(
    `INSERT INTO task_completions (user_id, task_id, task_date, clicked_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, task_id, task_date) DO UPDATE SET clicked_at = datetime('now')`
  ).bind(userId, taskId, today).run()

  // Redirect to ACTUAL destination URL (NOT homepage!)
  return c.redirect(task.destination_url, 302)
})

// POST /api/tasks/:id/complete — mark task complete after cooldown, award points
taskRoutes.post('/:id/complete', async (c) => {
  const taskId = parseInt(c.req.param('id'))
  if (isNaN(taskId)) return err(c, 'অকার্যকর টাস্ক আইডি')
  const userId = c.get('userId')
  const today = new Date().toISOString().slice(0, 10)
  const now = Date.now()

  const task = await c.env.DB.prepare(
    'SELECT * FROM daily_tasks WHERE id = ? AND is_active = 1'
  ).bind(taskId).first<DailyTask>()

  if (!task) return err(c, 'টাস্ক পাওয়া যায়নি', 404)

  // Use a single atomic operation to check and update - prevents race conditions
  // First, get the current completion record with lock-like semantics
  const existing = await c.env.DB.prepare(
    'SELECT clicked_at, completed_at, points_earned FROM task_completions WHERE user_id = ? AND task_id = ? AND task_date = ?'
  ).bind(userId, taskId, today).first<{ clicked_at: string | null; completed_at: string | null; points_earned: number }>()

  // Already completed - return success (idempotent)
  if (existing?.completed_at) {
    // Check if this is a one-time task - if so, they can't do it again
    if (task.is_one_time === 1) {
      return ok(c, { 
        message: 'এই টাস্ক একবারই করা যায়, আগেই সম্পন্ন হয়েছে',
        already_completed: true,
        points_earned: existing.points_earned
      })
    }
    return ok(c, { 
      message: 'টাস্ক আগেই সম্পন্ন হয়েছে',
      already_completed: true,
      points_earned: existing.points_earned
    })
  }

  // Check if one-time task already completed ever (not just today)
  if (task.is_one_time === 1) {
    const oneTimeCheck = await c.env.DB.prepare(
      'SELECT points_earned FROM task_completions WHERE user_id = ? AND task_id = ? AND completed_at IS NOT NULL'
    ).bind(userId, taskId).first<{ points_earned: number }>()
    
    if (oneTimeCheck) {
      return err(c, 'এই টাস্ক একবারই করা যায়, আগেই সম্পন্ন হয়েছে')
    }
  }

  // Check if clicked first (must redirect before completing)
  if (!existing?.clicked_at) {
    return err(c, 'আগে লিংকে ক্লিক করুন, তারপর সম্পন্ন করুন')
  }

  // Check cooldown period with server-side enforcement
  const clickedTime = new Date(existing.clicked_at).getTime()
  const cooldownMs = (task.cooldown_seconds || TASK_DEFAULTS.COOLDOWN_SECONDS) * 1000
  const timeElapsed = now - clickedTime

  if (timeElapsed < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - timeElapsed) / 1000)
    return err(c, `অনুগ্রহ করে ${remainingSeconds} সেকেন্ড অপেক্ষা করুন, তারপর সম্পন্ন করুন`)
  }

  // Fraud detection: Check for suspicious completion patterns
  const recentCompletions = await c.env.DB.prepare(
    `SELECT COUNT(*) as count, 
            SUM(CASE WHEN clicked_at IS NOT NULL AND completed_at IS NOT NULL 
                     THEN (julianday(completed_at) - julianday(clicked_at)) * 86400 
                     ELSE 0 END) as total_time
     FROM task_completions 
     WHERE user_id = ? AND task_date = ? AND completed_at IS NOT NULL`
  ).bind(userId, today).first<{ count: number; total_time: number }>()

  const completionCount = recentCompletions?.count || 0
  const avgCompletionTime = completionCount > 0 ? (recentCompletions?.total_time || 0) / completionCount : 0

  // Flag if user completes tasks suspiciously fast
  if (completionCount >= FRAUD_THRESHOLDS.MIN_COMPLETIONS_FOR_CHECK && avgCompletionTime < FRAUD_THRESHOLDS.SUSPICIOUS_AVG_TIME_SECONDS) {
    console.warn(`[FRAUD ALERT] User ${userId} completing tasks too fast. Avg: ${avgCompletionTime.toFixed(1)}s`)
    
    // Auto-block if pattern detected
    if (completionCount >= FRAUD_THRESHOLDS.AUTO_BLOCK_COMPLETIONS && avgCompletionTime < FRAUD_THRESHOLDS.AUTO_BLOCK_AVG_TIME_SECONDS) {
      // Auto-block: Mark user's pending completions for review
      await c.env.DB.prepare(
        `INSERT INTO notifications (user_id, type, title, message, reference_type)
         VALUES (?, 'fraud_alert', 'টাস্ক সম্পন্ন করা স্থগিত', 
                'সন্দেহজনক গতিতে টাস্ক সম্পন্ন করার কারণে আপনার টাস্ক সম্পন্ন করা সাময়িকভাবে স্থগিত করা হয়েছে। অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।', 'user')`
      ).bind(userId).run()
      
      // Log fraud incident for admin review
      await c.env.DB.prepare(
        `INSERT INTO admin_actions (admin_user_id, action_type, target_id, target_type, reason, new_value)
         VALUES (0, 'task_update', ?, 'user', 'Auto-fraud-block: avg completion time < 3s', ?)`
      ).bind(userId, JSON.stringify({ avg_completion_time: avgCompletionTime, completion_count: completionCount })).run()
      
      return err(c, 'সন্দেহজনক কার্যকলাপের কারণে টাস্ক সম্পন্ন করা স্থগিত। সাপোর্টে যোগাযোগ করুন।', 403)
    }
  }

  // Check daily limit
  const dailyCompletions = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM task_completions 
     WHERE user_id = ? AND task_id = ? AND task_date = ? AND completed_at IS NOT NULL`
  ).bind(userId, taskId, today).first<{ count: number }>()

  if ((dailyCompletions?.count || 0) >= (task.daily_limit || TASK_DEFAULTS.DAILY_LIMIT)) {
    return err(c, `আজকের ডেইলি লিমিট পূর্ণ হয়েছে (${task.daily_limit || TASK_DEFAULTS.DAILY_LIMIT}টি)`)
  }

  // Rate limiting: Check if user is completing tasks too rapidly
  const oneMinuteAgo = new Date(now - 60000).toISOString().replace('T', ' ').slice(0, 19)
  const recentMinuteCompletions = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM task_completions 
     WHERE user_id = ? AND completed_at > ? AND completed_at IS NOT NULL`
  ).bind(userId, oneMinuteAgo).first<{ count: number }>()

  if ((recentMinuteCompletions?.count || 0) >= RATE_LIMITS.TASK_COMPLETION.MAX_PER_MINUTE) {
    return err(c, 'অনেক দ্রুত টাস্ক সম্পন্ন হচ্ছে। অনুগ্রহ করে একটু থামুন।', 429)
  }

  // Award points and mark complete - use atomic update with optimistic locking
  const pointsToAward = task.points || TASK_DEFAULTS.POINTS

  try {
    // Atomic update: only update if not already completed (prevents race condition)
    const updateResult = await c.env.DB.prepare(
      `UPDATE task_completions 
       SET completed_at = datetime('now'), 
           points_earned = ?,
           completion_time_seconds = CAST((julianday(datetime('now')) - julianday(?)) * 86400 AS INTEGER)
       WHERE user_id = ? AND task_id = ? AND task_date = ? AND completed_at IS NULL`
    ).bind(pointsToAward, existing.clicked_at, userId, taskId, today).run()

    // Check if the update actually happened (rows affected > 0)
    if (!updateResult.meta.changes || updateResult.meta.changes === 0) {
      // Another request completed it first - fetch the points and return success
      const finalCompletion = await c.env.DB.prepare(
        'SELECT points_earned FROM task_completions WHERE user_id = ? AND task_id = ? AND task_date = ?'
      ).bind(userId, taskId, today).first<{ points_earned: number }>()
      
      return ok(c, { 
        message: 'টাস্ক সম্পন্ন হয়েছে',
        already_completed: true,
        points_earned: finalCompletion?.points_earned || pointsToAward
      })
    }

    // Initialize user_points if not exists (use INSERT OR IGNORE to prevent race condition)
    // Also update current_month if needed to ensure the record is ready for points
    await c.env.DB.prepare(
      `INSERT INTO user_points (user_id, available_points, lifetime_earned, lifetime_redeemed, monthly_earned, monthly_redeemed, current_month, updated_at)
       VALUES (?, 0, 0, 0, 0, 0, strftime('%Y-%m', 'now'), datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET current_month = strftime('%Y-%m', 'now')`
    ).bind(userId).run()

    // Add points to user balance - fetch current points first to ensure record exists
    const currentPoints = await c.env.DB.prepare(
      'SELECT available_points FROM user_points WHERE user_id = ?'
    ).bind(userId).first<{ available_points: number }>()

    // Now update with guaranteed existence
    const pointsUpdate = await c.env.DB.prepare(
      `UPDATE user_points SET 
         available_points = available_points + ?,
         lifetime_earned = lifetime_earned + ?,
         monthly_earned = monthly_earned + ?,
         updated_at = datetime('now')
       WHERE user_id = ?`
    ).bind(pointsToAward, pointsToAward, pointsToAward, userId).run()

    // Check if points update succeeded
    if (!pointsUpdate.meta.changes || pointsUpdate.meta.changes === 0) {
      // Rollback the task completion since points couldn't be added
      await c.env.DB.prepare(
        `UPDATE task_completions SET completed_at = NULL, points_earned = 0 
         WHERE user_id = ? AND task_id = ? AND task_date = ?`
      ).bind(userId, taskId, today).run()
      
      return err(c, 'পয়েন্ট যোগ করতে সমস্যা হচ্ছে। আবার চেষ্টা করুন।', 500)
    }

    // Get the updated points for response
    const updatedPoints = await c.env.DB.prepare(
      'SELECT available_points FROM user_points WHERE user_id = ?'
    ).bind(userId).first<{ available_points: number }>()

    // Create transaction record with metadata
    await c.env.DB.prepare(
      `INSERT INTO point_transactions (user_id, task_id, points, transaction_type, description, month_year, metadata)
       VALUES (?, ?, ?, 'earned', ?, strftime('%Y-%m', 'now'), ?)`
    ).bind(
      userId, 
      taskId, 
      pointsToAward, 
      `Completed task: ${task.title}`,
      JSON.stringify({ task_title: task.title, platform: task.platform })
    ).run()

    // Create notification for user
    await c.env.DB.prepare(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       VALUES (?, 'points_earned', 'পয়েন্ট অর্জিত!', '+${pointsToAward} পয়েন্ট যোগ করা হয়েছে', ?, 'task')`
    ).bind(userId, taskId).run()

    // Check for badge eligibility
    const totalCompletions = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM task_completions 
       WHERE user_id = ? AND completed_at IS NOT NULL`
    ).bind(userId).first<{ count: number }>()

    const badgeToAward = totalCompletions?.count === 1 ? 'first_task' :
                         totalCompletions?.count === 10 ? '10_tasks' :
                         totalCompletions?.count === 50 ? '50_tasks' :
                         totalCompletions?.count === 100 ? '100_tasks' : null

    if (badgeToAward) {
      await c.env.DB.prepare(
        `INSERT OR IGNORE INTO user_badges (user_id, badge_type, badge_name, badge_description)
         VALUES (?, ?, ?, ?)`
      ).bind(
        userId, 
        badgeToAward,
        badgeToAward === 'first_task' ? 'First Steps' :
        badgeToAward === '10_tasks' ? 'Getting Started' :
        badgeToAward === '50_tasks' ? 'Dedicated Member' : 'Task Master',
        badgeToAward === 'first_task' ? 'Completed your first task' :
        badgeToAward === '10_tasks' ? 'Completed 10 tasks' :
        badgeToAward === '50_tasks' ? 'Completed 50 tasks' : 'Completed 100 tasks'
      ).run()
    }

    return ok(c, { 
      message: 'টাস্ক সম্পন্ন হয়েছে! পয়েন্ট যোগ করা হয়েছে',
      points_earned: pointsToAward,
      task_title: task.title,
      total_completions: totalCompletions?.count || 1,
      badge_earned: badgeToAward
    })

  } catch (error) {
    console.error('Task completion error:', error)
    return err(c, 'টাস্ক সম্পন্ন করতে সমস্যা হচ্ছে', 500)
  }
})
