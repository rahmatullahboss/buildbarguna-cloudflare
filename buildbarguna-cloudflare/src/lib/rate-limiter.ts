/**
 * Rate Limiter Client
 * Helper functions to interact with Rate Limiter Durable Object
 */

import type { RateLimiter } from '../durable-objects/rate-limiter'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check rate limit using Durable Object
 */
export async function checkRateLimit(
  env: { RATE_LIMITER: DurableObjectNamespace<RateLimiter> },
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const id = env.RATE_LIMITER.idFromName('global-rate-limiter')
  const stub = env.RATE_LIMITER.get(id)

  try {
    const response = await stub.fetch('http://internal/check', {
      method: 'POST',
      body: JSON.stringify({ key, maxAttempts, windowSeconds })
    })

    return response.json()
  } catch (error) {
    console.error('Rate limiter DO error:', error)
    // Fallback: allow request if DO is unavailable
    return { allowed: true, remaining: maxAttempts, resetAt: Date.now() }
  }
}

/**
 * Reset rate limit for a key
 */
export async function resetRateLimit(
  env: { RATE_LIMITER: DurableObjectNamespace<RateLimiter> },
  key: string
): Promise<void> {
  const id = env.RATE_LIMITER.idFromName('global-rate-limiter')
  const stub = env.RATE_LIMITER.get(id)

  try {
    await stub.fetch('http://internal/reset', {
      method: 'POST',
      body: JSON.stringify({ key })
    })
  } catch (error) {
    console.error('Rate limiter reset error:', error)
  }
}

/**
 * Get rate limit status
 */
export async function getRateLimitStatus(
  env: { RATE_LIMITER: DurableObjectNamespace<RateLimiter> },
  key: string,
  windowSeconds: number
): Promise<{ exists: boolean; count?: number; resetAt?: number }> {
  const id = env.RATE_LIMITER.idFromName('global-rate-limiter')
  const stub = env.RATE_LIMITER.get(id)

  try {
    const response = await stub.fetch('http://internal/status', {
      method: 'POST',
      body: JSON.stringify({ key, windowSeconds })
    })

    return response.json()
  } catch (error) {
    console.error('Rate limiter status error:', error)
    return { exists: false }
  }
}
