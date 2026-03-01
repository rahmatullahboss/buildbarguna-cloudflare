import { createMiddleware } from 'hono/factory'
import { verifyToken } from '../lib/jwt'
import { err } from '../lib/response'
import type { Bindings, Variables } from '../types'

export const authMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return err(c, 'অনুমোদন প্রয়োজন', 401)
    }

    const token = authHeader.slice(7)
    const payload = await verifyToken(token, c.env.JWT_SECRET)

    if (!payload) {
      return err(c, 'টোকেন অকার্যকর বা মেয়াদোত্তীর্ণ', 401)
    }

    // Check token blacklist (logout)
    // D1 blacklist check — strong consistency (unlike KV which has ~60s eventual lag)
    const blacklisted = await c.env.DB.prepare(
      'SELECT jti FROM token_blacklist WHERE jti = ? AND expires_at > ?'
    ).bind(payload.jti, Math.floor(Date.now() / 1000)).first()
    if (blacklisted) {
      return err(c, 'টোকেন বাতিল করা হয়েছে, আবার লগইন করুন', 401)
    }

    c.set('userId', parseInt(payload.sub))
    c.set('userRole', payload.role)
    c.set('userPhone', payload.phone)

    await next()
  }
)
