/**
 * Unit tests for share certificate download endpoint
 * Tests authorization, validation, and error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateCertificateId } from '../lib/pdf/generator'

describe('Certificate ID Generation', () => {
  it('generates certificate ID with current year and default sequence', () => {
    const currentYear = new Date().getFullYear()
    const certId = generateCertificateId()
    expect(certId).toMatch(/^BBI-SHARE-\d{4}-\d{4}$/)
    expect(certId).toContain(currentYear.toString())
  })

  it('generates certificate ID with custom year', () => {
    const certId = generateCertificateId(2025)
    expect(certId).toBe('BBI-SHARE-2025-0001')
  })

  it('generates certificate ID with custom sequence', () => {
    const certId = generateCertificateId(2025, 42)
    expect(certId).toBe('BBI-SHARE-2025-0042')
  })

  it('pads sequence number to 4 digits', () => {
    expect(generateCertificateId(2025, 1)).toBe('BBI-SHARE-2025-0001')
    expect(generateCertificateId(2025, 9)).toBe('BBI-SHARE-2025-0009')
    expect(generateCertificateId(2025, 99)).toBe('BBI-SHARE-2025-0099')
    expect(generateCertificateId(2025, 999)).toBe('BBI-SHARE-2025-0999')
    expect(generateCertificateId(2025, 9999)).toBe('BBI-SHARE-2025-9999')
  })

  it('handles zero sequence', () => {
    const certId = generateCertificateId(2025, 0)
    expect(certId).toBe('BBI-SHARE-2025-0000')
  })

  it('handles large sequence numbers', () => {
    const certId = generateCertificateId(2025, 10000)
    expect(certId).toBe('BBI-SHARE-2025-10000')
  })
})

describe('Certificate ID Format', () => {
  it('uses correct prefix', () => {
    const certId = generateCertificateId()
    expect(certId).toMatch(/^BBI-SHARE-/)
  })

  it('has correct total length', () => {
    const certId = generateCertificateId(2025, 1234)
    // BBI-SHARE-YYYY-NNNN = 9 + 1 + 4 + 1 + 4 = 19 characters
    expect(certId.length).toBe(19)
  })

  it('format is consistent across multiple calls', () => {
    const ids = Array.from({ length: 10 }, (_, i) => generateCertificateId(2025, i + 1))
    ids.forEach(id => {
      expect(id).toMatch(/^BBI-SHARE-2025-\d{4}$/)
    })
  })
})

// Note: Integration tests for the /api/shares/certificate endpoint
// should be added separately to test:
// - Authorization (user vs admin)
// - Input validation (invalid purchase IDs)
// - Error responses (404, 403, 500)
// - PDF generation and headers
// These require a running Worker environment with D1 database
