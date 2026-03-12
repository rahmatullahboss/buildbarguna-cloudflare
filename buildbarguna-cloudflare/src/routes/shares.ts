import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { ok, err, getPagination, paginate } from '../lib/response'
import { safeMultiply } from '../lib/money'
import { generateShareCertificate, generateCertificateId } from '../lib/pdf/generator'
import { generateShareCertificatePDF } from '../lib/pdf/api-generator'
import type { Bindings, Variables, Project, SharePurchase } from '../types'

export const shareRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

shareRoutes.use('*', authMiddleware)

const buySchema = z.object({
  project_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10_000, 'একসাথে সর্বোচ্চ ১০,০০০ শেয়ার কেনা যাবে'),
  payment_method: z.enum(['bkash', 'manual'], {
    errorMap: () => ({ message: 'বৈধ পেমেন্ট মেথড সিলেক্ট করুন' })
  }),
  bkash_txid: z.string().regex(/^[A-Z0-9]{8,12}$/, 'বৈধ bKash TxID দিন (৮-১২ অক্ষর, বড় হাতে)').optional(),
  idempotency_key: z.string().optional() // Optional idempotency key for network retry protection
})

// POST /api/shares/buy
shareRoutes.post('/buy', zValidator('json', buySchema), async (c) => {
  const { project_id, quantity, payment_method, bkash_txid, idempotency_key } = c.req.valid('json')
  const userId = c.get('userId')

  // Check idempotency key if provided
  if (idempotency_key) {
    const existing = await c.env.DB.prepare(
      'SELECT id, status FROM share_purchases WHERE user_id = ? AND idempotency_key = ?'
    ).bind(userId, idempotency_key).first<{ id: number; status: string }>()
    
    if (existing) {
      // Return original response for duplicate request
      return ok(c, {
        message: 'অনুরোধ ইতিমধ্যে জমা হয়েছে',
        purchase_id: existing.id,
        status: existing.status,
        idempotent: true
      })
    }
  }

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

  // CRITICAL FIX: Atomic check-and-insert to prevent race condition
  // Use a transaction-like approach with WHERE clause to ensure availability
  const insertResult = await c.env.DB.prepare(
    `INSERT INTO share_purchases (user_id, project_id, quantity, total_amount, bkash_txid, payment_method, idempotency_key)
     SELECT ?, ?, ?, ?, ?, ?, ?
     WHERE (? <= (
       SELECT p.total_shares - COALESCE((SELECT SUM(us.quantity) FROM user_shares us WHERE us.project_id = p.id AND p.id = ?), 0)
       FROM projects p WHERE p.id = ? AND p.status = 'active'
     ))`
  ).bind(userId, project_id, quantity, total_amount, finalTxid, payment_method, idempotency_key ?? null, quantity, project_id, project_id).run()

  // Check if insert succeeded (WHERE clause failed = no rows inserted = insufficient shares)
  if (!insertResult.success || insertResult.meta.changes === 0) {
    // Re-check to give user accurate message
    const projectCheck = await c.env.DB.prepare(
      `SELECT p.total_shares - COALESCE((SELECT SUM(us.quantity) FROM user_shares us WHERE us.project_id = p.id), 0) as available
       FROM projects p WHERE p.id = ?`
    ).bind(project_id).first<{ available: number }>()
    
    const available = projectCheck?.available ?? 0
    return err(c, `দুঃখিত! ইতিমধ্যে অন্য কেউ শেয়ার কিনে নিয়েছে। এখন মাত্র ${available}টি শেয়ার উপলব্ধ।`, 409)
  }

  const purchaseId = insertResult.meta.last_row_id

  const paymentMsg = payment_method === 'bkash' 
    ? 'bKash পেমেন্ট যাচাই করে অনুমোদন করা হবে।'
    : 'ম্যানুয়াল পেমেন্টের জন্য অ্যাডমিন আপনার সাথে যোগাযোগ করবে।'

  return ok(c, {
    message: `শেয়ার কেনার অনুরোধ জমা হয়েছে। ${paymentMsg}`,
    purchase_id: purchaseId,
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

// GET /api/shares/certificate/:purchase_id - Download share certificate
shareRoutes.get('/certificate/:purchase_id', async (c) => {
  const purchaseIdStr = c.req.param('purchase_id')
  const userId = c.get('userId')
  const userRole = c.get('userRole')

  // Input validation: purchase_id must be positive integer
  const purchaseId = parseInt(purchaseIdStr, 10)
  if (isNaN(purchaseId) || purchaseId <= 0 || purchaseIdStr !== purchaseId.toString()) {
    return err(c, 'Invalid purchase ID', 400)
  }

  try {
    // Fetch purchase with project and user details
    const purchase = await c.env.DB.prepare(
      `SELECT sp.*, p.title as project_name, u.name as user_name, u.phone as user_phone
       FROM share_purchases sp
       JOIN projects p ON p.id = sp.project_id
       JOIN users u ON u.id = sp.user_id
       WHERE sp.id = ?`
    ).bind(purchaseId).first<SharePurchase & { project_name: string; user_name: string; user_phone: string }>()

    if (!purchase) {
      return err(c, 'Purchase not found', 404)
    }

    // Authorization check: user can only download own certificates, admin can download any
    if (userRole !== 'admin' && purchase.user_id !== userId) {
      return err(c, 'Access denied', 403)
    }

    // Only approved purchases can generate certificates
    if (purchase.status !== 'approved') {
      return err(c, 'Certificate only available for approved purchases', 403)
    }

    // Generate certificate ID if not already set (use purchase ID as sequence for simplicity)
    const certificateId = generateCertificateId(new Date(purchase.created_at).getFullYear(), purchase.id)

    // Generate PDF certificate - use external API if key is configured
    let pdfBytes: Uint8Array
    
    if (c.env.PDF_API_KEY) {
      // Use external PDF API (recommended - avoids CPU limits)
      pdfBytes = await generateShareCertificatePDF(
        {
          certificate_id: certificateId,
          project_name: purchase.project_name,
          share_quantity: purchase.quantity,
          total_amount_paisa: purchase.total_amount,
          purchase_date: purchase.created_at,
          user_name: purchase.user_name,
          user_phone: purchase.user_phone,
          payment_method: purchase.payment_method,
          form_number: undefined
        },
        { PDF_API_KEY: c.env.PDF_API_KEY },
        c.req.header('origin')
      )
    } else {
      // Fallback to local pdf-lib generation
      pdfBytes = await generateShareCertificate(
        {
          certificate_id: certificateId,
          project_name: purchase.project_name,
          share_quantity: purchase.quantity,
          total_amount_paisa: purchase.total_amount,
          purchase_date: purchase.created_at,
          user_name: purchase.user_name,
          user_phone: purchase.user_phone,
          payment_method: purchase.payment_method,
          form_number: undefined
        },
        undefined, // logoBuffer - will be fetched from dist
        c.req.header('origin')
      )
    }

    // Set proper headers for PDF download
    c.header('Content-Type', 'application/pdf')
    c.header('Content-Disposition', `attachment; filename="BBI_Share_Certificate_${certificateId}.pdf"`)
    c.header('Content-Length', pdfBytes.length.toString())
    c.header('X-Content-Type-Options', 'nosniff')

    // Log certificate generation for audit trail
    console.log(`[CERTIFICATE] Generated certificate ${certificateId} for purchase ${purchaseId} by user ${userId}`)

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="BBI_Share_Certificate_${certificateId}.pdf"`
      }
    })
  } catch (error) {
    console.error('[CERTIFICATE] Error generating certificate:', error)
    return err(c, 'Failed to generate certificate', 500)
  }
})

// GET /api/shares/certificate/:purchase_id/preview - Preview certificate metadata
shareRoutes.get('/certificate/:purchase_id/preview', async (c) => {
  const purchaseIdStr = c.req.param('purchase_id')
  const userId = c.get('userId')
  const userRole = c.get('userRole')

  // Input validation: purchase_id must be positive integer
  const purchaseId = parseInt(purchaseIdStr, 10)
  if (isNaN(purchaseId) || purchaseId <= 0 || purchaseIdStr !== purchaseId.toString()) {
    return err(c, 'Invalid purchase ID', 400)
  }

  try {
    // Fetch purchase with project and user details
    const purchase = await c.env.DB.prepare(
      `SELECT sp.*, p.title as project_name, u.name as user_name
       FROM share_purchases sp
       JOIN projects p ON p.id = sp.project_id
       JOIN users u ON u.id = sp.user_id
       WHERE sp.id = ?`
    ).bind(purchaseId).first<SharePurchase & { project_name: string; user_name: string }>()

    if (!purchase) {
      return err(c, 'Purchase not found', 404)
    }

    // Authorization check: same as download
    if (userRole !== 'admin' && purchase.user_id !== userId) {
      return err(c, 'Access denied', 403)
    }

    // Only approved purchases can preview certificates
    if (purchase.status !== 'approved') {
      return err(c, 'Certificate only available for approved purchases', 403)
    }

    // Generate certificate ID for preview
    const certificateId = generateCertificateId(new Date(purchase.created_at).getFullYear(), purchase.id)

    return ok(c, {
      certificate_id: certificateId,
      project_name: purchase.project_name,
      share_quantity: purchase.quantity,
      total_amount_paisa: purchase.total_amount,
      purchase_date: purchase.created_at,
      user_name: purchase.user_name
    })
  } catch (error) {
    console.error('[CERTIFICATE] Error fetching preview:', error)
    return err(c, 'Failed to fetch certificate preview', 500)
  }
})

