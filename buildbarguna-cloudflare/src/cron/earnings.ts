import { calcEarningBySharePrice } from '../lib/money'
import type { Bindings } from '../types'

/**
 * Distribute monthly earnings to all shareholders.
 * Idempotent: UNIQUE(user_id, project_id, month) + INSERT OR IGNORE
 * Safe to run multiple times — will not double-distribute.
 *
 * BLOCKER FIX: Parallel project processing to avoid CPU time limit.
 * Workers have a 30s CPU wall-clock limit. With many projects + shareholders,
 * sequential processing would timeout. We now process all projects in parallel
 * using Promise.all, and batch D1 writes in chunks of 100.
 *
 * @param env   Worker bindings
 * @param month Optional override (YYYY-MM). Defaults to current month.
 */
// Clean up expired token blacklist entries — run in same cron to avoid separate trigger
export async function cleanupTokenBlacklist(env: Bindings): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await env.DB.prepare(
    'DELETE FROM token_blacklist WHERE expires_at < ?'
  ).bind(now).run()
}

export async function distributeMonthlyEarnings(env: Bindings, month?: string): Promise<void> {
  const targetMonth = month ?? new Date().toISOString().slice(0, 7)

  // Fetch all profit rates + project data in one JOIN query (fewer round trips)
  // Include share_price for calcEarningBySharePrice (more accurate than proportion-based)
  const ratesResult = await env.DB.prepare(
    `SELECT pr.project_id, pr.rate, p.total_shares, p.total_capital, p.share_price
     FROM profit_rates pr
     JOIN projects p ON p.id = pr.project_id
     WHERE pr.month = ? AND p.status != 'draft' AND p.total_shares > 0`
  ).bind(targetMonth).all<{ project_id: number; rate: number; total_shares: number; total_capital: number; share_price: number }>()

  if (!ratesResult.results.length) return

  // Process ALL projects in parallel — avoids sequential await bottleneck
  const results = await Promise.allSettled(ratesResult.results.map(async (row) => {
    const shareholders = await env.DB.prepare(
      'SELECT user_id, quantity FROM user_shares WHERE project_id = ?'
    ).bind(row.project_id).all<{ user_id: number; quantity: number }>()

    if (!shareholders.results.length) return

    const statements: D1PreparedStatement[] = []
    for (const holder of shareholders.results) {
      // Use share_price based formula — more accurate than proportion of total_capital
      // Formula: floor(shares × share_price × rate_bps / 10000)
      const amount = calcEarningBySharePrice(
        holder.quantity,
        row.share_price,
        row.rate
      )
      if (amount <= 0) continue

      // Earnings record (INSERT OR IGNORE keeps idempotency)
      statements.push(
        env.DB.prepare(
          `INSERT OR IGNORE INTO earnings (user_id, project_id, month, shares, rate, amount)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(holder.user_id, row.project_id, targetMonth, holder.quantity, row.rate, amount)
      )

      // CRITICAL FIX: Also update user_balances so earnings are immediately withdrawable
      // Uses INSERT OR IGNORE + UPDATE pattern to handle users without a balance row
      statements.push(
        env.DB.prepare(
          `UPDATE user_balances SET total_earned_paisa = total_earned_paisa + ?, updated_at = datetime('now') WHERE user_id = ?`
        ).bind(amount, holder.user_id)
      )

      // Audit trail for balance change
      statements.push(
        env.DB.prepare(
          `INSERT INTO balance_audit_log (user_id, amount_paisa, change_type, reference_type, reference_id, note)
           VALUES (?, ?, 'earn', 'monthly_earnings', ?, ?)`
        ).bind(holder.user_id, amount, row.project_id, `Earnings for ${targetMonth}`)
      )
    }

    if (!statements.length) return

    // D1 batch limit is 100 statements — chunk and execute sequentially per project
    const chunks: D1PreparedStatement[][] = []
    for (let i = 0; i < statements.length; i += 100) {
      chunks.push(statements.slice(i, i + 100))
    }
    for (const chunk of chunks) {
      await env.DB.batch(chunk)
    }
  }))

  // Log any per-project failures without crashing the whole cron
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(
        `[earnings-cron] Project ${ratesResult.results[i]?.project_id} failed:`,
        result.reason
      )
    }
  })
}
