import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err } from '../lib/response'
import { toPaisa } from '../lib/money'
import { generateMemberCertificate } from '../lib/pdf/generator'
import { generateMemberCertificatePDF } from '../lib/pdf/api-generator'
import type { Bindings, Variables } from '../types'

// Custom Zod validation hook that returns user-friendly error messages
function zodErrorHook(result: any, c: any) {
  if (!result.success) {
    const issues = result.error.issues
    const messages = issues.map((issue: any) => {
      // Map field names to Bengali
      const fieldNames: Record<string, string> = {
        name_english: 'নাম (ইংরেজি)',
        name_bangla: 'নাম (বাংলা)',
        father_name: 'পিতার নাম',
        mother_name: 'মাতার নাম',
        date_of_birth: 'জন্ম তারিখ',
        blood_group: 'রক্তের গ্রুপ',
        present_address: 'বর্তমান ঠিকানা',
        permanent_address: 'স্থায়ী ঠিকানা',
        facebook_id: 'Facebook ID',
        mobile_whatsapp: 'মোবাইল (WhatsApp)',
        emergency_contact: 'জরুরি যোগাযোগ',
        email: 'ইমেইল',
        skills_interests: 'দক্ষতা ও আগ্রহ',
        declaration_accepted: 'ঘোষণা',
        payment_method: 'পেমেন্ট পদ্ধতি',
        bkash_number: 'bKash নাম্বার',
        bkash_trx_id: 'bKash ট্রানজেকশন আইডি',
        payment_note: 'পেমেন্ট নোট'
      }
      
      const field = issue.path?.join('.') || ''
      const fieldName = fieldNames[field] || field
      
      // Translate common validation messages
      let message = issue.message
      if (issue.code === 'too_small' && issue.minimum === 2) {
        message = `${fieldName} কমপক্ষে ২ অক্ষর হতে হবে`
      } else if (issue.code === 'too_small' && issue.minimum === 5) {
        message = `${fieldName} কমপক্ষে ৫ অক্ষর হতে হবে`
      } else if (issue.code === 'too_small' && issue.minimum === 10) {
        message = `${fieldName} কমপক্ষে ১০ অক্ষর হতে হবে`
      } else if (issue.code === 'invalid_string' && issue.validation === 'email') {
        message = 'সঠিক ইমেইল দিন'
      } else if (issue.code === 'invalid_string' && issue.validation === 'regex') {
        if (field === 'bkash_number') {
          message = 'সঠিক bKash নাম্বার দিন (০১XXXXXXXXX)'
        } else {
          message = `${fieldName} সঠিক ফরম্যাটে দিন`
        }
      } else if (issue.message === 'Declaration must be accepted') {
        message = 'আপনাকে ঘোষণা অনুমোদন করতে হবে'
      } else if (field && message) {
        message = `${fieldName}: ${message}`
      }
      
      return message
    })
    
    return c.json({ success: false, error: messages[0] || 'Invalid input' }, 400)
  }
}

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
  email: z.string().email().optional().or(z.literal('')), // Allow empty string for optional email
  skills_interests: z.string().optional(),
  declaration_accepted: z.boolean().refine(v => v === true, 'Declaration must be accepted'),
  payment_method: z.enum(['bkash', 'cash']),
  bkash_number: z.string().optional().refine(
    (val) => !val || /^01[3-9]\d{8}$/.test(val),
    'Invalid bKash number'
  ),
  bkash_trx_id: z.string().optional(),
  payment_note: z.string().optional()
})

// FIX (C5): Removed weak local adminMiddleware — using imported DB-verified version from middleware/admin.ts

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
    // Silently fail - don't break the main flow
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

// GET /api/member/my-registration - Get current user's full registration details
memberRoutes.get('/my-registration', authMiddleware, async (c) => {
  const userId = c.get('userId')
  
  const registration = await c.env.DB.prepare(
    `SELECT mr.*, u.name as user_name, u.phone as user_phone, 
            admin.name as verified_by_name
     FROM member_registrations mr
     JOIN users u ON mr.user_id = u.id
     LEFT JOIN users admin ON mr.verified_by = admin.id
     WHERE mr.user_id = ?`
  ).bind(userId).first()
  
  if (!registration) {
    return ok(c, { registered: false })
  }
  
  return ok(c, { 
    registered: true,
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
    payment_status: registration.payment_status,
    payment_method: registration.payment_method,
    payment_amount: registration.payment_amount,
    payment_note: registration.payment_note,
    created_at: registration.created_at,
    verified_at: registration.verified_at,
    verified_by_name: registration.verified_by_name
  })
})

// Helper: Generate unique form number using row count for guaranteed sequence
async function generateFormNumber(db: any): Promise<string> {
  const year = new Date().getFullYear()

  // Count total registrations to determine next sequence number
  // Use COUNT(*) + 1 as the next seq — simple and collision-safe for low-volume inserts
  const result = await db.prepare(
    `SELECT COUNT(*) as total FROM member_registrations`
  ).first() as { total: number } | null

  const nextSeq = (result?.total ?? 0) + 1

  // Pad to 4 digits minimum, expand if needed (e.g. 10000 → 5 digits)
  const formNumber = `BBI-${year}-${nextSeq.toString().padStart(4, '0')}`

  // Safety check: if somehow this form number already exists (edge case),
  // keep incrementing until we find a free slot
  let candidate = formNumber
  let seq = nextSeq
  while (true) {
    const exists = await db.prepare(
      'SELECT 1 FROM member_registrations WHERE form_number = ?'
    ).bind(candidate).first()
    if (!exists) return candidate
    seq++
    candidate = `BBI-${year}-${seq.toString().padStart(4, '0')}`
  }
}

// POST /api/member/register - Submit registration with payment
memberRoutes.post('/register', 
  authMiddleware, 
  checkAlreadyRegistered,
  zValidator('json', registerSchema, zodErrorHook), 
  async (c) => {
    const userId = c.get('userId')
    const body = c.req.valid('json')
    
    // Generate unique form number with retry logic
    const formNumber = await generateFormNumber(c.env.DB)
    
    // Determine payment status - new registrations need admin verification
    const paymentStatus = 'pending'
    
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

      // Log audit event for registration submission
      await logAuditEvent(
        c,
        'registration_submitted',
        userId,
        null,
        formNumber,
        { payment_method: body.payment_method, bkash_number: body.bkash_number || null }
      )

      return ok(c, {
        message: 'রেজিস্ট্রেশন সফল হয়েছে। পেমেন্ট যাচাইয়ের অপেক্ষায় আছে।',
        form_number: formNumber,
        payment_status: paymentStatus,
        payment_amount: 100,
        next_step: 'অ্যাডমিন পেমেন্ট যাচাই করার পর সার্টিফিকেট ডাউনলোড করতে পারবেন'
      })
    } catch (error: any) {
      console.error('Member registration error:', error)
      
      // Check for UNIQUE constraint error
      if (error?.message?.includes('UNIQUE constraint failed') || 
          error?.message?.includes('SQLITE_CONSTRAINT_UNIQUE')) {
        return err(c, 'দুঃখিত, একটি টেকনিক্যাল সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।', 500)
      }
      
      return err(c, 'রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।', 500)
    }
  }
)

// Admin routes for member payment verification
// GET /api/admin/members/payments - Get pending payment verifications
memberRoutes.get('/admin/payments', authMiddleware, adminMiddleware, async (c) => {
  const status = c.req.query('status') || 'pending'
  
  // FIX (H4): Avoid string interpolation in SQL — use separate hardcoded queries
  let payments
  if (status === 'verified') {
    payments = await c.env.DB.prepare('SELECT * FROM v_member_payments_verified').all()
  } else {
    payments = await c.env.DB.prepare('SELECT * FROM v_member_payments_pending').all()
  }
  
  return ok(c, payments.results)
})

// POST /api/admin/members/:id/verify - Verify member payment
memberRoutes.post('/admin/members/:id/verify',
  authMiddleware,
  adminMiddleware,
  zValidator('json', z.object({
    action: z.enum(['approve', 'reject']),
    note: z.string().optional()
  }), zodErrorHook),
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
        (registration?.user_id as number | null) ?? null,
        memberId,
        (registration?.form_number as string | null) ?? null,
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
        (registration?.user_id as number | null) ?? null,
        memberId,
        (registration?.form_number as string | null) ?? null,
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
    // Try to get logo from static assets (via request origin) then R2
    let logoBuffer: ArrayBuffer | undefined
    try {
      // First try: self-fetch from the worker's static assets (bbi logo.jpg is in dist/)
      const origin = new URL(c.req.url).origin
      const logoRes = await fetch(`${origin}/bbi%20logo.jpg`)
      if (logoRes.ok) {
        logoBuffer = await logoRes.arrayBuffer()
      }
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

    // Generate PDF certificate - use external API if key is configured, otherwise use local
    let pdfBuffer: Uint8Array
    
    if (c.env.PDF_API_KEY) {
      // Use external PDF API (recommended - avoids CPU limits)
      pdfBuffer = await generateMemberCertificatePDF(
        {
          form_number: registration.form_number as string,
          name_english: registration.name_english as string,
          name_bangla: registration.name_bangla as string | undefined,
          father_name: registration.father_name as string,
          mother_name: registration.mother_name as string,
          date_of_birth: registration.date_of_birth as string,
          blood_group: registration.blood_group as string | undefined,
          present_address: registration.present_address as string,
          permanent_address: registration.permanent_address as string,
          facebook_id: registration.facebook_id as string | undefined,
          mobile_whatsapp: registration.mobile_whatsapp as string,
          emergency_contact: registration.emergency_contact as string | undefined,
          email: registration.email as string | undefined,
          skills_interests: registration.skills_interests as string | undefined,
          created_at: registration.created_at as string,
          verified_at: registration.verified_at as string | undefined
        },
        { PDF_API_KEY: c.env.PDF_API_KEY },
        new URL(c.req.url).origin
      )
    } else {
      // Fallback to local pdf-lib generation
      pdfBuffer = await generateMemberCertificate(
        {
          form_number: registration.form_number as string,
          name_english: registration.name_english as string,
          name_bangla: registration.name_bangla as string | undefined,
          father_name: registration.father_name as string,
          mother_name: registration.mother_name as string,
          date_of_birth: registration.date_of_birth as string,
          blood_group: registration.blood_group as string | undefined,
          present_address: registration.present_address as string,
          permanent_address: registration.permanent_address as string,
          facebook_id: registration.facebook_id as string | undefined,
          mobile_whatsapp: registration.mobile_whatsapp as string,
          emergency_contact: registration.emergency_contact as string | undefined,
          email: registration.email as string | undefined,
          skills_interests: registration.skills_interests as string | undefined,
          created_at: registration.created_at as string
        },
        logoBuffer,
        new URL(c.req.url).origin
      )
    }

    // Log audit event for certificate download
    await logAuditEvent(
      c,
      'certificate_downloaded',
      registration.user_id as number | null,
      registration.id as number | null,
      formNumber,
      { user_role: userRole }
    )

    // Return PDF as binary response — convert Uint8Array to ArrayBuffer for Hono
    return c.body(pdfBuffer.buffer as ArrayBuffer, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="BBI_Certificate_${formNumber}.pdf"`
    })
  } catch (error: any) {
    console.error('Certificate generation error:', error)
    return err(c, 'সার্টিফিকেট তৈরি করা যায়নি। আবার চেষ্টা করুন।', 500)
  }
})

// GET /api/member/certificate/:formNumber/preview - Get certificate data as JSON
// Used by browser-side PDF generation (no server CPU cost)
memberRoutes.get('/certificate/:formNumber/preview', authMiddleware, async (c) => {
  const formNumber = c.req.param('formNumber')
  const userId = c.get('userId')
  const userRole = c.get('userRole')

  // Fetch registration data
  const registration = await c.env.DB.prepare(
    `SELECT mr.*, u.id as user_id, admin.name as verified_by_name
     FROM member_registrations mr
     JOIN users u ON mr.user_id = u.id
     LEFT JOIN users admin ON mr.verified_by = admin.id
     WHERE mr.form_number = ? AND (mr.user_id = ? OR ? = 'admin')`
  ).bind(formNumber, userId, userRole).first()

  if (!registration) {
    return err(c, 'সার্টিফিকেট পাওয়া যায়নি', 404)
  }

  // Check payment status
  if (registration.payment_status !== 'verified') {
    return err(c, 'সার্টিফিকেট প্রিভিউ করতে হলে পেমেন্ট যাচাই হতে হবে', 403)
  }

  // Log audit event for certificate preview
  await logAuditEvent(
    c,
    'certificate_previewed',
    registration.user_id as number | null,
    registration.id as number | null,
    formNumber,
    { user_role: userRole }
  )

  // Return JSON data for browser-side PDF generation
  return ok(c, {
    form_number: registration.form_number as string,
    name_english: registration.name_english as string,
    name_bangla: (registration.name_bangla as string | undefined) || undefined,
    father_name: registration.father_name as string,
    mother_name: registration.mother_name as string,
    date_of_birth: registration.date_of_birth as string,
    blood_group: (registration.blood_group as string | undefined) || undefined,
    present_address: registration.present_address as string,
    permanent_address: registration.permanent_address as string,
    facebook_id: (registration.facebook_id as string | undefined) || undefined,
    mobile_whatsapp: registration.mobile_whatsapp as string,
    emergency_contact: (registration.emergency_contact as string | undefined) || undefined,
    email: (registration.email as string | undefined) || undefined,
    skills_interests: (registration.skills_interests as string | undefined) || undefined,
    created_at: registration.created_at as string,
    verified_at: (registration.verified_at as string | undefined) || undefined,
  })
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
      if (c.env.FILES) { const logoObject = await c.env.FILES.get('assets/bbi-logo.jpg')
      if (logoObject) {
        logoBuffer = await logoObject.arrayBuffer() }
      }
    } catch (e) {
      console.warn('Logo not found in R2, generating certificates without logo:', e)
    }

    // Generate certificates for all verified members
    for (const registration of result.results) {
      try {
        const pdfBuffer = await generateMemberCertificate(
          {
            form_number: registration.form_number as string,
            name_english: registration.name_english as string,
            name_bangla: registration.name_bangla as string | undefined,
            father_name: registration.father_name as string,
            mother_name: registration.mother_name as string,
            date_of_birth: registration.date_of_birth as string,
            blood_group: registration.blood_group as string | undefined,
            present_address: registration.present_address as string,
            permanent_address: registration.permanent_address as string,
            facebook_id: registration.facebook_id as string | undefined,
            mobile_whatsapp: registration.mobile_whatsapp as string,
            emergency_contact: registration.emergency_contact as string | undefined,
            email: registration.email as string | undefined,
            skills_interests: registration.skills_interests as string | undefined,
            created_at: registration.created_at as string
          },
          logoBuffer
        )

        // Generate on-the-fly - do NOT save to R2
        // Each member can download their certificate individually when needed

        generatedCertificates.push({
          form_number: registration.form_number as string,
          user_name: registration.user_name as string
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
  const status = c.req.query('status') || 'all'  // payment_status filter
  const membershipStatus = c.req.query('membership_status') || 'all'  // active/cancelled filter
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  let whereClause = '1=1'
  const params: any[] = []

  // Filter by payment_status (pending, verified, rejected)
  if (status !== 'all') {
    whereClause += ' AND mr.payment_status = ?'
    params.push(status)
  }

  // Filter by membership_status (active, cancelled)
  if (membershipStatus !== 'all') {
    whereClause += ' AND mr.status = ?'
    params.push(membershipStatus)
  }

  const query = `SELECT mr.*, u.name as user_name, u.phone as user_phone, admin.name as verified_by_name,
                 cancelled_admin.name as cancelled_by_name
          FROM member_registrations mr
          JOIN users u ON mr.user_id = u.id
          LEFT JOIN users admin ON mr.verified_by = admin.id
          LEFT JOIN users cancelled_admin ON mr.cancelled_by = cancelled_admin.id
          WHERE ${whereClause}
          ORDER BY mr.created_at DESC LIMIT ? OFFSET ?`

  const countQuery = `SELECT COUNT(*) as count FROM member_registrations mr WHERE ${whereClause}`

  params.push(limit, offset)

  const [results, countResult] = await Promise.all([
    c.env.DB.prepare(query).bind(...params).all(),
    c.env.DB.prepare(countQuery).bind(...params.slice(0, -2)).first<{ count: number }>()
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

// ============================================
// NEW: Member Edit, Cancel, Reapply Endpoints
// ============================================

// PUT /api/member - Update own registration (only if active)
memberRoutes.put('/', authMiddleware, async (c) => {
  const userId = c.get('userId')
  
  // First check if user has a registration and if it's active
  const existing = await c.env.DB.prepare(
    'SELECT id, status, payment_status FROM member_registrations WHERE user_id = ?'
  ).bind(userId).first()

  if (!existing) {
    return err(c, 'কোনো মেম্বারশিপ রেজিস্ট্রেশন পাওয়া যায়নি', 404)
  }

  if (existing.status !== 'active') {
    return err(c, 'শুধুমাত্র সক্রিয় মেম্বাররা তথ্য আপডেট করতে পারে', 400)
  }

  // Parse and validate the update data
  const body = await c.req.json()
  
  // Build dynamic update query
  const allowedFields = [
    'name_english', 'name_bangla', 'father_name', 'mother_name',
    'date_of_birth', 'blood_group', 'present_address', 'permanent_address',
    'facebook_id', 'mobile_whatsapp', 'emergency_contact', 'email',
    'skills_interests'
  ]

  // Only allow payment info update if payment is still pending
  if (existing.payment_status === 'pending') {
    allowedFields.push('payment_method', 'bkash_number', 'bkash_trx_id', 'payment_note')
  }

  const updates: string[] = []
  const values: any[] = []

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`)
      values.push(body[field])
    }
  }

  if (updates.length === 0) {
    return err(c, 'কোনো তথ্য আপডেট করা হয়নি', 400)
  }

  updates.push('updated_at = datetime("now")')
  values.push(userId) // for WHERE clause

  const query = `UPDATE member_registrations SET ${updates.join(', ')} WHERE user_id = ?`
  
  try {
    await c.env.DB.prepare(query).bind(...values).run()

    // Log audit event
    await logAuditEvent(
      c,
      'member_updated',
      userId,
      existing.id as number | null,
      null,
      { updated_fields: Object.keys(body).filter(k => allowedFields.includes(k)) }
    )

    return ok(c, { message: 'তথ্য আপডেট সফল হয়েছে' })
  } catch (error: any) {
    console.error('Member update error:', error)
    return err(c, 'আপডেট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।', 500)
  }
})

// POST /api/member/cancel - Cancel own membership
const cancelSchema = z.object({
  cancellation_reason: z.string().min(10, 'কারণ কমপক্ষে ১০ অক্ষর হতে হবে')
})

memberRoutes.post('/cancel', 
  authMiddleware, 
  zValidator('json', cancelSchema, zodErrorHook),
  async (c) => {
    const userId = c.get('userId')
    const body = c.req.valid('json')

    // Check if user has an active registration
    const existing = await c.env.DB.prepare(
      'SELECT id, status, form_number FROM member_registrations WHERE user_id = ?'
    ).bind(userId).first()

    if (!existing) {
      return err(c, 'কোনো মেম্বারশিপ রেজিস্ট্রেশন পাওয়া যায়নি', 404)
    }

    if (existing.status !== 'active') {
      return err(c, 'আপনার মেম্বারশিপ ইতিমধ্যে বাতিল বা অন্যান্য অবস্থায় আছে', 400)
    }

    try {
      await c.env.DB.prepare(
        `UPDATE member_registrations 
         SET status = 'cancelled', 
             cancelled_at = datetime('now'), 
             cancelled_by = ?,
             cancellation_reason = ?
         WHERE user_id = ?`
      ).bind(userId, body.cancellation_reason, userId).run()

      // Log audit event
      await logAuditEvent(
        c,
        'member_cancelled',
        userId,
        existing.id as number | null,
        existing.form_number as string | null,
        { reason: body.cancellation_reason }
      )

      return ok(c, { 
        message: 'মেম্বারশিপ বাতিল হয়েছে',
        status: 'cancelled'
      })
    } catch (error: any) {
      console.error('Member cancel error:', error)
      return err(c, 'বাতিল করা যায়নি। আবার চেষ্টা করুন।', 500)
    }
  }
)

// POST /api/member/reapply - Reapply after cancellation
memberRoutes.post('/reapply', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))

  // Check if user has any registration
  const existing = await c.env.DB.prepare(
    'SELECT id, form_number, status, payment_status FROM member_registrations WHERE user_id = ?'
  ).bind(userId).first()

  if (!existing) {
    return err(c, 'কোনো মেম্বারশিপ রেজিস্ট্রেশন পাওয়া যায়নি। আপনি আবেদন করেননি।', 404)
  }

  // If already active or pending, don't allow reapply
  if (existing.status === 'active' || existing.status === 'pending') {
    return err(c, `আপনার ইতিমধ্যে একটি ${existing.status === 'active' ? 'সক্রিয়' : 'মূল্যায়নাধীন'} মেম্বারশিপ আছে`, 400)
  }

  // If cancelled, reactivate by updating status to active
  if (existing.status === 'cancelled') {
    try {
      // Generate new form number for reapplication
      const newFormNumber = await generateFormNumber(c.env.DB)

      // Update the cancelled registration to active (payment still pending)
      await c.env.DB.prepare(
        `UPDATE member_registrations 
         SET status = 'active',
             payment_status = 'pending',
             form_number = ?,
             previous_registration_id = id,
             cancelled_at = NULL,
             cancelled_by = NULL,
             cancellation_reason = NULL,
             created_at = datetime('now')
         WHERE user_id = ? AND status = 'cancelled'`
      ).bind(newFormNumber, userId).run()

      // Log audit event
      await logAuditEvent(
        c,
        'member_reapplied',
        userId,
        existing.id as number | null,
        newFormNumber,
        { previous_form_number: existing.form_number }
      )

      return ok(c, { 
        message: 'পুনরায় আবেদন সফল হয়েছে। পেমেন্ট যাচাইয়ের অপেক্ষায় আছে।',
        form_number: newFormNumber,
        payment_status: 'pending',
        status: 'active'
      })
    } catch (error: any) {
      console.error('Member reapply error:', error)
      return err(c, 'পুনরায় আবেদন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।', 500)
    }
  }

  // If rejected, allow new application
  if (existing.status === 'rejected') {
    try {
      // Generate new form number
      const newFormNumber = await generateFormNumber(c.env.DB)

      // Update to active (payment pending)
      await c.env.DB.prepare(
        `UPDATE member_registrations 
         SET status = 'active',
             payment_status = 'pending',
             form_number = ?,
             previous_registration_id = id,
             verified_by = NULL,
             verified_at = NULL,
             payment_note = NULL
         WHERE user_id = ?`
      ).bind(newFormNumber, userId).run()

      // Log audit event
      await logAuditEvent(
        c,
        'member_reapplied',
        userId,
        existing.id as number | null,
        newFormNumber,
        { previous_form_number: existing.form_number }
      )

      return ok(c, { 
        message: 'পুনরায় আবেদন সফল হয়েছে। পেমেন্ট যাচাইয়ের অপেক্ষায় আছে।',
        form_number: newFormNumber,
        payment_status: 'pending',
        status: 'active'
      })
    } catch (error: any) {
      console.error('Member reapply error:', error)
      return err(c, 'পুনরায় আবেদন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।', 500)
    }
  }

  return err(c, 'আবেদন করা সম্ভব নয়', 400)
})

// GET /api/member/status-detail - Get detailed status including cancellation info
memberRoutes.get('/status-detail', authMiddleware, async (c) => {
  const userId = c.get('userId')

  const registration = await c.env.DB.prepare(
    `SELECT mr.*, 
            u.name as user_name, 
            u.phone as user_phone,
            prev.form_number as previous_form_number
     FROM member_registrations mr
     JOIN users u ON mr.user_id = u.id
     LEFT JOIN member_registrations prev ON mr.previous_registration_id = prev.id
     WHERE mr.user_id = ?`
  ).bind(userId).first()

  if (!registration) {
    return ok(c, { registered: false })
  }

  return ok(c, {
    registered: true,
    id: registration.id,
    form_number: registration.form_number,
    name_english: registration.name_english,
    name_bangla: registration.name_bangla,
    status: registration.status,
    payment_status: registration.payment_status,
    payment_method: registration.payment_method,
    payment_amount: registration.payment_amount,
    created_at: registration.created_at,
    verified_at: registration.verified_at,
    cancelled_at: registration.cancelled_at,
    cancellation_reason: registration.cancellation_reason,
    previous_form_number: registration.previous_form_number
  })
})
