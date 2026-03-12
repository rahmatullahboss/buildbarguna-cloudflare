import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { ok, err, getPagination, paginate } from '../lib/response'
import type { Bindings, Variables, TaskListItem, TaskListResponse, TaskStartResponse, TaskCompleteResponse } from '../types'

export const taskRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// All routes require authentication
taskRoutes.use('*', authMiddleware)

// GET /api/tasks - List available tasks for the logged-in member
taskRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  
  // Get all active tasks
  const tasksResult = await c.env.DB.prepare(
    `SELECT 
      dt.id,
      dt.title,
      dt.destination_url,
      dt.platform,
      dt.points,
      dt.cooldown_seconds,
      dt.daily_limit,
      dt.is_one_time,
      dt.is_active
    FROM daily_tasks dt
    WHERE dt.is_active = 1
    ORDER BY dt.points DESC`
  ).all()
  
  const tasks = tasksResult.results as Array<{
    id: number
    title: string
    destination_url: string
    platform: string
    points: number
    cooldown_seconds: number
    daily_limit: number
    is_one_time: number
  }>
  
  // Get today's completions for this user
  const completionsResult = await c.env.DB.prepare(
    `SELECT task_id, COUNT(*) as count
     FROM task_completions 
     WHERE user_id = ? AND task_date = ?
     GROUP BY task_id`
  ).bind(userId, today).all()
  
  const todayCompletions = new Map<number, number>()
  for (const row of completionsResult.results) {
    const r = row as { task_id: number; count: number }
    todayCompletions.set(r.task_id, r.count)
  }
  
  // Get one-time completions (ever)
  const oneTimeResult = await c.env.DB.prepare(
    `SELECT task_id
     FROM task_completions 
     WHERE user_id = ? AND task_id IN (SELECT id FROM daily_tasks WHERE is_one_time = 1)`
  ).bind(userId).all()
  
  const oneTimeCompleted = new Set<number>()
  for (const row of oneTimeResult.results) {
    const r = row as { task_id: number }
    oneTimeCompleted.add(r.task_id)
  }
  
  // Build task list items
  const allTasks: TaskListItem[] = []
  
  for (const task of tasks) {
    const completedToday = todayCompletions.get(task.id) || 0
    const isOneTimeCompleted = oneTimeCompleted.has(task.id)
    
    // Skip one-time tasks that are already completed
    if (task.is_one_time === 1 && isOneTimeCompleted) {
      continue
    }
    
    // Calculate remaining count
    let remainingCount: number
    let canComplete: boolean
    
    if (task.is_one_time === 1) {
      // One-time: can complete once ever
      remainingCount = isOneTimeCompleted ? 0 : 1
      canComplete = !isOneTimeCompleted
    } else {
      // Daily: can complete daily_limit times per day
      remainingCount = Math.max(0, task.daily_limit - completedToday)
      canComplete = completedToday < task.daily_limit
    }
    
    allTasks.push({
      id: task.id,
      title: task.title,
      platform: task.platform as TaskListItem['platform'],
      destination_url: task.destination_url,
      points: task.points,
      cooldown_seconds: task.cooldown_seconds,
      is_one_time: task.is_one_time === 1,
      completed_today: completedToday > 0,
      completed_ever: isOneTimeCompleted,
      remaining_count: remainingCount,
      can_complete: canComplete
    })
  }
  
  // Get user's point balance
  const userPointsResult = await c.env.DB.prepare(
    `SELECT available_points, lifetime_earned, monthly_earned 
     FROM user_points WHERE user_id = ?`
  ).bind(userId).first() as { available_points: number; lifetime_earned: number; monthly_earned: number } | undefined
  
  const userPoints = userPointsResult || { available_points: 0, lifetime_earned: 0, monthly_earned: 0 }
  
  const response: TaskListResponse = {
    tasks: allTasks,
    user_points: {
      available_points: userPoints.available_points,
      lifetime_earned: userPoints.lifetime_earned,
      monthly_earned: userPoints.monthly_earned
    }
  }
  
  return ok(c, response)
})

// GET /api/tasks/:id - Get specific task details
taskRoutes.get('/:id', async (c) => {
  const taskId = parseInt(c.req.param('id'))
  if (isNaN(taskId)) return err(c, 'Invalid task ID')
  
  const task = await c.env.DB.prepare(
    `SELECT * FROM daily_tasks WHERE id = ? AND is_active = 1`
  ).bind(taskId).first()
  
  if (!task) return err(c, 'Task not found', 404)
  
  return ok(c, task)
})

// POST /api/tasks/:id/start - Start a task timer
taskRoutes.post('/:id/start', async (c) => {
  const userId = c.get('userId')
  const taskId = parseInt(c.req.param('id'))
  
  if (isNaN(taskId)) return err(c, 'Invalid task ID')
  
  // Get task
  const task = await c.env.DB.prepare(
    `SELECT * FROM daily_tasks WHERE id = ? AND is_active = 1`
  ).bind(taskId).first() as {
    id: number
    title: string
    destination_url: string
    points: number
    cooldown_seconds: number
    daily_limit: number
    is_one_time: number
  } | undefined
  
  if (!task) return err(c, 'Task not found', 404)
  
  const today = new Date().toISOString().slice(0, 10)
  
  // Check daily limit for daily tasks
  if (task.is_one_time === 0) {
    const todayCountResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM task_completions 
       WHERE user_id = ? AND task_id = ? AND task_date = ?`
    ).bind(userId, taskId, today).first() as { count: number } | undefined
    
    const todayCount = todayCountResult?.count || 0
    if (todayCount >= task.daily_limit) {
      return err(c, 'Daily limit reached for this task', 400)
    }
  }
  
  // Check one-time completion
  if (task.is_one_time === 1) {
    const everCompleted = await c.env.DB.prepare(
      `SELECT id FROM task_completions WHERE user_id = ? AND task_id = ?`
    ).bind(userId, taskId).first()
    
    if (everCompleted) {
      return err(c, 'One-time task already completed', 400)
    }
  }
  
  // Check if already started today (can resume)
  const existingSession = await c.env.DB.prepare(
    `SELECT clicked_at FROM task_start_sessions 
     WHERE user_id = ? AND task_id = ? AND session_date = ?`
  ).bind(userId, taskId, today).first() as { clicked_at: string } | undefined
  
  const clickedAt = existingSession?.clicked_at || new Date().toISOString()
  
  // Create or update session
  await c.env.DB.prepare(
    `INSERT INTO task_start_sessions (user_id, task_id, clicked_at, session_date)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, task_id, session_date) 
     DO UPDATE SET clicked_at = ?`
  ).bind(userId, taskId, clickedAt, today, clickedAt).run()
  
  // Check how much time has passed
  const clickedTime = new Date(clickedAt).getTime()
  const now = Date.now()
  const elapsedSeconds = Math.floor((now - clickedTime) / 1000)
  const remainingSeconds = Math.max(0, task.cooldown_seconds - elapsedSeconds)
  
  const response: TaskStartResponse = {
    task_id: taskId,
    destination_url: task.destination_url,
    wait_seconds: remainingSeconds > 0 ? remainingSeconds : 0,
    started_at: clickedAt
  }
  
  return ok(c, response)
})

// POST /api/tasks/:id/complete - Complete task and award points
taskRoutes.post('/:id/complete', async (c) => {
  const userId = c.get('userId')
  const taskId = parseInt(c.req.param('id'))

  if (isNaN(taskId)) return err(c, 'অকার্যক টাস্ক আইডি', 400)

  const today = new Date().toISOString().slice(0, 10)

  // Get session
  const session = await c.env.DB.prepare(
    `SELECT * FROM task_start_sessions
     WHERE user_id = ? AND task_id = ? AND session_date = ?`
  ).bind(userId, taskId, today).first() as {
    id: number
    user_id: number
    task_id: number
    clicked_at: string
    session_date: string
  } | undefined

  if (!session) {
    return err(c, 'টাস্ক শুরু করেনি। প্রথমে Start এ ক্লিক করুন।', 400)
  }

  // Get task
  const task = await c.env.DB.prepare(
    `SELECT * FROM daily_tasks WHERE id = ? AND is_active = 1`
  ).bind(taskId).first() as {
    id: number
    title: string
    points: number
    cooldown_seconds: number
    daily_limit: number
    is_one_time: number
  } | undefined

  if (!task) return err(c, 'টাস্ক পাওয়া যায়নি', 404)

  // Validate timer
  const clickedTime = new Date(session.clicked_at).getTime()
  const now = Date.now()
  const elapsedSeconds = Math.floor((now - clickedTime) / 1000)

  if (elapsedSeconds < task.cooldown_seconds) {
    const remaining = task.cooldown_seconds - elapsedSeconds
    return err(c, `আরও ${remaining} সেকেন্ড অপেক্ষা করুন`, 400)
  }

  // FRAUD DETECTION: Check for suspiciously fast completions
  const completionTimeSeconds = elapsedSeconds
  const isSuspiciouslyFast = completionTimeSeconds < 5 // Less than 5 seconds is suspicious
  const flagReason = isSuspiciouslyFast ? 'সন্দেহজনক দ্রুত সম্পাদন' : null

  // Check if already completed today (prevent double submission)
  const existingCompletion = await c.env.DB.prepare(
    `SELECT id FROM task_completions 
     WHERE user_id = ? AND task_id = ? AND task_date = ?`
  ).bind(userId, taskId, today).first()

  if (existingCompletion) {
    return err(c, 'টাস্ক ইতিমধ্যে সম্পন্ন হয়েছে', 409)
  }

  // Re-check daily limit (prevent race conditions)
  if (task.is_one_time === 0) {
    const todayCountResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM task_completions
       WHERE user_id = ? AND task_id = ? AND task_date = ?`
    ).bind(userId, taskId, today).first() as { count: number } | undefined

    const todayCount = todayCountResult?.count || 0
    if (todayCount >= task.daily_limit) {
      return err(c, 'দৈনিক সীমা পূর্ণ হয়েছে', 400)
    }
  }

  // Check for one-time task completion
  if (task.is_one_time === 1) {
    const everCompleted = await c.env.DB.prepare(
      `SELECT id FROM task_completions WHERE user_id = ? AND task_id = ?`
    ).bind(userId, taskId).first()

    if (everCompleted) {
      return err(c, 'এককালীন টাস্ক ইতিমধ্যে সম্পন্ন হয়েছে', 409)
    }
  }
  
  // ATOMIC FIX (C4): All 3 operations in a single batch — prevents partial state
  // If completion already exists (INSERT OR IGNORE), no rows change, and we detect that.
  const batchResults = await c.env.DB.batch([
    // 1. Create completion
    c.env.DB.prepare(
      `INSERT OR IGNORE INTO task_completions (user_id, task_id, clicked_at, completed_at, task_date, points_earned, completion_time_seconds, is_flagged, flag_reason, is_one_time)
       VALUES (?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?)`
    ).bind(userId, taskId, session.clicked_at, today, task.points, completionTimeSeconds, isSuspiciouslyFast ? 1 : 0, flagReason, task.is_one_time),
    // 2. Insert point transaction
    c.env.DB.prepare(
      `INSERT OR IGNORE INTO point_transactions (user_id, task_id, points, transaction_type, description, month_year)
       VALUES (?, ?, ?, 'earned', ?, strftime('%Y-%m', 'now'))`
    ).bind(userId, taskId, task.points, `Completed: ${task.title}`),
    // 3. Update user point balance
    c.env.DB.prepare(
      `UPDATE user_points SET
         available_points = available_points + ?,
         lifetime_earned = lifetime_earned + ?,
         monthly_earned = monthly_earned + ?,
         updated_at = datetime('now')
       WHERE user_id = ?`
    ).bind(task.points, task.points, task.points, userId)
  ])
  
  // If completion INSERT OR IGNORE produced 0 changes → already completed
  if (!batchResults[0].meta.changes || batchResults[0].meta.changes === 0) {
    return err(c, 'টাস্ক ইতিমধ্যে সম্পন্ন হয়েছে', 409)
  }
  
  // Get new total
  const userPoints = await c.env.DB.prepare(
    'SELECT available_points FROM user_points WHERE user_id = ?'
  ).bind(userId).first() as { available_points: number } | undefined
  
  const response: TaskCompleteResponse = {
    points_earned: task.points,
    total_points: userPoints?.available_points || 0,
    completed_at: new Date().toISOString()
  }
  
  return ok(c, response)
})

// GET /api/tasks/history - Task completion history
taskRoutes.get('/history', async (c) => {
  const userId = c.get('userId')
  const { page, limit, offset } = getPagination(c.req.query())
  
  const [countResult, historyResult] = await Promise.all([
    c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM task_completions WHERE user_id = ?`
    ).bind(userId).first() as Promise<{ total: number }>,
    c.env.DB.prepare(
      `SELECT tc.*, dt.title as task_title, dt.platform, dt.points as points_awarded
       FROM task_completions tc
       LEFT JOIN daily_tasks dt ON tc.task_id = dt.id
       WHERE tc.user_id = ?
       ORDER BY tc.completed_at DESC
       LIMIT ? OFFSET ?`
    ).bind(userId, limit, offset).all()
  ])
  
  return ok(c, paginate(historyResult.results, countResult.total, page, limit))
})
