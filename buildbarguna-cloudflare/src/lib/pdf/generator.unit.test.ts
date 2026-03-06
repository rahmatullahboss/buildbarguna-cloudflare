import { describe, it, expect } from 'vitest'
import { generateMemberCertificate } from './generator'

/**
 * PDF Generator Unit Tests
 * 
 * Tests for the member certificate PDF generation
 * Note: These tests verify the structure and contract of the generator
 * Full PDF rendering tests require visual inspection
 */

describe('Member Certificate PDF Generator', () => {
  describe('generateMemberCertificate function', () => {
    it('exports the generator function', () => {
      expect(typeof generateMemberCertificate).toBe('function')
    })

    it('generates PDF buffer for valid registration data', async () => {
      const testData = {
        form_number: 'BBI-2026-0001',
        name_english: 'Test User',
        name_bangla: 'টেস্ট ইউজার',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '2000-01-01',
        blood_group: 'A+',
        present_address: '123 Main St, Dhaka',
        permanent_address: '456 Village, Barguna',
        facebook_id: 'testuser',
        mobile_whatsapp: '01712345678',
        emergency_contact: '01812345678',
        email: 'test@example.com',
        skills_interests: 'Web Development, Design',
        created_at: '2026-03-06T10:00:00.000Z'
      }

      const pdfBuffer = await generateMemberCertificate(testData)
      
      // Verify PDF structure
      expect(pdfBuffer).toBeInstanceOf(Uint8Array)
      expect(pdfBuffer.length).toBeGreaterThan(1000) // PDFs should be at least 1KB
      
      // Check PDF header (should start with %PDF)
      const header = String.fromCharCode(...pdfBuffer.slice(0, 4))
      expect(header).toBe('%PDF')
    })

    it('handles optional fields correctly', async () => {
      const testData = {
        form_number: 'BBI-2026-0002',
        name_english: 'User Without Optional Fields',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '1995-06-15',
        present_address: '123 Main St',
        permanent_address: '456 Home St',
        mobile_whatsapp: '01712345678',
        declaration_accepted: 1,
        created_at: '2026-03-06T10:00:00.000Z'
      }

      const pdfBuffer = await generateMemberCertificate(testData as any)
      expect(pdfBuffer).toBeInstanceOf(Uint8Array)
      expect(pdfBuffer.length).toBeGreaterThan(1000)
    })

    it('handles Bangla text in all fields', async () => {
      const testData = {
        form_number: 'BBI-2026-0003',
        name_english: 'Test User',
        name_bangla: 'টেস্ট ইউজার',
        father_name: 'পিতার নাম',
        mother_name: 'মাতার নাম',
        date_of_birth: '2000-01-01',
        blood_group: 'বি+',
        present_address: '১২ প্রধান সড়ক, বরগুনা',
        permanent_address: '৪৫৬ গ্রাম, আমতলী, বরগুনা',
        mobile_whatsapp: '01712345678',
        skills_interests: 'ওয়েব ডেভেলপমেন্ট, ডিজাইন',
        created_at: '2026-03-06T10:00:00.000Z'
      }

      const pdfBuffer = await generateMemberCertificate(testData)
      expect(pdfBuffer).toBeInstanceOf(Uint8Array)
      // PDF with Unicode text should be larger
      expect(pdfBuffer.length).toBeGreaterThan(2000)
    })

    it('generates consistent PDF size for same data', async () => {
      const testData = {
        form_number: 'BBI-2026-0004',
        name_english: 'Consistency Test',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '2000-01-01',
        present_address: '123 Main St',
        permanent_address: '456 Home St',
        mobile_whatsapp: '01712345678',
        created_at: '2026-03-06T10:00:00.000Z'
      }

      const pdf1 = await generateMemberCertificate(testData)
      const pdf2 = await generateMemberCertificate(testData)
      
      // PDFs should be approximately the same size
      expect(Math.abs(pdf1.length - pdf2.length)).toBeLessThan(100)
    })

    it('handles very long text fields', async () => {
      const testData = {
        form_number: 'BBI-2026-0005',
        name_english: 'Test User With Very Long Name That Should Still Work',
        father_name: 'Father With Long Name',
        mother_name: 'Mother With Long Name',
        date_of_birth: '2000-01-01',
        present_address: 'This is a very long address that spans multiple lines and should be handled correctly by the PDF generator without breaking the layout',
        permanent_address: 'Another very long permanent address that tests the PDF generation system',
        mobile_whatsapp: '01712345678',
        skills_interests: 'Web Development, Mobile App Development, UI/UX Design, Graphic Design, Content Writing, Digital Marketing',
        created_at: '2026-03-06T10:00:00.000Z'
      }

      const pdfBuffer = await generateMemberCertificate(testData)
      expect(pdfBuffer).toBeInstanceOf(Uint8Array)
      expect(pdfBuffer.length).toBeGreaterThan(2000)
    })
  })

  describe('PDF metadata', () => {
    it('includes creation date in PDF metadata', async () => {
      const testData = {
        form_number: 'BBI-2026-TEST',
        name_english: 'Test User',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '2000-01-01',
        present_address: '123 Main St',
        permanent_address: '456 Home St',
        mobile_whatsapp: '01712345678',
        created_at: '2026-03-06T10:00:00.000Z'
      }

      const pdfBuffer = await generateMemberCertificate(testData)
      const pdfText = new TextDecoder().decode(pdfBuffer)
      
      // PDF should have creation date metadata
      expect(pdfText).toContain('/CreationDate')
    })

    it('includes PDFKit producer metadata', async () => {
      const testData = {
        form_number: 'BBI-2026-0006',
        name_english: 'John Doe',
        father_name: 'Father Name',
        mother_name: 'Mother Name',
        date_of_birth: '2000-01-01',
        present_address: '123 Main St',
        permanent_address: '456 Home St',
        mobile_whatsapp: '01712345678',
        created_at: '2026-03-06T10:00:00.000Z'
      }

      const pdfBuffer = await generateMemberCertificate(testData)
      const pdfText = new TextDecoder().decode(pdfBuffer)
      
      // PDF should have PDFKit producer metadata
      expect(pdfText).toContain('PDFKit')
      expect(pdfText).toContain('/Producer')
    })
  })
})
