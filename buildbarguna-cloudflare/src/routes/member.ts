import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { ok, err } from '../lib/response'
import { toPaisa } from '../lib/money'
import type { Bindings, Variables } from '../types'

export const memberRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Validation schemas
const registerSchema = z.object({
  name_english: z.string().min(2),
  name_bangla: z.string().optional(),
  father_name: z.string().min(2),
  mother_name: z.string().min(2),
  date_of_birth: z.string(),
  blood_group: z.string().optional(),
  present_address: z.string().min(5),
  permanent_address: z.string().min(5),
  facebook_id: z.string().optional(),
  mobile_whatsapp: z.string().min(10),
  emergency_contact: z.string().optional(),
  email: z.string().email().optional(),
  skills_interests: z.string().optional(),
  declaration_accepted: z.boolean().refine(v => v === true, 'Declaration must be accepted'),
  payment_method: z.enum(['bkash', 'cash']),
  bkash_number: z.string().regex(/^01[3-9]\d{8}$/, 'Invalid bKash number').optional(),
  bkash_trx_id: z.string().optional(),
  payment_note: z.string().optional()
})

// Middleware: Check if user already registered
const checkAlreadyRegistered = async (c: any, next: any) => {
  const userId = c.get('userId')
  const existing = await c.env.DB.prepare(
    'SELECT id, form_number FROM member_registrations WHERE user_id = ?'
  ).bind(userId).first()
  
  if (existing) {
    return ok(c, { 
      registered: true, 
      form_number: existing.form_number,
      message: 'আপনি ইতিমধ্যে রেজিস্টার্ড হয়েছেন'
    })
  }
  await next()
}

// GET /api/member/status - Check registration status
memberRoutes.get('/status', authMiddleware, async (c) => {
  const userId = c.get('userId')
  
  const registration = await c.env.DB.prepare(
    `SELECT form_number, payment_status, payment_method 
     FROM member_registrations 
     WHERE user_id = ?`
  ).bind(userId).first()
  
  if (!registration) {
    return ok(c, { registered: false })
  }
  
  return ok(c, { 
    registered: true, 
    form_number: registration.form_number,
    payment_status: registration.payment_status,
    payment_method: registration.payment_method
  })
})

// POST /api/member/register - Submit registration with payment
memberRoutes.post('/register', 
  authMiddleware, 
  checkAlreadyRegistered,
  zValidator('json', registerSchema), 
  async (c) => {
    const userId = c.get('userId')
    const body = c.req.valid('json')
    
    // Generate form number: BBI-YYYY-NNNN
    const year = new Date().getFullYear()
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM member_registrations WHERE form_number LIKE ?`
    ).bind(`BBI-${year}-%`).first<{ count: number }>()
    
    const nextNumber = ((countResult?.count || 0) + 1).toString().padStart(4, '0')
    const formNumber = `BBI-${year}-${nextNumber}`
    
    // Determine payment status - ALL payments need admin verification
    const paymentStatus = 'paid'  // Mark as paid, but needs admin verification
    
    try {
      const result = await c.env.DB.prepare(
        `INSERT INTO member_registrations (
          form_number, name_english, name_bangla, father_name, mother_name,
          date_of_birth, blood_group, present_address, permanent_address,
          facebook_id, mobile_whatsapp, emergency_contact, email,
          skills_interests, declaration_accepted, user_id,
          payment_method, payment_amount, bkash_number, bkash_trx_id, payment_note, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        formNumber,
        body.name_english,
        body.name_bangla || null,
        body.father_name,
        body.mother_name,
        body.date_of_birth,
        body.blood_group || null,
        body.present_address,
        body.permanent_address,
        body.facebook_id || null,
        body.mobile_whatsapp,
        body.emergency_contact || null,
        body.email || null,
        body.skills_interests || null,
        body.declaration_accepted ? 1 : 0,
        userId,
        body.payment_method,
        toPaisa(100),  // ৳100 membership fee
        body.bkash_number || null,
        body.bkash_trx_id || null,
        body.payment_note || null,
        paymentStatus
      ).run()
      
      return ok(c, {
        message: 'রেজিস্ট্রেশন সফল হয়েছে',
        form_number: formNumber,
        payment_status: paymentStatus,
        payment_amount: 100,
        next_step: 'অ্যাডমিন যাচাই করার পর মেম্বারশিপ সার্টিফিকেট ডাউনলোড করতে পারবেন'
      })
    } catch (error: any) {
      console.error('Member registration error:', error)
      return err(c, 'রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।', 500)
    }
  }
)

// Admin routes for member payment verification
const adminMiddleware = async (c: any, next: any) => {
  const userRole = c.get('userRole')
  if (userRole !== 'admin') {
    return err(c, 'অননুমোদিত', 403)
  }
  await next()
}

// GET /api/admin/members/payments - Get pending payment verifications
memberRoutes.get('/admin/payments', authMiddleware, adminMiddleware, async (c) => {
  const status = c.req.query('status') || 'pending'
  
  const payments = await c.env.DB.prepare(
    `SELECT * FROM v_member_payments_${status === 'verified' ? 'verified' : 'pending'}`
  ).all()
  
  return ok(c, payments.results)
})

// POST /api/admin/members/:id/verify - Verify member payment
memberRoutes.post('/admin/members/:id/verify', 
  authMiddleware, 
  adminMiddleware,
  zValidator('json', z.object({
    action: z.enum(['approve', 'reject']),
    note: z.string().optional()
  })), 
  async (c) => {
    const memberId = parseInt(c.req.param('id'))
    const body = c.req.valid('json')
    const adminId = c.get('userId')
    
    if (body.action === 'approve') {
      await c.env.DB.prepare(
        `UPDATE member_registrations 
         SET payment_status = 'verified', verified_by = ?, verified_at = datetime('now'), payment_note = ?
         WHERE id = ?`
      ).bind(adminId, body.note || null, memberId).run()
      
      return ok(c, { message: 'মেম্বারশিপ ফি যাচাই করা হয়েছে' })
    } else {
      await c.env.DB.prepare(
        `UPDATE member_registrations 
         SET payment_status = 'rejected', payment_note = ?
         WHERE id = ?`
      ).bind(body.note || null, memberId).run()
      
      return ok(c, { message: 'মেম্বারশিপ ফি প্রত্যাখ্যাত হয়েছে' })
    }
  }
)
