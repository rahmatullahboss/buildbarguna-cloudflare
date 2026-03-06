import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { ok, err } from '../lib/response'
import type { Bindings, Variables } from '../types'
import { generateMemberCertificate } from '../lib/pdf/generator'

export const memberRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Registration schema with validation
const registrationSchema = z.object({
  name_english: z.string().min(2, 'ইংরেজি নাম কমপক্ষে ২ অক্ষরের হতে হবে'),
  name_bangla: z.string().optional(),
  father_name: z.string().min(2, 'পিতার নাম কমপক্ষে ২ অক্ষরের হতে হবে'),
  mother_name: z.string().min(2, 'মাতার নাম কমপক্ষে ২ অক্ষরের হতে হবে'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'জন্ম তারিখ YYYY-MM-DD ফরম্যাটে দিন'),
  blood_group: z.string().optional(),
  present_address: z.string().min(5, 'বর্তমান ঠিকানা কমপক্ষে ৫ অক্ষরের হতে হবে'),
  permanent_address: z.string().min(5, 'স্থায়ী ঠিকানা কমপক্ষে ৫ অক্ষরের হতে হবে'),
  facebook_id: z.string().optional(),
  mobile_whatsapp: z.string().regex(/^01[3-9]\d{8}$/, 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন'),
  emergency_contact: z.string().optional(),
  email: z.string().email('সঠিক ইমেইল ঠিকানা দিন').optional().or(z.literal('')),
  skills_interests: z.string().optional(),
  declaration_accepted: z.boolean().refine(val => val === true, 'ঘোষণা অনুমোদন করতে হবে')
})

// Generate sequential form number
async function generateFormNumber(env: Bindings): Promise<string> {
  const year = new Date().getFullYear()
  
  // Get the last form number for this year
  const result = await env.DB.prepare(`
    SELECT form_number FROM member_registrations 
    WHERE form_number LIKE ? 
    ORDER BY id DESC 
    LIMIT 1
  `).bind(`BBI-${year}-%`).first<{ form_number: string }>()

  let sequence = 1
  if (result?.form_number) {
    const match = result.form_number.match(/BBI-\d{4}-(\d{4})/)
    if (match) {
      sequence = parseInt(match[1]) + 1
    }
  }

  return `BBI-${year}-${String(sequence).padStart(4, '0')}`
}

// POST /api/member/register - Submit member registration
memberRoutes.post('/register', authMiddleware, zValidator('json', registrationSchema), async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')

  try {
    // Check if user already registered
    const existing = await c.env.DB.prepare(
      'SELECT id, form_number FROM member_registrations WHERE user_id = ?'
    ).bind(userId).first()

    if (existing) {
      return err(c, `আপনি ইতিমধ্যে নিবন্ধিত। ফর্ম নম্বর: ${existing.form_number}`, 409)
    }

    // Generate form number
    const formNumber = await generateFormNumber(c.env)

    // Insert registration
    const result = await c.env.DB.prepare(`
      INSERT INTO member_registrations (
        form_number, user_id, name_english, name_bangla, father_name, mother_name,
        date_of_birth, blood_group, present_address, permanent_address, facebook_id,
        mobile_whatsapp, emergency_contact, email, skills_interests, declaration_accepted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      formNumber,
      userId,
      data.name_english,
      data.name_bangla || null,
      data.father_name,
      data.mother_name,
      data.date_of_birth,
      data.blood_group || null,
      data.present_address,
      data.permanent_address,
      data.facebook_id || null,
      data.mobile_whatsapp,
      data.emergency_contact || null,
      data.email || null,
      data.skills_interests || null,
      data.declaration_accepted ? 1 : 0
    ).run()

    if (!result.success) {
      return err(c, 'নিবন্ধন ব্যর্থ হয়েছে', 500)
    }

    // Fetch complete registration data
    const registration = await c.env.DB.prepare(`
      SELECT * FROM member_registrations WHERE id = ?
    `).bind(result.meta?.last_row_id as number).first()

    return ok(c, {
      message: 'নিবন্ধন সফল হয়েছে',
      form_number: formNumber,
      registration_id: result.meta?.last_row_id
    }, 201)

  } catch (error: any) {
    console.error('Registration error:', error)
    return err(c, 'সার্ভার সমস্যা হয়েছে। আবার চেষ্টা করুন।', 500)
  }
})

// GET /api/member/certificate/:formNumber - Download PDF certificate
memberRoutes.get('/certificate/:formNumber', authMiddleware, async (c) => {
  const formNumber = c.req.param('formNumber')
  const userId = c.get('userId')

  try {
    // Get registration data
    const registration = await c.env.DB.prepare(`
      SELECT * FROM member_registrations WHERE form_number = ? AND user_id = ?
    `).bind(formNumber, userId).first<any>()

    if (!registration) {
      return err(c, 'নিবন্ধন পাওয়া যায়নি', 404)
    }

    // Load BBI logo from R2 or use embedded version
    let logoBuffer: ArrayBuffer | undefined
    try {
      // Try to load from R2 if available
      const logoObject = await (c.env as any).BUCKET?.get('bbi-logo.jpg')
      if (logoObject) {
        logoBuffer = await logoObject.arrayBuffer()
      }
    } catch (e) {
      console.warn('Could not load logo from R2, proceeding without')
    }

    // Generate PDF
    const pdfBuffer = await generateMemberCertificate({
      form_number: String(registration.form_number),
      name_english: String(registration.name_english),
      name_bangla: registration.name_bangla ? String(registration.name_bangla) : undefined,
      father_name: String(registration.father_name),
      mother_name: String(registration.mother_name),
      date_of_birth: String(registration.date_of_birth),
      blood_group: registration.blood_group ? String(registration.blood_group) : undefined,
      present_address: String(registration.present_address),
      permanent_address: String(registration.permanent_address),
      facebook_id: registration.facebook_id ? String(registration.facebook_id) : undefined,
      mobile_whatsapp: String(registration.mobile_whatsapp),
      emergency_contact: registration.emergency_contact ? String(registration.emergency_contact) : undefined,
      email: registration.email ? String(registration.email) : undefined,
      skills_interests: registration.skills_interests ? String(registration.skills_interests) : undefined,
      created_at: String(registration.created_at)
    }, logoBuffer)

    // Return PDF as download
    const fileName = `BBI_Member_${formNumber}_${String(registration.name_english).replace(/\s+/g, '_')}.pdf`
    
    c.header('Content-Type', 'application/pdf')
    c.header('Content-Disposition', `attachment; filename="${fileName}"`)
    c.header('Content-Length', pdfBuffer.length.toString())
    
    // Return as blob for proper response type
    return c.body(pdfBuffer as any, 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': pdfBuffer.length.toString()
    })

  } catch (error: any) {
    console.error('PDF generation error:', error)
    return err(c, 'পিডিএফ তৈরি করা যায়নি', 500)
  }
})

// GET /api/member/status - Check registration status
memberRoutes.get('/status', authMiddleware, async (c) => {
  const userId = c.get('userId')

  try {
    const registration = await c.env.DB.prepare(`
      SELECT id, form_number, name_english, created_at FROM member_registrations WHERE user_id = ?
    `).bind(userId).first()

    if (!registration) {
      return ok(c, { registered: false })
    }

    return ok(c, {
      registered: true,
      form_number: registration.form_number,
      name: registration.name_english,
      registered_at: registration.created_at
    })

  } catch (error: any) {
    console.error('Status check error:', error)
    return err(c, 'স্ট্যাটাস পাওয়া যায়নি', 500)
  }
})
