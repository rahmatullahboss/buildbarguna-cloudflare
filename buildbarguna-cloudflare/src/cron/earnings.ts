import type { Bindings } from '../types'

/**
 * Clean up expired token blacklist entries.
 * Called from scheduled cron handler.
 */
export async function cleanupTokenBlacklist(env: Bindings): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await env.DB.prepare(
    'DELETE FROM token_blacklist WHERE expires_at < ?'
  ).bind(now).run()
}

// NOTE: distributeMonthlyEarnings has been removed.
// Profit distribution is now done exclusively via the P&L-based system
// in profit-distribution.ts (ProjectFinance → ProfitDistribution flow).
// The old rate-based system (profit_rates table → earnings table) was a
// separate, conflicting approach that could cause double-crediting.
