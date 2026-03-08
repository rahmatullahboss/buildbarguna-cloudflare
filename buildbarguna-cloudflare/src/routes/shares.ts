import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { ok, err, getPagination, paginate } from '../lib/response'
import { safeMultiply } from '../lib/money'
import { generateShareCertificate } from '../lib/pdf/generator'
import type { Bindings, Variables, SharePurchase, Project } from '../types'

export const shareRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

shareRoutes.use('*', authMiddleware)

const buySchema = z.object({
  project_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10_000, 'একসাথে সর্বোচ্চ ১০,০০০ শেয়ার কেনা যাবে'),
  payment_method: z.enum(['bkash', 'manual'], {
    errorMap: () => ({ message: 'বৈধ পেমেন্ট মেথড সিলেক্ট করুন' })
  }),
  bkash_txid: z.string().regex(/^[A-Z0-9]{8,12}$/, 'বৈধ bKash TxID দিন (৮-১২ অক্ষর, বড় হাতে)').optional()
})

// POST /api/shares/buy
shareRoutes.post('/buy', zValidator('json', buySchema), async (c) => {
  const { project_id, quantity, payment_method, bkash_txid } = c.req.valid('json')
  const userId = c.get('userId')

  // Validate bkash_txid is required for bkash payment
  if (payment_method === 'bkash' && !bkash_txid) {
    return err(c, 'bKash পেমেন্টের জন্য TxID প্রয়োজন')
  }

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

  // For bKash: check duplicate TxID
  if (payment_method === 'bkash' && bkash_txid) {
    const dupTx = await c.env.DB.prepare(
      'SELECT id FROM share_purchases WHERE bkash_txid = ?'
    ).bind(bkash_txid).first()
    if (dupTx) return err(c, 'এই bKash TxID ইতিমধ্যে ব্যবহার করা হয়েছে', 409)
  }

  // Flood protection: max 3 pending purchases per user at a time
  const pendingCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM share_purchases WHERE user_id = ? AND status = 'pending'`
  ).bind(userId).first<{ cnt: number }>()
  if ((pendingCount?.cnt ?? 0) >= 3) {
    return err(c, 'আপনার ৩টি অনুরোধ এখনো অপেক্ষমাণ আছে। অনুমোদনের পরে নতুন অনুরোধ দিন।', 429)
  }

  // For manual payments, use unique txid since column has UNIQUE constraint
  const finalTxid = payment_method === 'manual' 
    ? `MANUAL_${userId}_${Date.now()}` 
    : (bkash_txid ?? '')

  const result = await c.env.DB.prepare(
    `INSERT INTO share_purchases (user_id, project_id, quantity, total_amount, bkash_txid, payment_method)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(userId, project_id, quantity, total_amount, finalTxid, payment_method).run()

  if (!result.success) return err(c, 'অনুরোধ জমা দিতে ব্যর্থ হয়েছে', 500)

  const paymentMsg = payment_method === 'bkash' 
    ? 'bKash পেমেন্ট যাচাই করে অনুমোদন করা হবে।'
    : 'ম্যানুয়াল পেমেন্টের জন্য অ্যাডমিন আপনার সাথে যোগাযোগ করবে।'

  return ok(c, {
    message: `শেয়ার কেনার অনুরোধ জমা হয়েছে। ${paymentMsg}`,
    purchase_id: result.meta.last_row_id,
    total_amount_paisa: total_amount,
    payment_method
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
       JOIN projects p ON sp.project_id = p.id
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

// Admin middleware
const adminMiddleware = async (c: any, next: any) => {
  const userRole = c.get('userRole')
  if (userRole !== 'admin') {
    return err(c, 'অননুমোদিত', 403)
  }
  await next()
}

// GET /api/shares/certificate/:purchaseId - Download share certificate
shareRoutes.get('/certificate/:purchaseId', authMiddleware, async (c) => {
  const purchaseId = parseInt(c.req.param('purchaseId'))
  const userId = c.get('userId')
  const userRole = c.get('userRole')

  // Fetch purchase details
  const purchase = await c.env.DB.prepare(
    `SELECT sp.*, p.title as project_title, u.name as user_name, u.phone as user_phone
     FROM share_purchases sp
     JOIN projects p ON sp.project_id = p.id
     JOIN users u ON sp.user_id = u.id
     WHERE sp.id = ?`
  ).bind(purchaseId).first<SharePurchase & { project_title: string; user_name: string; user_phone: string }>()

  if (!purchase) {
    return err(c, 'শেয়ার ক্রয় তথ্য পাওয়া যায়নি', 404)
  }

  // Check access: owner or admin
  if (purchase.user_id !== userId && userRole !== 'admin') {
    return err(c, 'আপনি এই সার্টিফিকেট ডাউনলোড করতে পারবেন না', 403)
  }

  // Check status: only approved purchases can generate certificates
  if (purchase.status !== 'approved') {
    return err(c, 'সার্টিফিকেট শুধুমাত্র অনুমোদিত ক্রয়ের জন্য পাওয়া যাবে', 403)
  }

  try {
    // Try to get logo from static assets first, then R2
    let logoBuffer: ArrayBuffer | undefined
    const origin = new URL(c.req.url).origin
    try {
      const logoRes = await fetch(`${origin}/bbi%20logo.jpg`)
      if (logoRes.ok) logoBuffer = await logoRes.arrayBuffer()
    } catch (_) { /* ignore */ }
    if (!logoBuffer) {
      try {
        if (c.env.FILES) {
          const logoObject = await c.env.FILES.get('assets/bbi-logo.jpg')
          if (logoObject) logoBuffer = await logoObject.arrayBuffer()
        }
      } catch (e) {
        console.warn('Logo not found in R2:', e)
      }
    }

    // Generate certificate ID: BBI-SHARE-YYYY-NNNN
    const year = new Date(purchase.created_at).getFullYear()
    const certId = `BBI-SHARE-${year}-${purchase.id.toString().padStart(4, '0')}`

    // Generate PDF certificate
    const pdfBuffer = await generateShareCertificate(
      {
        certificate_id: certId,
        project_name: purchase.project_title,
        share_quantity: purchase.quantity,
        total_amount_paisa: purchase.total_amount,
        purchase_date: purchase.created_at,
        user_name: purchase.user_name,
        user_phone: purchase.user_phone,
        payment_method: purchase.payment_method
      },
      logoBuffer,
      origin
    )

    // Return PDF as binary response
    return c.body(pdfBuffer.buffer as ArrayBuffer, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="BBI_Share_Certificate_${certId}.pdf"`
    })
  } catch (error: any) {
    console.error('Share certificate generation error:', error)
    return err(c, 'সার্টিফিকেট তৈরি করা যায়নি। আবার চেষ্টা করুন।', 500)
  }
})

// GET /api/shares/certificate/:purchaseId/preview - Preview share certificate
shareRoutes.get('/certificate/:purchaseId/preview', authMiddleware, async (c) => {
  const purchaseId = parseInt(c.req.param('purchaseId'))
  const userId = c.get('userId')
  const userRole = c.get('userRole')

  // Fetch purchase details
  const purchase = await c.env.DB.prepare(
    `SELECT sp.*, p.title as project_title, u.name as user_name, u.phone as user_phone
     FROM share_purchases sp
     JOIN projects p ON sp.project_id = p.id
     JOIN users u ON sp.user_id = u.id
     WHERE sp.id = ?`
  ).bind(purchaseId).first<SharePurchase & { project_title: string; user_name: string; user_phone: string }>()

  if (!purchase) {
    return err(c, 'শেয়ার ক্রয় তথ্য পাওয়া যায়নি', 404)
  }

  // Check access: owner or admin
  if (purchase.user_id !== userId && userRole !== 'admin') {
    return err(c, 'আপনি এই সার্টিফিকেট দেখতে পারবেন না', 403)
  }

  // Check status: only approved purchases can preview certificates
  if (purchase.status !== 'approved') {
    return err(c, 'সার্টিফিকেট প্রিভিউ শুধুমাত্র অনুমোদিত ক্রয়ের জন্য পাওয়া যাবে', 403)
  }

  try {
    // Try to get logo from static assets first, then R2
    let logoBuffer: ArrayBuffer | undefined
    const origin = new URL(c.req.url).origin
    try {
      const logoRes = await fetch(`${origin}/bbi%20logo.jpg`)
      if (logoRes.ok) logoBuffer = await logoRes.arrayBuffer()
    } catch (_) { /* ignore */ }
    if (!logoBuffer) {
      try {
        if (c.env.FILES) {
          const logoObject = await c.env.FILES.get('assets/bbi-logo.jpg')
          if (logoObject) logoBuffer = await logoObject.arrayBuffer()
        }
      } catch (e) {
        console.warn('Logo not found in R2:', e)
      }
    }

    // Generate certificate ID
    const year = new Date(purchase.created_at).getFullYear()
    const certId = `BBI-SHARE-${year}-${purchase.id.toString().padStart(4, '0')}`

    // Generate PDF certificate
    const pdfBuffer = await generateShareCertificate(
      {
        certificate_id: certId,
        project_name: purchase.project_title,
        share_quantity: purchase.quantity,
        total_amount_paisa: purchase.total_amount,
        purchase_date: purchase.created_at,
        user_name: purchase.user_name,
        user_phone: purchase.user_phone,
        payment_method: purchase.payment_method
      },
      logoBuffer,
      origin
    )

    // Return PDF as inline response for preview
    return c.body(pdfBuffer.buffer as ArrayBuffer, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="BBI_Share_Certificate_${certId}.pdf"`
    })
  } catch (error: any) {
    console.error('Share certificate preview error:', error)
    return err(c, 'সার্টিফিকেট প্রিভিউ করা যায়নি। আবার চেষ্টা করুন।', 500)
  }
})
