import { describe, it, expect } from 'vitest'
import { z } from 'zod'

/**
 * Member Registration Validation Unit Tests
 * 
 * Tests for the Zod validation schema in member.ts
 * Pure validation logic - no D1 or Cloudflare bindings needed
 */

// Replicate the schema from member.ts for testing
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

describe('Member Registration Validation', () => {
  describe('name_english', () => {
    it('accepts valid English names', () => {
      const result = registrationSchema.safeParse({
        name_english: 'John Doe',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '2000-01-01',
        present_address: '123 Main St, City',
        permanent_address: '456 Home St, Village',
        mobile_whatsapp: '01712345678',
        declaration_accepted: true
      })
      expect(result.success).toBe(true)
    })

    it('rejects names shorter than 2 characters', () => {
      const result = registrationSchema.safeParse({
        name_english: 'A',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '2000-01-01',
        present_address: '123 Main St, City',
        permanent_address: '456 Home St, Village',
        mobile_whatsapp: '01712345678',
        declaration_accepted: true
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('name_english')
      }
    })
  })

  describe('mobile_whatsapp', () => {
    it('accepts valid Bangladesh mobile numbers', () => {
      const validNumbers = [
        '01712345678',
        '01812345678',
        '01912345678',
        '01612345678',
        '01512345678',
        '01312345678'
      ]
      
      for (const number of validNumbers) {
        const result = registrationSchema.safeParse({
          name_english: 'Test User',
          father_name: 'Father Name',
          mother_name: 'Mother Name',
          date_of_birth: '2000-01-01',
          present_address: '123 Main St, City',
          permanent_address: '456 Home St, Village',
          mobile_whatsapp: number,
          declaration_accepted: true
        })
        expect(result.success).toBe(true)
      }
    })

    it('rejects invalid mobile numbers', () => {
      const invalidNumbers = [
        '01212345678',  // Invalid operator
        '0171234567',   // Too short
        '017123456789', // Too long
        '1234567890',   // Wrong format
        '+8801712345678' // International format
      ]
      
      for (const number of invalidNumbers) {
        const result = registrationSchema.safeParse({
          name_english: 'Test User',
          father_name: 'Father Name',
          mother_name: 'Mother Name',
          date_of_birth: '2000-01-01',
          present_address: '123 Main St, City',
          permanent_address: '456 Home St, Village',
          mobile_whatsapp: number,
          declaration_accepted: true
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors.some(e => e.path.includes('mobile_whatsapp'))).toBe(true)
        }
      }
    })
  })

  describe('date_of_birth', () => {
    it('accepts YYYY-MM-DD format', () => {
      const validDates = [
        '2000-01-01',
        '1990-12-31',
        '2020-06-15'
      ]
      
      for (const date of validDates) {
        const result = registrationSchema.safeParse({
          name_english: 'Test User',
          father_name: 'Father Name',
          mother_name: 'Mother Name',
          date_of_birth: date,
          present_address: '123 Main St, City',
          permanent_address: '456 Home St, Village',
          mobile_whatsapp: '01712345678',
          declaration_accepted: true
        })
        expect(result.success).toBe(true)
      }
    })

    it('rejects invalid date formats', () => {
      const invalidDates = [
        '01-01-2000',    // DD-MM-YYYY
        '2000/01/01',    // Slashes
        'Jan 1, 2000',   // Text format
        '2000-1-1'       // Single digit month/day
        // Note: 2000-13-01 and 2000-01-32 pass regex but are logically invalid
        // Backend should handle logical validation separately
      ]
      
      for (const date of invalidDates) {
        const result = registrationSchema.safeParse({
          name_english: 'Test User',
          father_name: 'Father Name',
          mother_name: 'Mother Name',
          date_of_birth: date,
          present_address: '123 Main St, City',
          permanent_address: '456 Home St, Village',
          mobile_whatsapp: '01712345678',
          declaration_accepted: true
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors.some(e => e.path.includes('date_of_birth'))).toBe(true)
        }
      }
    })
  })

  describe('email', () => {
    it('accepts valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@gmail.com',
        'user@sub.domain.com'
      ]
      
      for (const email of validEmails) {
        const result = registrationSchema.safeParse({
          name_english: 'Test User',
          father_name: 'Father Name',
          mother_name: 'Mother Name',
          date_of_birth: '2000-01-01',
          present_address: '123 Main St, City',
          permanent_address: '456 Home St, Village',
          mobile_whatsapp: '01712345678',
          email: email,
          declaration_accepted: true
        })
        expect(result.success).toBe(true)
      }
    })

    it('rejects invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@example.com',
        'user@domain',
        'user name@example.com'
      ]
      
      for (const email of invalidEmails) {
        const result = registrationSchema.safeParse({
          name_english: 'Test User',
          father_name: 'Father Name',
          mother_name: 'Mother Name',
          date_of_birth: '2000-01-01',
          present_address: '123 Main St, City',
          permanent_address: '456 Home St, Village',
          mobile_whatsapp: '01712345678',
          email: email,
          declaration_accepted: true
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors.some(e => e.path.includes('email'))).toBe(true)
        }
      }
    })

    it('accepts empty string as email', () => {
      const result = registrationSchema.safeParse({
        name_english: 'Test User',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '2000-01-01',
        present_address: '123 Main St, City',
        permanent_address: '456 Home St, Village',
        mobile_whatsapp: '01712345678',
        email: '',
        declaration_accepted: true
      })
      expect(result.success).toBe(true)
    })
  })

  describe('declaration_accepted', () => {
    it('accepts when true', () => {
      const result = registrationSchema.safeParse({
        name_english: 'Test User',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '2000-01-01',
        present_address: '123 Main St, City',
        permanent_address: '456 Home St, Village',
        mobile_whatsapp: '01712345678',
        declaration_accepted: true
      })
      expect(result.success).toBe(true)
    })

    it('rejects when false', () => {
      const result = registrationSchema.safeParse({
        name_english: 'Test User',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '2000-01-01',
        present_address: '123 Main St, City',
        permanent_address: '456 Home St, Village',
        mobile_whatsapp: '01712345678',
        declaration_accepted: false
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors.some(e => e.path.includes('declaration_accepted'))).toBe(true)
      }
    })

    it('rejects when missing', () => {
      const result = registrationSchema.safeParse({
        name_english: 'Test User',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '2000-01-01',
        present_address: '123 Main St, City',
        permanent_address: '456 Home St, Village',
        mobile_whatsapp: '01712345678'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('Bangla text support', () => {
    it('accepts Bangla names', () => {
      const result = registrationSchema.safeParse({
        name_english: 'Test User',
        name_bangla: 'টেস্ট ইউজার',
        father_name: 'পিতার নাম',
        mother_name: 'মাতার নাম',
        date_of_birth: '2000-01-01',
        present_address: '১২ প্রধান সড়ক, ঢাকা',
        permanent_address: '৪৫৬ গ্রাম, বরগুনা',
        mobile_whatsapp: '01712345678',
        declaration_accepted: true
      })
      expect(result.success).toBe(true)
    })

    it('accepts Bangla addresses', () => {
      const result = registrationSchema.safeParse({
        name_english: 'Test User',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '2000-01-01',
        present_address: 'বর্তমান ঠিকানা, বরগুনা সদর, বরগুনা',
        permanent_address: 'স্থায়ী ঠিকানা, আমতলী, বরগুনা',
        mobile_whatsapp: '01712345678',
        declaration_accepted: true
      })
      expect(result.success).toBe(true)
    })
  })

  describe('blood_group', () => {
    it('accepts common blood groups', () => {
      const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
      
      for (const bg of bloodGroups) {
        const result = registrationSchema.safeParse({
          name_english: 'Test User',
          father_name: 'Father Name',
          mother_name: 'Mother Name',
          date_of_birth: '2000-01-01',
          present_address: '123 Main St, City',
          permanent_address: '456 Home St, Village',
          mobile_whatsapp: '01712345678',
          blood_group: bg,
          declaration_accepted: true
        })
        expect(result.success).toBe(true)
      }
    })

    it('accepts undefined blood_group (optional field)', () => {
      const result = registrationSchema.safeParse({
        name_english: 'Test User',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '2000-01-01',
        present_address: '123 Main St, City',
        permanent_address: '456 Home St, Village',
        mobile_whatsapp: '01712345678',
        declaration_accepted: true
      })
      expect(result.success).toBe(true)
    })
  })

  describe('address validation', () => {
    it('rejects addresses shorter than 5 characters', () => {
      const result = registrationSchema.safeParse({
        name_english: 'Test User',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '2000-01-01',
        present_address: '123',
        permanent_address: '456',
        mobile_whatsapp: '01712345678',
        declaration_accepted: true
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const hasAddressError = result.error.errors.some(
          e => e.path.includes('present_address') || e.path.includes('permanent_address')
        )
        expect(hasAddressError).toBe(true)
      }
    })

    it('accepts addresses with 5+ characters', () => {
      const result = registrationSchema.safeParse({
        name_english: 'Test User',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '2000-01-01',
        present_address: '123 Main',
        permanent_address: '456 Home',
        mobile_whatsapp: '01712345678',
        declaration_accepted: true
      })
      expect(result.success).toBe(true)
    })
  })
})
