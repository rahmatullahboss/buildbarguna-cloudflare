/**
 * PDF Generation Utility for BBI Member Registration Certificates
 * Generates PDF certificates matching the BBI Member Registration Form design
 *
 * Issue: 3.4 - PDF Bangla text rendering - need to configure Bangla-compatible font
 * Solution: Use Hind Siliguri font for Bangla text support
 * 
 * Why Hind Siliguri?
 * - Modern, clean Bengali typeface designed by Google
 * - Excellent readability for formal documents
 * - Professional appearance perfect for certificates
 * - Good weight variants (Regular, Bold, SemiBold, etc.)
 */

import PDFDocument from 'pdfkit'
import { FontKitFont } from 'pdfkit'

interface MemberRegistration {
  form_number: string
  name_english: string
  name_bangla?: string
  father_name: string
  mother_name: string
  date_of_birth: string
  blood_group?: string
  present_address: string
  permanent_address: string
  facebook_id?: string
  mobile_whatsapp: string
  emergency_contact?: string
  email?: string
  skills_interests?: string
  created_at: string
}

interface ShareCertificate {
  certificate_id: string
  project_name: string
  share_quantity: number
  total_amount_paisa: number
  purchase_date: string
  user_name: string
  user_phone: string
  payment_method: string
  form_number?: string
}

/**
 * Register Bangla font with PDFKit
 * Uses Hind Siliguri for proper Bangla text rendering
 * Font files should be placed in src/lib/pdf/fonts/ directory
 */
function registerBanglaFont(doc: PDFDocument) {
  try {
    // Try to register Hind Siliguri fonts
    // Modern Bengali font designed by Google for proper Bangla script rendering
    const fontPath = './src/lib/pdf/fonts/'

    // Register regular and bold variants
    doc.font('HindSiliguri', `${fontPath}HindSiliguri-Regular.ttf`)
    doc.font('HindSiliguri-Bold', `${fontPath}HindSiliguri-Bold.ttf`)

    return true
  } catch (error) {
    console.warn('Bangla font not found, falling back to Helvetica for Bangla text:', error)
    return false
  }
}

/**
 * Check if text contains Bangla characters
 */
function hasBanglaText(text: string): boolean {
  // Unicode range for Bengali script: U+0980 to U+09FF
  const bengaliRegex = /[\u0980-\u09FF]/
  return bengaliRegex.test(text)
}

/**
 * Generate a PDF certificate for a member registration
 * @param registration - Member registration data
 * @param logoBuffer - Optional BBI logo buffer (JPEG)
 * @returns PDF buffer as Uint8Array
 */
export async function generateMemberCertificate(
  registration: MemberRegistration,
  logoBuffer?: ArrayBuffer
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    })

    const chunks: Uint8Array[] = []
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    doc.on('end', () => {
      const result = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }
      resolve(result)
    })
    doc.on('error', reject)

    // Register Bangla font if available
    const hasBanglaFont = registerBanglaFont(doc)

    // Draw watermark (faded logo in background)
    if (logoBuffer) {
      try {
        const logo = doc.image(Buffer.from(logoBuffer) as any, {
          fit: [400, 400],
          align: 'center',
          valign: 'center',
          opacity: 0.1
        } as any)
        // Logo is already positioned by image() call
      } catch (e) {
        console.warn('Failed to add watermark:', e)
      }
    }

    // Header with logo and organization info
    const pageWidth = doc.page.width
    const pageHeight = doc.page.height

    // Draw logo at top left
    if (logoBuffer) {
      try {
        doc.image(Buffer.from(logoBuffer) as any, 50, 50, {
          width: 80,
          height: 80
        } as any)
      } catch (e) {
        console.warn('Failed to add header logo:', e)
      }
    }

    // Organization name and details (centered)
    doc.fontSize(18)
      .font('Helvetica-Bold')
      .text('Build Barguna Initiative (BBI)', 140, 55, {
        align: 'left'
      })

    doc.fontSize(12)
      .font('Helvetica')
      .text('Barguna Sadar, Barguna', 140, 75, { align: 'left' })
      .text('Email:bbi.official2025@gmail.com', 140, 90, { align: 'left' })
      .text('Mobile:01971951960', 140, 105, { align: 'left' })

    // Horizontal line
    doc.moveTo(50, 125)
      .lineTo(pageWidth - 50, 125)
      .stroke()

    // Title
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .text('Member Registration Form', 0, 145, {
        align: 'center'
      })

    // Another horizontal line
    doc.moveTo(50, 165)
      .lineTo(pageWidth - 50, 165)
      .stroke()

    // Form fields
    let yPos = 190
    const labelX = 50
    const valueX = 180
    const lineHeight = 20

    doc.fontSize(11).font('Helvetica-Bold')

    // Form Number and Date
    doc.text(`Form NO: [ ${registration.form_number} ]`, labelX, yPos)
    doc.text(`Date: ${new Date(registration.created_at).toLocaleDateString('en-BD')}`, pageWidth - 150, yPos)
    yPos += lineHeight + 5

    // Name fields
    doc.text('Name (English):', labelX, yPos)
    doc.font('Helvetica').text(registration.name_english, valueX, yPos, { width: 450, underline: true })
    yPos += lineHeight + 5

    // Name (Bangla) - Use Bangla font if available and text contains Bangla
    doc.font('Helvetica-Bold').text('Name (Bangla):', labelX, yPos)
    if (registration.name_bangla && hasBanglaText(registration.name_bangla) && hasBanglaFont) {
      try {
        doc.font('HindSiliguri').text(registration.name_bangla, valueX, yPos, { width: 450, underline: true })
      } catch (e) {
        doc.font('Helvetica').text(registration.name_bangla || '____________', valueX, yPos, { width: 450, underline: true })
      }
    } else {
      doc.font('Helvetica').text(registration.name_bangla || '____________', valueX, yPos, { width: 450, underline: true })
    }
    yPos += lineHeight + 5

    // Parents names
    doc.font('Helvetica-Bold').text("Father's Name:", labelX, yPos)
    doc.font('Helvetica').text(registration.father_name, valueX, yPos, { width: 450, underline: true })
    yPos += lineHeight + 5

    doc.font('Helvetica-Bold').text("Mother's Name:", labelX, yPos)
    doc.font('Helvetica').text(registration.mother_name, valueX, yPos, { width: 450, underline: true })
    yPos += lineHeight + 5

    // Date of Birth and Blood Group
    doc.font('Helvetica-Bold').text('Date of Birth:', labelX, yPos)
    doc.font('Helvetica').text(registration.date_of_birth, valueX, yPos, { width: 200, underline: true })
    doc.font('Helvetica-Bold').text('Blood Group:', 380, yPos)
    doc.font('Helvetica').text(registration.blood_group || '____________', 490, yPos, { width: 150, underline: true })
    yPos += lineHeight + 10

    // Skills & Interests
    doc.font('Helvetica-Bold').text('Skills & Interests:', labelX, yPos)
    yPos += lineHeight
    doc.font('Helvetica').text(registration.skills_interests || '____________', labelX, yPos, { width: 500, underline: true })
    yPos += lineHeight + 10

    // Address fields
    doc.font('Helvetica-Bold').text('Present Address:', labelX, yPos)
    yPos += lineHeight
    doc.font('Helvetica').text(registration.present_address, labelX, yPos, { width: 500, underline: true })
    yPos += lineHeight + 5

    doc.font('Helvetica-Bold').text('Permanent Address:', labelX, yPos)
    yPos += lineHeight
    doc.font('Helvetica').text(registration.permanent_address, labelX, yPos, { width: 500, underline: true })
    yPos += lineHeight + 5

    // Facebook ID
    doc.font('Helvetica-Bold').text('Facebook ID Name:', labelX, yPos)
    doc.font('Helvetica').text(registration.facebook_id || '____________', valueX, yPos, { width: 450, underline: true })
    yPos += lineHeight + 5

    // Mobile and Emergency contact
    doc.font('Helvetica-Bold').text('Mobile No (WhatsApp):', labelX, yPos)
    doc.font('Helvetica').text(registration.mobile_whatsapp, valueX, yPos, { width: 200, underline: true })
    doc.font('Helvetica-Bold').text('(Guardian/Emergency):', 380, yPos)
    doc.font('Helvetica').text(registration.emergency_contact || '____________', 490, yPos, { width: 150, underline: true })
    yPos += lineHeight + 5

    // Email
    doc.font('Helvetica-Bold').text('E-mail:', labelX, yPos)
    doc.font('Helvetica').text(registration.email || '____________', valueX, yPos, { width: 450, underline: true })
    yPos += lineHeight + 15

    // Undertaking & Declaration
    doc.font('Helvetica-Bold').fontSize(11)
      .text('Undertaking & Declaration:', labelX, yPos)
    yPos += 15

    doc.font('Helvetica').fontSize(10)
      .text('I certify that the information provided is correct. As a member of Build Barguna Initiative (BBI), I pledge to:', labelX, yPos, { width: 500 })
    yPos += 20

    const pledges = [
      "Follow the organization's rules, regulations, and decisions.",
      'Maintain the highest ethical standards and discipline.',
      'Grant permission to BBI to use my photographs/videos for promotional purposes.',
      'Accept that the Governing Body has the full authority to terminate my membership for misconduct.'
    ]

    doc.fontSize(10)
    for (const pledge of pledges) {
      doc.text('• ' + pledge, labelX + 10, yPos, { width: 500 })
      yPos += 15
    }

    // Signature lines at bottom
    yPos = pageHeight - 80
    doc.font('Helvetica-Bold').fontSize(11)
      .text("Authority's Signature", labelX, yPos)
      .text("Applicant's Signature", pageWidth - 200, yPos)

    doc.end()
  })
}

/**
 * Generate a PDF certificate for a share purchase
 * @param certificate - Share certificate data
 * @param logoBuffer - Optional BBI logo buffer (JPEG)
 * @returns PDF buffer as Uint8Array
 */
export async function generateShareCertificate(
  certificate: ShareCertificate,
  logoBuffer?: ArrayBuffer
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    })

    const chunks: Uint8Array[] = []
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    doc.on('end', () => {
      const result = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }
      resolve(result)
    })
    doc.on('error', reject)

    // Register Bangla font if available
    registerBanglaFont(doc)

    const pageWidth = doc.page.width
    const pageHeight = doc.page.height

    // Draw watermark (faded logo in background)
    if (logoBuffer) {
      try {
        doc.image(Buffer.from(logoBuffer) as any, {
          fit: [400, 400],
          align: 'center',
          valign: 'center',
          opacity: 0.08
        } as any)
      } catch (e) {
        console.warn('Failed to add watermark:', e)
      }
    }

    // Draw logo at top left
    if (logoBuffer) {
      try {
        doc.image(Buffer.from(logoBuffer) as any, 50, 50, {
          width: 60,
          height: 60
        } as any)
      } catch (e) {
        console.warn('Failed to add header logo:', e)
      }
    }

    // Organization name and details
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .text('Build Barguna Initiative (BBI)', 120, 55, {
        align: 'left'
      })

    doc.fontSize(10)
      .font('Helvetica')
      .text('Barguna Sadar, Barguna', 120, 72, { align: 'left' })
      .text('Email: bbi.official2025@gmail.com', 120, 85, { align: 'left' })
      .text('Mobile: 01971951960', 120, 98, { align: 'left' })

    // Horizontal line
    doc.moveTo(50, 120)
      .lineTo(pageWidth - 50, 120)
      .stroke()

    // Certificate title
    doc.fontSize(18)
      .font('Helvetica-Bold')
      .text('Share Purchase Certificate', 0, 140, {
        align: 'center'
      })

    // Certificate ID
    doc.fontSize(12)
      .font('Helvetica')
      .text(`Certificate ID: ${certificate.certificate_id}`, 0, 165, {
        align: 'center'
      })

    // Horizontal line
    doc.moveTo(50, 185)
      .lineTo(pageWidth - 50, 185)
      .stroke()

    // Certificate content
    let yPos = 205
    const labelX = 60
    const valueX = 200

    doc.fontSize(11)

    // Project Name
    doc.font('Helvetica-Bold').text('Project:', labelX, yPos)
    doc.font('Helvetica').text(certificate.project_name, valueX, yPos, { width: 350 })
    yPos += 25

    // Share Quantity
    doc.font('Helvetica-Bold').text('Number of Shares:', labelX, yPos)
    doc.font('Helvetica').text(certificate.share_quantity.toString(), valueX, yPos)
    yPos += 25

    // Total Amount
    doc.font('Helvetica-Bold').text('Total Investment:', labelX, yPos)
    const amountTaka = (certificate.total_amount_paisa / 100).toFixed(2)
    doc.font('Helvetica').text(`৳${amountTaka}`, valueX, yPos)
    yPos += 25

    // Purchase Date
    doc.font('Helvetica-Bold').text('Purchase Date:', labelX, yPos)
    doc.font('Helvetica').text(new Date(certificate.purchase_date).toLocaleDateString('en-BD'), valueX, yPos)
    yPos += 25

    // Payment Method
    doc.font('Helvetica-Bold').text('Payment Method:', labelX, yPos)
    doc.font('Helvetica').text(certificate.payment_method === 'bkash' ? 'bKash' : 'Manual/Cash', valueX, yPos)
    yPos += 25

    // Member Name
    doc.font('Helvetica-Bold').text('Member Name:', labelX, yPos)
    doc.font('Helvetica').text(certificate.user_name, valueX, yPos)
    yPos += 25

    // Member Phone
    doc.font('Helvetica-Bold').text('Phone Number:', labelX, yPos)
    doc.font('Helvetica').text(certificate.user_phone, valueX, yPos)
    yPos += 25

    // Member Form Number (if available)
    if (certificate.form_number) {
      doc.font('Helvetica-Bold').text('Member Form No:', labelX, yPos)
      doc.font('Helvetica').text(certificate.form_number, valueX, yPos)
      yPos += 25
    }

    yPos += 20

    // Terms and conditions
    doc.fontSize(10)
      doc.font('Helvetica-Bold').text('Terms & Conditions:', labelX, yPos)
    yPos += 18

    doc.font('Helvetica').fontSize(9)
    const terms = [
      'This certificate is valid only after payment verification by BBI admin.',
      'Share allocation is subject to project terms and conditions.',
      'Profit distribution will be made as per project guidelines.',
      'BBI reserves the right to modify terms with prior notice.'
    ]

    for (const term of terms) {
      doc.text('• ' + term, labelX + 10, yPos, { width: 480 })
      yPos += 14
    }

    // Signature section
    yPos = pageHeight - 100

    doc.fontSize(11)
    doc.font('Helvetica-Bold')
      .text("For Build Barguna Initiative (BBI)", labelX, yPos)
      .text("Member Signature", pageWidth - 180, yPos)

    // Signature lines
    yPos += 8
    doc.font('Helvetica').fontSize(9)
    doc.text('_________________________', labelX, yPos)
    doc.text('_________________________', pageWidth - 180, yPos)

    yPos += 15
    doc.text('Authorized Signature', labelX, yPos, { width: 150 })
    doc.text('(With Seal)', pageWidth - 180, yPos, { width: 150 })

    // Footer
    doc.fontSize(8)
    doc.text(
      `This certificate was generated on ${new Date().toLocaleString('en-BD')}`,
      0,
      pageHeight - 30,
      { align: 'center' }
    )

    doc.end()
  })
}
