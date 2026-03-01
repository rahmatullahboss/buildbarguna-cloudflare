import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { ok, err, getPagination, paginate } from '../lib/response'
import { safeMultiply } from '../lib/money'
import type { Bindings, Variables, SharePurchase, Project } from '../types'

export const shareRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

shareRoutes.use('*', authMiddleware)

const buySchema = z.object({
  project_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10_000, 'একসাথে সর্বোচ্চ ১০,০০০ শেয়ার কেনা যাবে'),
  // bKash TxID: 8-12 alphanumeric characters
  bkash_txid: z.string().regex(/^[A-Z0-9]{8,12}$/, 'বৈধ bKash TxID দিন (৮-১২ অক্ষর, বড় হাতে)')
})

// POST /api/shares/buy
shareRoutes.post('/buy', zValidator('json', buySchema), async (c) => {
  const { project_id, quantity, bkash_txid } = c.req.valid('json')
  const userId = c.get('userId')

  // Check project exists and is active
  const project = await c.env.DB.prepare(
    `SELECT p.*, COALESCE((SELECT SUM(us.quantity) FROM user_shares us WHERE us.project_id = p.id), 0) as sold_shares
     FROM projects p WHERE p.id = ? AND p.status = 'active'`
  ).bind(project_id).first<Project & { sold_shares: number }>()

  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি বা সক্রিয় নয়')

  // Check availability
  const available = project.total_shares - project.sold_shares
  if (quantity > available) {
    return err(c, `শুধুমাত্র ${available}টি শেয়ার পাওয়া যাচ্ছে`)
  }

  // Calculate total amount
  const total_amount = safeMultiply(quantity, project.share_price)
  if (total_amount === null) return err(c, 'পরিমাণ অকার্যকর', 400)

  // Check duplicate TxID
  const dupTx = await c.env.DB.prepare(
    'SELECT id FROM share_purchases WHERE bkash_txid = ?'
  ).bind(bkash_txid).first()
  if (dupTx) return err(c, 'এই bKash TxID ইতিমধ্যে ব্যবহার করা হয়েছে', 409)

  // Flood protection: max 3 pending purchases per user at a time
  const pendingCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM share_purchases WHERE user_id = ? AND status = 'pending'`
  ).bind(userId).first<{ cnt: number }>()
  if ((pendingCount?.cnt ?? 0) >= 3) {
    return err(c, 'আপনার ৩টি অনুরোধ এখনো অপেক্ষমাণ আছে। অনুমোদনের পরে নতুন অনুরোধ দিন।', 429)
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO share_purchases (user_id, project_id, quantity, total_amount, bkash_txid)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(userId, project_id, quantity, total_amount, bkash_txid).run()

  if (!result.success) return err(c, 'অনুরোধ জমা দিতে ব্যর্থ হয়েছে', 500)

  return ok(c, {
    message: 'শেয়ার কেনার অনুরোধ জমা হয়েছে। অ্যাডমিন অনুমোদনের পরে শেয়ার যোগ হবে।',
    purchase_id: result.meta.last_row_id,
    total_amount_paisa: total_amount
  }, 201)
})

// GET /api/shares/my — my portfolio
shareRoutes.get('/my', async (c) => {
  const { page, limit, offset } = getPagination(c.req.query())
  const userId = c.get('userId')

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT us.*, p.title, p.share_price, p.status
       FROM user_shares us
       JOIN projects p ON p.id = us.project_id
       WHERE us.user_id = ?
       ORDER BY us.quantity DESC
       LIMIT ? OFFSET ?`
    ).bind(userId, limit, offset).all(),
    c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM user_shares WHERE user_id = ?'
    ).bind(userId).first<{ total: number }>()
  ])

  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})

// GET /api/shares/requests — my purchase requests
shareRoutes.get('/requests', async (c) => {
  const { page, limit, offset } = getPagination(c.req.query())
  const userId = c.get('userId')

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT sp.*, p.title as project_title
       FROM share_purchases sp
       JOIN projects p ON p.id = sp.project_id
       WHERE sp.user_id = ?
       ORDER BY sp.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(userId, limit, offset).all(),
    c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM share_purchases WHERE user_id = ?'
    ).bind(userId).first<{ total: number }>()
  ])

  return ok(c, paginate(rows.results, countRow?.total ?? 0, page, limit))
})
