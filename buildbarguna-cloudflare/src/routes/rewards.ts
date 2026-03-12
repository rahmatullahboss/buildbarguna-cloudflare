import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { ok, err } from '../lib/response'
import { RATE_LIMITS, RATE_LIMIT_ENDPOINTS } from '../lib/constants'
import type { Bindings, Variables } from '../types'

export const rewardsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

rewardsRoutes.use('*', authMiddleware)

// GET /api/rewards - Available rewards catalog
rewardsRoutes.get('/', async (c) => {
  const rewards = await c.env.DB.prepare(
    `SELECT * FROM rewards 
     WHERE is_active = 1 AND (quantity IS NULL OR redeemed_count < quantity)
     ORDER BY points_required ASC`
  ).all()
  
  return ok(c, rewards.results)
})

// GET /api/rewards/my-redemptions - User's redemption history
// IMPORTANT: Must come BEFORE /:id to avoid being matched as a reward ID
rewardsRoutes.get('/my-redemptions', async (c) => {
  const userId = c.get('userId')
  
  const redemptions = await c.env.DB.prepare(
    `SELECT rr.*, r.name as reward_name, r.description as reward_description
     FROM reward_redemptions rr
     LEFT JOIN rewards r ON rr.reward_id = r.id
     WHERE rr.user_id = ?
     ORDER BY rr.redeemed_at DESC`
  ).bind(userId).all()
  
  return ok(c, redemptions.results)
})

// GET /api/rewards/:id - Get specific reward details
rewardsRoutes.get('/:id', async (c) => {
  const rewardId = parseInt(c.req.param('id'))
  if (isNaN(rewardId)) return err(c, 'অকার্যক রিওয়ার্ড আইডি')
  
  const reward = await c.env.DB.prepare(
    `SELECT * FROM rewards WHERE id = ?`
  ).bind(rewardId).first()
  
  if (!reward) return err(c, 'রিওয়ার্ড পাওয়া যায়নি', 404)
  
  return ok(c, reward)
})

// POST /api/rewards/:id/redeem - Redeem a reward
rewardsRoutes.post('/:id/redeem', async (c) => {
  const userId = c.get('userId')
  const rewardId = parseInt(c.req.param('id'))
  if (isNaN(rewardId)) return err(c, 'অকার্যক রিওয়ার্ড আইডি', 400)

  // Rate limiting: Check hourly limit
  const rateLimitCheck = await c.env.DB.prepare(
    `INSERT INTO rate_limits (user_id, endpoint, request_count, window_start)
     VALUES (?, ?, 1, datetime('now'))
     ON CONFLICT(user_id, endpoint, window_start) DO UPDATE SET
       request_count = request_count + 1
     WHERE datetime('now') < datetime(window_start, '+1 hour')`
  ).bind(userId, RATE_LIMIT_ENDPOINTS.REWARD_REDEEM).run()

  const currentCount = await c.env.DB.prepare(
    `SELECT request_count FROM rate_limits
     WHERE user_id = ? AND endpoint = ?
     AND datetime('now') < datetime(window_start, '+1 hour')`
  ).bind(userId, RATE_LIMIT_ENDPOINTS.REWARD_REDEEM).first<{ request_count: number }>()

  if ((currentCount?.request_count || 0) > RATE_LIMITS.REWARD_REDEEM.MAX_PER_HOUR) {
    return err(c, 'প্রতি ঘণ্টায় সর্বোচ্চ ৫টি রিওয়ার্ড রিডিম করা যায়', 429)
  }

  // Get reward details with explicit is_active check
  const reward = await c.env.DB.prepare(
    `SELECT * FROM rewards WHERE id = ? AND is_active = 1`
  ).bind(rewardId).first()

  if (!reward) return err(c, 'রিওয়ার্ড পাওয়া যায়নি অথবা নিষ্ক্রিয়', 404)

  // Check if quantity limited and available - with proper type handling
  const rewardQuantity = reward.quantity as number | null
  const redeemedCount = reward.redeemed_count as number
  if (rewardQuantity !== null && redeemedCount >= rewardQuantity) {
    return err(c, 'রিওয়ার্ডটি আর উপলব্ধ নয়', 400)
  }

  // Get user's point balance with explicit type
  const userPoints = await c.env.DB.prepare(
    `SELECT available_points FROM user_points WHERE user_id = ?`
  ).bind(userId).first<{ available_points: number }>()

  const pointsRequired = reward.points_required as number
  if (!userPoints || userPoints.available_points < pointsRequired) {
    return err(c, `পর্যাপ্ত পয়েন্ট নেই। প্রয়োজন: ${pointsRequired}, আপনার আছে: ${userPoints?.available_points || 0}`, 400)
  }

  // CRITICAL FIX: Use atomic UPDATE with WHERE clause to prevent race conditions
  // This deducts points AND checks balance in a single atomic operation
  const pointsDeductResult = await c.env.DB.prepare(
    `UPDATE user_points SET
       available_points = available_points - ?,
       lifetime_redeemed = lifetime_redeemed + ?,
       monthly_redeemed = monthly_redeemed + ?,
       updated_at = datetime('now')
     WHERE user_id = ? AND available_points >= ?`
  ).bind(pointsRequired, pointsRequired, pointsRequired, userId, pointsRequired).run()

  // Check if points deduction succeeded (constraint would prevent if insufficient points)
  if (!pointsDeductResult.meta.changes || pointsDeductResult.meta.changes === 0) {
    return err(c, 'পর্যাপ্ত পয়েন্ট নেই। অনুগ্রহ করে আবার চেষ্টা করুন।', 400)
  }

  try {
    // Step 1: Reserve reward (atomic update with quantity check)
    if (rewardQuantity !== null) {
      // M2 FIX: Only increment redeemed_count, NOT decrement quantity
      // `quantity` is the originally stocked amount, `redeemed_count` tracks redemptions
      const reserveResult = await c.env.DB.prepare(
        `UPDATE rewards
         SET redeemed_count = redeemed_count + 1
         WHERE id = ? AND is_active = 1 AND (quantity - redeemed_count) > 0`
      ).bind(rewardId).run()

      if (!reserveResult.meta.changes || reserveResult.meta.changes === 0) {
        // M3 FIX: Symmetric rollback — restore ALL counters, not just available_points
        await c.env.DB.prepare(
          `UPDATE user_points SET
             available_points = available_points + ?,
             lifetime_redeemed = lifetime_redeemed - ?,
             monthly_redeemed = monthly_redeemed - ?,
             updated_at = datetime('now')
           WHERE user_id = ?`
        ).bind(pointsRequired, pointsRequired, pointsRequired, userId).run()
        return err(c, 'রিওয়ার্ডটি ইতিমধ্যে শেষ হয়ে গেছে', 400)
      }
    } else {
      // For unlimited rewards, just increment redeemed_count
      await c.env.DB.prepare(
        `UPDATE rewards SET redeemed_count = redeemed_count + 1 WHERE id = ? AND is_active = 1`
      ).bind(rewardId).run()
    }

    // Step 2: Create point transaction record
    const currentMonth = new Date().toISOString().slice(0, 7)
    await c.env.DB.prepare(
      `INSERT INTO point_transactions (user_id, points, transaction_type, description, month_year, metadata)
       VALUES (?, ?, 'redeemed', ?, ?, ?)`
    ).bind(
      userId,
      -pointsRequired,
      `Redeemed: ${reward.name}`,
      currentMonth,
      JSON.stringify({ reward_id: rewardId, reward_name: reward.name })
    ).run()

    // Step 3: Create redemption record
    const redemptionResult = await c.env.DB.prepare(
      `INSERT INTO reward_redemptions (user_id, reward_id, points_spent, status)
       VALUES (?, ?, ?, 'pending')`
    ).bind(userId, rewardId, pointsRequired).run()

    // Step 4: Create notification for user
    await c.env.DB.prepare(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       VALUES (?, 'reward_redeemed', 'রিওয়ার্ড রিডিম হয়েছে!', 'আপনার অনুরোধ শীঘ্রই প্রসেস করা হবে', ?, 'redemption')`
    ).bind(userId, redemptionResult.meta.last_row_id).run()

    // Step 5: Create admin notification
    await c.env.DB.prepare(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       SELECT id, 'redemption_pending', 'নতুন রিওয়ার্ড রিডিম অনুরোধ',
              ? || ' - ' || ? || ' পয়েন্ট খরচ', ?, 'redemption'
       FROM users
       WHERE role = 'admin' AND is_active = 1
       LIMIT 5`
    ).bind(reward.name, pointsRequired.toString(), redemptionResult.meta.last_row_id).run()

    return ok(c, {
      message: 'রিওয়ার্ড রিডিম সফল হয়েছে! আপনার অনুরোধ শীঘ্রই প্রসেস করা হবে।',
      redemption_id: redemptionResult.meta.last_row_id,
      points_spent: pointsRequired,
      remaining_points: userPoints.available_points - pointsRequired
    })

  } catch (error) {
    console.error('Reward redemption error:', error)

    // M3 FIX: Symmetric rollback — restore ALL counters, not just available_points
    await c.env.DB.prepare(
      `UPDATE user_points SET
         available_points = available_points + ?,
         lifetime_redeemed = lifetime_redeemed - ?,
         monthly_redeemed = monthly_redeemed - ?,
         updated_at = datetime('now')
       WHERE user_id = ?`
    ).bind(pointsRequired, pointsRequired, pointsRequired, userId).run()

    return err(c, 'রিওয়ার্ড রিডিম করতে সমস্যা হচ্ছে', 500)
  }
})
