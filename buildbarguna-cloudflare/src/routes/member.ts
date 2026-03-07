import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { ok, err } from '../lib/response'
import { toPaisa } from '../lib/money'
import { generateMemberCertificate } from '../lib/pdf/generator'
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

// Admin middleware
const adminMiddleware = async (c: any, next: any) => {
  const userRole = c.get('userRole')
  if (userRole !== 'admin') {
    return err(c, 'অননুমোদিত', 403)
  }
  await next()
}

// Helper function to log audit events
async function logAuditEvent(
  c: any,
  actionType: string,
  targetUserId: number | null,
  targetRegistrationId: number | null,
  formNumber: string | null,
  metadata: Record<string, any> = {}
) {
  try {
    const userId = c.get('userId')
    const userAgent = c.req.header('user-agent') || null
    // Get IP from CF headers
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null

    await c.env.DB.prepare(
      `INSERT INTO member_audit_log (action_type, user_id, target_user_id, target_registration_id, form_number, metadata, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      actionType,
      userId || null,
      targetUserId,
      targetRegistrationId,
      formNumber,
      JSON.stringify(metadata),
      ip,
      userAgent
    ).run()
  } catch (error) {
    console.error('Failed to log audit event:', error)
  }
}

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

    // Get registration details for audit log
    const registration = await c.env.DB.prepare(
      'SELECT user_id, form_number FROM member_registrations WHERE id = ?'
    ).bind(memberId).first()

    if (body.action === 'approve') {
      await c.env.DB.prepare(
        `UPDATE member_registrations
         SET payment_status = 'verified', verified_by = ?, verified_at = datetime('now'), payment_note = ?
         WHERE id = ?`
      ).bind(adminId, body.note || null, memberId).run()

      // Log audit event
      await logAuditEvent(
        c,
        'payment_verified',
        registration?.user_id || null,
        memberId,
        registration?.form_number || null,
        { admin_id: adminId, note: body.note || null }
      )

      return ok(c, { message: 'মেম্বারশিপ ফি যাচাই করা হয়েছে' })
    } else {
      await c.env.DB.prepare(
        `UPDATE member_registrations
         SET payment_status = 'rejected', payment_note = ?
         WHERE id = ?`
      ).bind(body.note || null, memberId).run()

      // Log audit event
      await logAuditEvent(
        c,
        'payment_rejected',
        registration?.user_id || null,
        memberId,
        registration?.form_number || null,
        { admin_id: adminId, note: body.note || null }
      )

      return ok(c, { message: 'মেম্বারশিপ ফি প্রত্যাখ্যাত হয়েছে' })
    }
  }
)

// GET /api/member/certificate/:formNumber - Download membership certificate
// Issue: 3.1 - Certificate download endpoint missing
memberRoutes.get('/certificate/:formNumber', authMiddleware, async (c) => {
  const formNumber = c.req.param('formNumber')
  const userId = c.get('userId')
  const userRole = c.get('userRole')

  // Fetch registration data
  const registration = await c.env.DB.prepare(
    `SELECT mr.*, u.id as user_id
     FROM member_registrations mr
     JOIN users u ON mr.user_id = u.id
     WHERE mr.form_number = ? AND (mr.user_id = ? OR ? = 'admin')`
  ).bind(formNumber, userId, userRole).first()

  if (!registration) {
    return err(c, 'সার্টিফিকেট পাওয়া যায়নি', 404)
  }

  // Check payment status - only verified members can download
  if (registration.payment_status !== 'verified') {
    return err(c, 'সার্টিফিকেট ডাউনলোড করতে হলে পেমেন্ট যাচাই হতে হবে', 403)
  }

  try {
    // Try to get logo from R2
    let logoBuffer: ArrayBuffer | undefined
    try {
      const logoObject = await c.env.R2.get('assets/bbi-logo.jpg')
      if (logoObject) {
        logoBuffer = await logoObject.arrayBuffer()
      }
    } catch (e) {
      console.warn('Logo not found in R2, generating certificate without logo:', e)
    }

    // Generate PDF certificate
    const pdfBuffer = await generateMemberCertificate(
      {
        form_number: registration.form_number,
        name_english: registration.name_english,
        name_bangla: registration.name_bangla,
        father_name: registration.father_name,
        mother_name: registration.mother_name,
        date_of_birth: registration.date_of_birth,
        blood_group: registration.blood_group,
        present_address: registration.present_address,
        permanent_address: registration.permanent_address,
        facebook_id: registration.facebook_id,
        mobile_whatsapp: registration.mobile_whatsapp,
        emergency_contact: registration.emergency_contact,
        email: registration.email,
        skills_interests: registration.skills_interests,
        created_at: registration.created_at
      },
      logoBuffer
    )

    // Log audit event for certificate download
    await logAuditEvent(
      c,
      'certificate_downloaded',
      registration.user_id,
      registration.id,
      formNumber,
      { user_role: userRole }
    )

    // Return PDF as binary response
    return c.body(pdfBuffer, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="BBI_Certificate_${formNumber}.pdf"`
    })
  } catch (error: any) {
    console.error('Certificate generation error:', error)
    return err(c, 'সার্টিফিকেট তৈরি করা যায়নি। আবার চেষ্টা করুন।', 500)
  }
})

// GET /api/member/certificate/:formNumber/preview - Preview certificate (optional feature)
// Issue: 3.7 - Add certificate preview before download
memberRoutes.get('/certificate/:formNumber/preview', authMiddleware, async (c) => {
  const formNumber = c.req.param('formNumber')
  const userId = c.get('userId')
  const userRole = c.get('userRole')

  // Fetch registration data
  const registration = await c.env.DB.prepare(
    `SELECT mr.*, u.id as user_id
     FROM member_registrations mr
     JOIN users u ON mr.user_id = u.id
     WHERE mr.form_number = ? AND (mr.user_id = ? OR ? = 'admin')`
  ).bind(formNumber, userId, userRole).first()

  if (!registration) {
    return err(c, 'সার্টিফিকেট পাওয়া যায়নি', 404)
  }

  // Check payment status
  if (registration.payment_status !== 'verified') {
    return err(c, 'সার্টিফিকেট প্রিভিউ করতে হলে পেমেন্ট যাচাই হতে হবে', 403)
  }

  try {
    // Try to get logo from R2
    let logoBuffer: ArrayBuffer | undefined
    try {
      const logoObject = await c.env.R2.get('assets/bbi-logo.jpg')
      if (logoObject) {
        logoBuffer = await logoObject.arrayBuffer()
      }
    } catch (e) {
      console.warn('Logo not found in R2, generating certificate without logo:', e)
    }

    // Generate PDF certificate
    const pdfBuffer = await generateMemberCertificate(
      {
        form_number: registration.form_number,
        name_english: registration.name_english,
        name_bangla: registration.name_bangla,
        father_name: registration.father_name,
        mother_name: registration.mother_name,
        date_of_birth: registration.date_of_birth,
        blood_group: registration.blood_group,
        present_address: registration.present_address,
        permanent_address: registration.permanent_address,
        facebook_id: registration.facebook_id,
        mobile_whatsapp: registration.mobile_whatsapp,
        emergency_contact: registration.emergency_contact,
        email: registration.email,
        skills_interests: registration.skills_interests,
        created_at: registration.created_at
      },
      logoBuffer
    )

    // Log audit event for certificate preview
    await logAuditEvent(
      c,
      'certificate_previewed',
      registration.user_id,
      registration.id,
      formNumber,
      { user_role: userRole }
    )

    // Return PDF as inline response for preview
    return c.body(pdfBuffer, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="BBI_Certificate_${formNumber}.pdf"`
    })
  } catch (error: any) {
    console.error('Certificate preview error:', error)
    return err(c, 'সার্টিফিকেট প্রিভিউ করা যায়নি। আবার চেষ্টা করুন।', 500)
  }
})

// POST /api/admin/members/certificates/bulk - Bulk certificate generation
// Issue: 3.8 - Add bulk certificate generation for admins
memberRoutes.post('/admin/certificates/bulk', authMiddleware, adminMiddleware, async (c) => {
  try {
    // Get all verified members without certificates generated (track via metadata)
    const result = await c.env.DB.prepare(
      `SELECT mr.*, u.name as user_name, u.phone as user_phone
       FROM member_registrations mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.payment_status = 'verified'
       ORDER BY mr.verified_at DESC`
    ).all()

    if (!result.results || result.results.length === 0) {
      return ok(c, { message: 'কোনো যাচাইকৃত মেম্বার নেই', count: 0 })
    }

    const generatedCertificates: Array<{ form_number: string; user_name: string }> = []
    let logoBuffer: ArrayBuffer | undefined

    // Try to get logo once
    try {
      const logoObject = await c.env.R2.get('assets/bbi-logo.jpg')
      if (logoObject) {
        logoBuffer = await logoObject.arrayBuffer()
      }
    } catch (e) {
      console.warn('Logo not found in R2, generating certificates without logo:', e)
    }

    // Generate certificates for all verified members
    for (const registration of result.results) {
      try {
        const pdfBuffer = await generateMemberCertificate(
          {
            form_number: registration.form_number,
            name_english: registration.name_english,
            name_bangla: registration.name_bangla,
            father_name: registration.father_name,
            mother_name: registration.mother_name,
            date_of_birth: registration.date_of_birth,
            blood_group: registration.blood_group,
            present_address: registration.present_address,
            permanent_address: registration.permanent_address,
            facebook_id: registration.facebook_id,
            mobile_whatsapp: registration.mobile_whatsapp,
            emergency_contact: registration.emergency_contact,
            email: registration.email,
            skills_interests: registration.skills_interests,
            created_at: registration.created_at
          },
          logoBuffer
        )

        // Store certificate in R2
        const r2Key = `certificates/${registration.form_number}.pdf`
        await c.env.R2.put(r2Key, pdfBuffer, {
          httpMetadata: { contentType: 'application/pdf' }
        })

        generatedCertificates.push({
          form_number: registration.form_number,
          user_name: registration.user_name
        })
      } catch (error) {
        console.error(`Failed to generate certificate for ${registration.form_number}:`, error)
      }
    }

    // Log audit event for bulk generation
    await logAuditEvent(
      c,
      'bulk_certificates_generated',
      null,
      null,
      null,
      {
        total_count: result.results.length,
        generated_count: generatedCertificates.length,
        certificates: generatedCertificates.map(c => c.form_number)
      }
    )

    return ok(c, {
      message: `বাল্ক সার্টিফিকেট তৈরি সম্পন্ন হয়েছে`,
      total_count: result.results.length,
      generated_count: generatedCertificates.length,
      certificates: generatedCertificates
    })
  } catch (error: any) {
    console.error('Bulk certificate generation error:', error)
    return err(c, 'বাল্ক সার্টিফিকেট তৈরি করা যায়নি। আবার চেষ্টা করুন।', 500)
  }
})

// GET /api/admin/members/list - Get all member registrations (admin)
memberRoutes.get('/admin/list', authMiddleware, adminMiddleware, async (c) => {
  const status = c.req.query('status') || 'all'
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  let query: string
  let countQuery: string

  if (status === 'all') {
    query = `SELECT mr.*, u.name as user_name, u.phone as user_phone, admin.name as verified_by_name
             FROM member_registrations mr
             JOIN users u ON mr.user_id = u.id
             LEFT JOIN users admin ON mr.verified_by = admin.id
             ORDER BY mr.created_at DESC LIMIT ? OFFSET ?`
    countQuery = `SELECT COUNT(*) as count FROM member_registrations`
  } else {
    query = `SELECT mr.*, u.name as user_name, u.phone as user_phone, admin.name as verified_by_name
             FROM member_registrations mr
             JOIN users u ON mr.user_id = u.id
             LEFT JOIN users admin ON mr.verified_by = admin.id
             WHERE mr.payment_status = ?
             ORDER BY mr.created_at DESC LIMIT ? OFFSET ?`
    countQuery = `SELECT COUNT(*) as count FROM member_registrations WHERE payment_status = ?`
  }

  const [results, countResult] = status === 'all'
    ? await Promise.all([
        c.env.DB.prepare(query).bind(limit, offset).all(),
        c.env.DB.prepare(countQuery).first<{ count: number }>()
      ])
    : await Promise.all([
        c.env.DB.prepare(query).bind(status, limit, offset).all(),
        c.env.DB.prepare(countQuery).bind(status).first<{ count: number }>()
      ])

  return ok(c, {
    members: results.results,
    pagination: {
      page,
      limit,
      total: countResult?.count || 0,
      hasMore: (page * limit) < (countResult?.count || 0)
    }
  })
})
