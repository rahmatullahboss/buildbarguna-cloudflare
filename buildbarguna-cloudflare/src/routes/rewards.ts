import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { ok, err } from '../lib/response'
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
  if (isNaN(rewardId)) return err(c, 'অকার্যক রিওয়ার্ড আইডি')
  
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
  
  // Use a transaction-like approach with rollback capability
  // Step 1: Atomically reserve the reward AND increment redeemed_count together
  if (rewardQuantity !== null) {
    // Atomic update: decrement quantity AND increment redeemed_count in single operation
    const reserveResult = await c.env.DB.prepare(
      `UPDATE rewards 
       SET quantity = quantity - 1, redeemed_count = redeemed_count + 1 
       WHERE id = ? AND is_active = 1 AND (quantity - redeemed_count) > 0`
    ).bind(rewardId).run()
    
    if (!reserveResult.meta.changes || reserveResult.meta.changes === 0) {
      return err(c, 'রিওয়ার্ডটি ইতিমধ্যে শেষ হয়ে গেছে', 400)
    }
  } else {
    // For unlimited rewards, just increment redeemed_count
    await c.env.DB.prepare(
      `UPDATE rewards SET redeemed_count = redeemed_count + 1 WHERE id = ? AND is_active = 1`
    ).bind(rewardId).run()
  }
  
  try {
    // Step 2: Deduct points from user
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
      // Rollback: restore reward quantity and redeemed_count together
      if (rewardQuantity !== null) {
        await c.env.DB.prepare(
          `UPDATE rewards SET quantity = quantity + 1, redeemed_count = redeemed_count - 1 WHERE id = ?`
        ).bind(rewardId).run()
      } else {
        await c.env.DB.prepare(
          `UPDATE rewards SET redeemed_count = redeemed_count - 1 WHERE id = ?`
        ).bind(rewardId).run()
      }
      return err(c, 'পয়েন্ট কেটে নেওয়া সম্ভব হয়নি। আবার চেষ্টা করুন।', 500)
    }
    
    // Step 3: Create point transaction record
    const txResult = await c.env.DB.prepare(
      `INSERT INTO point_transactions (user_id, points, transaction_type, description, month_year, metadata)
       VALUES (?, ?, 'redeemed', ?, strftime('%Y-%m', 'now'), ?)`
    ).bind(
      userId,
      -pointsRequired,
      `Redeemed: ${reward.name}`,
      JSON.stringify({ reward_id: rewardId, reward_name: reward.name })
    ).run()
    
    // Step 4: Create redemption record
    const redemptionResult = await c.env.DB.prepare(
      `INSERT INTO reward_redemptions (user_id, reward_id, points_spent, status)
       VALUES (?, ?, ?, 'pending')`
    ).bind(userId, rewardId, pointsRequired).run()
    
    // Step 5: Create notification for user
    await c.env.DB.prepare(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       VALUES (?, 'reward_redeemed', 'রিওয়ার্ড রিডিম হয়েছে!', 'আপনার অনুরোধ শীঘ্রই প্রসেস করা হবে', ?, 'redemption')`
    ).bind(userId, redemptionResult.meta.last_row_id).run()
    
    // Step 6: Create admin notification with deduplication (parameterized to prevent SQL injection)
    // Note: Using a separate INSERT for each admin to avoid string interpolation
    // Security: Don't expose user's remaining point balance in notification (information leakage)
    const adminNotification = await c.env.DB.prepare(
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
    
    // Rollback: restore points and reward state
    await c.env.DB.prepare(
      `UPDATE user_points SET 
         available_points = available_points + ?,
         updated_at = datetime('now')
       WHERE user_id = ?`
    ).bind(pointsRequired, userId).run()
    
    if (rewardQuantity !== null) {
      await c.env.DB.prepare(
        `UPDATE rewards SET quantity = quantity + 1, redeemed_count = redeemed_count - 1 WHERE id = ?`
      ).bind(rewardId).run()
    } else {
      await c.env.DB.prepare(
        `UPDATE rewards SET redeemed_count = redeemed_count - 1 WHERE id = ?`
      ).bind(rewardId).run()
    }
    
    return err(c, 'রিওয়ার্ড রিডিম করতে সমস্যা হচ্ছে', 500)
  }
})

// GET /api/rewards/my-redemptions - User's redemption history
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
