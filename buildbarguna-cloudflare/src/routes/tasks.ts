import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { ok, err } from '../lib/response'
import type { Bindings, Variables, DailyTask } from '../types'

export const taskRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

taskRoutes.use('*', authMiddleware)

// GET /api/tasks — today's tasks with completion status
taskRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  const rows = await c.env.DB.prepare(
    `SELECT t.*,
       CASE WHEN tc.id IS NOT NULL THEN 1 ELSE 0 END as completed
     FROM daily_tasks t
     LEFT JOIN task_completions tc
       ON tc.task_id = t.id AND tc.user_id = ? AND tc.task_date = ?
     WHERE t.is_active = 1
     ORDER BY t.id ASC`
  ).bind(userId, today).all()

  return ok(c, rows.results)
})

// GET /api/tasks/:id/redirect — log click then redirect
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

  return c.redirect(task.destination_url, 302)
})

// POST /api/tasks/:id/complete — mark task complete after redirect
taskRoutes.post('/:id/complete', async (c) => {
  const taskId = parseInt(c.req.param('id'))
  if (isNaN(taskId)) return err(c, 'অকার্যকর টাস্ক আইডি')
  const userId = c.get('userId')
  const today = new Date().toISOString().slice(0, 10)

  const task = await c.env.DB.prepare(
    'SELECT id FROM daily_tasks WHERE id = ? AND is_active = 1'
  ).bind(taskId).first()

  if (!task) return err(c, 'টাস্ক পাওয়া যায়নি', 404)

  // Check clicked (must have redirected first) and not already fully completed
  const existing = await c.env.DB.prepare(
    'SELECT clicked_at, completed_at FROM task_completions WHERE user_id = ? AND task_id = ? AND task_date = ?'
  ).bind(userId, taskId, today).first<{ clicked_at: string | null; completed_at: string | null }>()

  if (!existing?.clicked_at) {
    return err(c, 'আগে লিংকে ক্লিক করুন, তারপর সম্পন্ন করুন')
  }

  // Idempotent: already completed today — return success without re-updating
  if (existing.completed_at) {
    return ok(c, { message: 'টাস্ক আগেই সম্পন্ন হয়েছে' })
  }

  // Mark completed — only updates once per day
  await c.env.DB.prepare(
    `UPDATE task_completions SET completed_at = datetime('now')
     WHERE user_id = ? AND task_id = ? AND task_date = ? AND completed_at IS NULL`
  ).bind(userId, taskId, today).run()

  return ok(c, { message: 'টাস্ক সম্পন্ন হয়েছে' })
})
