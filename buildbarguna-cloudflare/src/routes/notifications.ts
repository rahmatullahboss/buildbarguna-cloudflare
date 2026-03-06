import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { ok, err } from '../lib/response'
import type { Bindings, Variables } from '../types'

export const notificationsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

notificationsRoutes.use('*', authMiddleware)

// GET /api/notifications - Get user's notifications
notificationsRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  const limit = parseInt(c.req.query('limit') || '50')
  const unreadOnly = c.req.query('unread') === 'true'
  
  let query = `
    SELECT * FROM notifications 
    WHERE user_id = ?
  `
  const params: any[] = [userId]
  
  if (unreadOnly) {
    query += ` AND is_read = 0`
  }
  
  query += ` ORDER BY created_at DESC LIMIT ?`
  params.push(limit)
  
  const notifications = await c.env.DB.prepare(query).bind(...params).all()
  
  // Get unread count
  const unreadCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`
  ).bind(userId).first<{ count: number }>()
  
  return ok(c, {
    notifications: notifications.results,
    unread_count: unreadCount?.count || 0
  })
})

// PATCH /api/notifications/:id/read - Mark notification as read
notificationsRoutes.patch('/:id/read', async (c) => {
  const userId = c.get('userId')
  const notificationId = parseInt(c.req.param('id'))
  
  if (isNaN(notificationId)) return err(c, 'অকার্যক নোটিফিকেশন আইডি')
  
  const result = await c.env.DB.prepare(
    `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`
  ).bind(notificationId, userId).run()
  
  if (!result.meta.changes || result.meta.changes === 0) {
    return err(c, 'নোটিফিকেশন পাওয়া যায়নি', 404)
  }
  
  return ok(c, { message: 'নোটিফিকেশন পড়া হয়েছে' })
})

// PATCH /api/notifications/read-all - Mark all notifications as read
notificationsRoutes.patch('/read-all', async (c) => {
  const userId = c.get('userId')
  
  const result = await c.env.DB.prepare(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`
  ).bind(userId).run()
  
  return ok(c, { 
    message: 'সব নোটিফিকেশন পড়া হয়েছে',
    marked_count: result.meta.changes || 0
  })
})

// DELETE /api/notifications/:id - Delete a notification
notificationsRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const notificationId = parseInt(c.req.param('id'))
  
  if (isNaN(notificationId)) return err(c, 'অকার্যক নোটিফিকেশন আইডি')
  
  const result = await c.env.DB.prepare(
    `DELETE FROM notifications WHERE id = ? AND user_id = ?`
  ).bind(notificationId, userId).run()
  
  if (!result.meta.changes || result.meta.changes === 0) {
    return err(c, 'নোটিফিকেশন পাওয়া যায়নি', 404)
  }
  
  return ok(c, { message: 'নোটিফিকেশন মুছে ফেলা হয়েছে' })
})

// GET /api/notifications/unread-count - Get unread notification count
notificationsRoutes.get('/unread/count', async (c) => {
  const userId = c.get('userId')
  
  const result = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`
  ).bind(userId).first<{ count: number }>()
  
  return ok(c, { unread_count: result?.count || 0 })
})
