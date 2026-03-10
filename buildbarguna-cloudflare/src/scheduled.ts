/**
 * Scheduled Cron Handler
 * Runs cleanup jobs on a schedule
 * 
 * Cron triggers configured in wrangler.toml:
 * - Every hour: Cleanup expired tokens, old sessions
 */

import type { Bindings } from './types'

export interface ScheduledEvent {
  cron: string
}

export async function scheduled(
  event: ScheduledEvent,
  env: Bindings,
  ctx: ExecutionContext
): Promise<void> {
  console.log(`Running scheduled job: ${event.cron}`)

  try {
    // Cleanup expired password reset tokens (older than 1 hour)
    await cleanupExpiredTokens(env)

    // Cleanup used tokens (older than 24 hours)
    await cleanupUsedTokens(env)

    console.log('Scheduled cleanup completed successfully')
  } catch (error) {
    console.error('Scheduled job failed:', error)
    throw error
  }
}

/**
 * Delete password reset tokens that have expired
 */
async function cleanupExpiredTokens(env: Bindings): Promise<void> {
  const now = Math.floor(Date.now() / 1000)

  const result = await env.DB.prepare(
    'DELETE FROM password_reset_tokens WHERE expires_at < ?'
  ).bind(now).run()

  console.log(`Cleaned up ${result.meta?.changes || 0} expired password reset tokens`)
}

/**
 * Delete used tokens older than 24 hours
 */
async function cleanupUsedTokens(env: Bindings): Promise<void> {
  const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60)

  const result = await env.DB.prepare(
    'DELETE FROM password_reset_tokens WHERE used = 1 AND created_at < datetime(?, "unixepoch")'
  ).bind(twentyFourHoursAgo).run()

  console.log(`Cleaned up ${result.meta?.changes || 0} used password reset tokens`)
}
