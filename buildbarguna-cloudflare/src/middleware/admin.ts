import { createMiddleware } from 'hono/factory'
import { err } from '../lib/response'
import type { Bindings, Variables } from '../types'

// Admin middleware — verifies role from BOTH JWT (fast) AND DB (authoritative)
// JWT role can be stale if role was changed after token issue.
// DB check ensures revoked/demoted admins are blocked immediately.
export const adminMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    // Fast path: JWT role check first
    const role = c.get('userRole')
    if (role !== 'admin') {
      return err(c, 'শুধুমাত্র অ্যাডমিনের জন্য', 403)
    }

    // Authoritative path: verify from DB — catches demoted admins with stale JWT
    const userId = c.get('userId')
    const dbUser = await c.env.DB.prepare(
      'SELECT role, is_active FROM users WHERE id = ?'
    ).bind(userId).first<{ role: string; is_active: number }>()

    if (!dbUser || dbUser.role !== 'admin' || !dbUser.is_active) {
      return err(c, 'শুধুমাত্র অ্যাডমিনের জন্য', 403)
    }

    await next()
  }
)
