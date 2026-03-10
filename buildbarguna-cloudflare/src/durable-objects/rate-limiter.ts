/**
 * Rate Limiter Durable Object
 * Persistent, distributed rate limiting across all Worker instances
 * 
 * Features:
 * - Sliding window rate limiting
 * - Persistent storage across Worker restarts (using ctx.storage)
 * - Automatic cleanup of expired entries
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
  private initialized = false

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
   * Initialize the Durable Object and set up alarm
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return
    
    // Set alarm for cleanup in 15 minutes
    const currentAlarm = await this.ctx.storage.getAlarm()
    if (!currentAlarm) {
      await this.ctx.storage.setAlarm(Date.now() + 15 * 60 * 1000)
    }
    this.initialized = true
  }

  /**
   * Check rate limit and increment counter
   * Uses persistent storage to survive Worker restarts
   * Returns: { allowed: boolean, remaining: number, resetAt: number }
   */
  private async handleCheck(request: Request): Promise<Response> {
    await this.ensureInitialized()
    
    const { key, maxAttempts, windowSeconds } = await request.json<{
      key: string
      maxAttempts: number
      windowSeconds: number
    }>()

    const now = Date.now()
    
    // Get entry from persistent storage
    const entry = await this.ctx.storage.get<RateLimitEntry>(`rl:${key}`)

    if (!entry) {
      // First attempt - allow
      const newEntry: RateLimitEntry = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      }
      await this.ctx.storage.put(`rl:${key}`, newEntry)
      return Response.json({
        allowed: true,
        remaining: maxAttempts - 1,
        resetAt: now + (windowSeconds * 1000)
      })
    }

    // Check if window has expired
    if (now - entry.firstAttempt >= windowSeconds * 1000) {
      // Window expired - reset and allow
      const newEntry: RateLimitEntry = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      }
      await this.ctx.storage.put(`rl:${key}`, newEntry)
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
    await this.ctx.storage.put(`rl:${key}`, entry)

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
    await this.ctx.storage.delete(`rl:${key}`)
    return Response.json({ success: true })
  }

  /**
   * Get status of a rate limit key
   */
  private async handleStatus(request: Request): Promise<Response> {
    const { key, windowSeconds } = await request.json<{ key: string; windowSeconds: number }>()
    const entry = await this.ctx.storage.get<RateLimitEntry>(`rl:${key}`)
    const now = Date.now()

    if (!entry) {
      return Response.json({ exists: false })
    }

    // Check if expired
    if (now - entry.firstAttempt >= windowSeconds * 1000) {
      await this.ctx.storage.delete(`rl:${key}`)
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
   * Called by alarm trigger
   */
  async alarm(): Promise<void> {
    const now = Date.now()
    let deleted = 0

    // List all keys and clean up expired ones
    const keys = await this.ctx.storage.list({ prefix: 'rl:' })
    
    for (const [key, value] of keys) {
      const entry = value as RateLimitEntry
      // Clean up entries older than 1 hour
      if (now - entry.firstAttempt > 3600 * 1000) {
        await this.ctx.storage.delete(key)
        deleted++
      }
    }

    console.log(`RateLimiter cleanup: removed ${deleted} expired entries`)

    // Schedule next cleanup in 15 minutes
    await this.ctx.storage.setAlarm(Date.now() + 15 * 60 * 1000)
  }
}
