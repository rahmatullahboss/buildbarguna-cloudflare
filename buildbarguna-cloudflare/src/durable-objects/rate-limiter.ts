/**
 * Rate Limiter Durable Object
 * Persistent, distributed rate limiting across all Worker instances
 * 
 * Features:
 * - Sliding window rate limiting
 * - Automatic cleanup of expired entries
 * - Persistent across Worker restarts
 */

import { DurableObject } from 'cloudflare:workers'

export interface RateLimitEntry {
  count: number
  firstAttempt: number
  lastAttempt: number
}

export interface RateLimitConfig {
  maxAttempts: number
  windowSeconds: number
}

export class RateLimiter extends DurableObject {
  private rateLimitCache: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    if (path === '/check') {
      return this.handleCheck(request)
    } else if (path === '/reset') {
      return this.handleReset(request)
    } else if (path === '/status') {
      return this.handleStatus(request)
    }

    return new Response('Not Found', { status: 404 })
  }

  /**
   * Check rate limit and increment counter
   * Returns: { allowed: boolean, remaining: number, resetAt: number }
   */
  private async handleCheck(request: Request): Promise<Response> {
    const { key, maxAttempts, windowSeconds } = await request.json<{
      key: string
      maxAttempts: number
      windowSeconds: number
    }>()

    const now = Date.now()
    const entry = this.rateLimitCache.get(key)

    if (!entry) {
      // First attempt - allow
      this.rateLimitCache.set(key, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      })
      return Response.json({
        allowed: true,
        remaining: maxAttempts - 1,
        resetAt: now + (windowSeconds * 1000)
      })
    }

    // Check if window has expired
    if (now - entry.firstAttempt >= windowSeconds * 1000) {
      // Window expired - reset and allow
      this.rateLimitCache.set(key, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      })
      return Response.json({
        allowed: true,
        remaining: maxAttempts - 1,
        resetAt: now + (windowSeconds * 1000)
      })
    }

    // Window still active
    if (entry.count >= maxAttempts) {
      // Rate limited
      return Response.json({
        allowed: false,
        remaining: 0,
        resetAt: entry.firstAttempt + (windowSeconds * 1000)
      })
    }

    // Increment counter
    entry.count++
    entry.lastAttempt = now
    this.rateLimitCache.set(key, entry)

    return Response.json({
      allowed: true,
      remaining: maxAttempts - entry.count,
      resetAt: entry.firstAttempt + (windowSeconds * 1000)
    })
  }

  /**
   * Reset rate limit for a key
   */
  private async handleReset(request: Request): Promise<Response> {
    const { key } = await request.json<{ key: string }>()
    this.rateLimitCache.delete(key)
    return Response.json({ success: true })
  }

  /**
   * Get status of a rate limit key
   */
  private async handleStatus(request: Request): Promise<Response> {
    const { key, windowSeconds } = await request.json<{ key: string; windowSeconds: number }>()
    const entry = this.rateLimitCache.get(key)
    const now = Date.now()

    if (!entry) {
      return Response.json({ exists: false })
    }

    // Check if expired
    if (now - entry.firstAttempt >= windowSeconds * 1000) {
      this.rateLimitCache.delete(key)
      return Response.json({ exists: false })
    }

    return Response.json({
      exists: true,
      count: entry.count,
      firstAttempt: entry.firstAttempt,
      lastAttempt: entry.lastAttempt,
      resetAt: entry.firstAttempt + (windowSeconds * 1000)
    })
  }

  /**
   * Periodic cleanup of expired entries
   */
  async alarm(): Promise<void> {
    const now = Date.now()
    let deleted = 0

    for (const [key, entry] of this.rateLimitCache.entries()) {
      if (now - entry.firstAttempt > 3600 * 1000) { // 1 hour
        this.rateLimitCache.delete(key)
        deleted++
      }
    }

    console.log(`RateLimiter cleanup: removed ${deleted} expired entries`)

    // Schedule next cleanup in 15 minutes
    this.ctx.storage.setAlarm(Date.now() + 15 * 60 * 1000)
  }

  /**
   * Initialize cleanup alarm on first creation
   */
  async init(): Promise<void> {
    // Set alarm for 15 minutes from now
    this.ctx.storage.setAlarm(Date.now() + 15 * 60 * 1000)
    console.log('RateLimiter initialized with cleanup alarm')
  }
}
