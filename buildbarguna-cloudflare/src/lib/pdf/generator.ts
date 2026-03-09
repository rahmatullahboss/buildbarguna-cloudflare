/**
 * PDF Certificate Generator — World Class Design
 * Build Barguna Initiative (BBI) Membership Certificate
 *
 * Uses pdf-lib + @pdf-lib/fontkit for full Unicode (Bangla) support.
 * 
 * Design Features:
 * - Professional certificate border with decorative corners
 * - BBI Logo at top center
 * - Off-white/cream background (#FFFEF5)
 * - Elegant typography with Helvetica + Noto Sans Bengali
 * - Both English and Bangla font support
 */

import { PDFDocument, PDFFont, rgb, StandardFonts, degrees } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

// ─── Bangla Font Loading ─────────────────────────────────────────────────────
// For Cloudflare Workers: use bundled font via wrangler module rules (type = "Data")
// For tests (vitest/node): fall back to loading from file or skip
let notoSansBengaliFontData: ArrayBuffer | null = null

try {
  // Dynamic import works in both Worker (bundled) and test environments
  const fontModule = await import('./fonts/NotoSansBengali.ttf')
  // Handle both default export and direct ArrayBuffer from wrangler bundling
  const fontData = fontModule.default || fontModule
  if (fontData && typeof fontData === 'object' && 'buffer' in fontData) {
    notoSansBengaliFontData = (fontData as { buffer: ArrayBuffer }).buffer
  } else if (fontData instanceof ArrayBuffer) {
    notoSansBengaliFontData = fontData
  }
} catch (e) {
  console.warn('[PDF] Could not load bundled Bangla font, will try fallback:', e)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemberRegistration {
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
  verified_at?: string
  verified_by_name?: string
  // Payment related fields
  declaration_accepted?: number
  payment_method?: string
  payment_amount?: number
  payment_status?: string
  bkash_number?: string
  bkash_trx_id?: string
  payment_note?: string
}

export interface ShareCertificate {
  certificate_id: string
  project_name: string
  share_quantity: number
  total_amount_paisa: number
  purchase_date: string
  user_name: string
  user_phone: string
  payment_method?: string
  form_number?: string
}

// ─── Asset helpers ─────────────────────────────────────────────────────────────

async function fetchAsset(origin: string, path: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`${origin}${path}`)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

// ─── Certificate ID Generation ────────────────────────────────────────────────

// Certificate ID format constants
const CERTIFICATE_ID_YEAR_DIGITS = 4
const CERTIFICATE_ID_SEQUENCE_DIGITS = 4
const CERTIFICATE_ID_PREFIX = 'BBI-SHARE'

/**
 * Generate a unique certificate ID in format: BBI-SHARE-YYYY-NNNN
 * @param year - The year for the certificate (defaults to current year)
 * @param sequence - Sequential number (should be unique per year, typically from database)
 * @returns Certificate ID in format BBI-SHARE-YYYY-NNNN
 */
export function generateCertificateId(year?: number, sequence?: number): string {
  const certYear = year ?? new Date().getFullYear()
  const certSeq = (sequence ?? 1).toString().padStart(CERTIFICATE_ID_SEQUENCE_DIGITS, '0')
  return `${CERTIFICATE_ID_PREFIX}-${certYear}-${certSeq}`
}

// ─── Color Palette ────────────────────────────────────────────────────────────

const COLORS = {
  // Primary colors
  cream: rgb(255/255, 254/255, 245/255),        // #FFFEF5 - Certificate background
  white: rgb(255/255, 255/255, 255/255),
  
  // Accent colors  
  gold: rgb(184/255, 134/255, 11/255),         // #B8860B - Gold accent
  darkGold: rgb(139/255, 90/255, 43/255),       // #8B5A2B - Dark gold
  
  // Text colors
  black: rgb(20/255, 20/255, 20/255),         // Near black
  darkGray: rgb(51/255, 51/255, 51/255),       // #333333
  gray: rgb(100/255, 100/255, 100/255),          // #646464
  lightGray: rgb(180/255, 180/255, 180/255),    // #B4B4B4
  
  // Brand colors
  navy: rgb(0/255, 51/255, 102/255),           // #003366 - Deep navy
  forest: rgb(34/255, 139/255, 34/255),         // #228B22 - Forest green
}

// ─── PDF Constants ────────────────────────────────────────────────────────────

const PAGE_H = 842  // A4 Portrait
const PAGE_W = 595
const MARGIN = 40

function ty(y: number): number {
  return PAGE_H - y
}

// ─── Member Registration Certificate ─────────────────────────────────────────

export async function generateMemberCertificate(
  reg: MemberRegistration,
  logoBuffer?: ArrayBuffer,
  requestOrigin?: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  // ── Fonts ───────────────────────────────────────────────────────────────
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helveticaItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
  
  // Load Noto Sans Bengali font from bundled module (bundled at build time via wrangler rules)
  let banglaFont: PDFFont | null = null
  const origin = requestOrigin ?? 'https://buildbarguna-worker.rahmatullahzisan01.workers.dev'
  
  // Try bundled font first (works in Workers)
  if (notoSansBengaliFontData) {
    try {
      banglaFont = await pdfDoc.embedFont(notoSansBengaliFontData)
    } catch (e) {
      console.warn('[PDF] Failed to embed bundled Bangla font:', e)
    }
  }
  
  // Fallback: try to fetch from self (works in production Workers at runtime)
  if (!banglaFont) {
    try {
      const fontBytes = await fetchAsset(origin, '/fonts/NotoSansBengali.ttf')
      if (fontBytes) {
        banglaFont = await pdfDoc.embedFont(fontBytes)
      }
    } catch (e) {
      console.warn('[PDF] Failed to fetch Bangla font from self:', e)
    }
  }

  // ── Logo ───────────────────────────────────────────────────────────────
  let logoImage = null
  // Try multiple paths since dist has "bbi logo.jpg" (with space)
  let logoBuf = logoBuffer
  if (!logoBuf) {
    // Try root path first (dist/bbi logo.jpg)
    logoBuf = await fetchAsset(origin, '/bbi%20logo.jpg') ?? undefined
    // Fallback to fonts path
    if (!logoBuf) {
      logoBuf = await fetchAsset(origin, '/fonts/bbi-logo.jpg') ?? undefined
    }
  }
  if (logoBuf) {
    try {
      logoImage = await pdfDoc.embedJpg(logoBuf)
    } catch { /* ignore */ }
  }

  // ── Page ────────────────────────────────────────────────────────────────
  const page = pdfDoc.addPage([PAGE_W, PAGE_H])
  
  // Fill background with cream color
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: COLORS.cream,
  })

  // ── Decorative Border ──────────────────────────────────────────────────
  drawDecorativeBorder(page)

  // ── Header Section ───────────────────────────────────────────────────────
  let y = MARGIN + 20

  // Logo (centered)
  if (logoImage) {
    const logoSize = 70
    page.drawImage(logoImage, {
      x: (PAGE_W - logoSize) / 2,
      y: ty(y + logoSize),
      width: logoSize,
      height: logoSize,
    })
    y += logoSize + 15
  }

  // Organization Name
  const orgName = 'Build Barguna Initiative (BBI)'
  const orgSize = 24
  const orgW = helveticaBold.widthOfTextAtSize(orgName, orgSize)
  page.drawText(orgName, {
    x: (PAGE_W - orgW) / 2,
    y: ty(y + orgSize),
    font: helveticaBold,
    size: orgSize,
    color: COLORS.navy,
  })
  y += orgSize + 5

  // Tagline
  const tagline = 'Barguna Sadar, Barguna, Bangladesh'
  const taglineSize = 11
  const taglineW = helvetica.widthOfTextAtSize(tagline, taglineSize)
  page.drawText(tagline, {
    x: (PAGE_W - taglineW) / 2,
    y: ty(y + taglineSize),
    font: helvetica,
    size: taglineSize,
    color: COLORS.gray,
  })
  y += taglineSize + 3

  // Contact info
  const contact = 'Email: bbi.official2025@gmail.com | Mobile: 01971951960'
  const contactSize = 9
  const contactW = helvetica.widthOfTextAtSize(contact, contactSize)
  page.drawText(contact, {
    x: (PAGE_W - contactW) / 2,
    y: ty(y + contactSize),
    font: helvetica,
    size: contactSize,
    color: COLORS.lightGray,
  })
  y += contactSize + 20

  // ── Certificate Title ────────────────────────────────────────────────────
  const certTitle = 'MEMBERSHIP CERTIFICATE'
  const certTitleSize = 22
  const certTitleW = helveticaBold.widthOfTextAtSize(certTitle, certTitleSize)
  page.drawText(certTitle, {
    x: (PAGE_W - certTitleW) / 2,
    y: ty(y + certTitleSize),
    font: helveticaBold,
    size: certTitleSize,
    color: COLORS.darkGold,
  })
  y += certTitleSize + 8

  // Certificate number
  const certNo = `Certificate No: ${reg.form_number}`
  const certNoSize = 10
  const certNoW = helvetica.widthOfTextAtSize(certNo, certNoSize)
  page.drawText(certNo, {
    x: (PAGE_W - certNoW) / 2,
    y: ty(y + certNoSize),
    font: helvetica,
    size: certNoSize,
    color: COLORS.gray,
  })
  y += certNoSize + 20

  // ── Divider Line ─────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: MARGIN + 50, y: ty(y) },
    end: { x: PAGE_W - MARGIN - 50, y: ty(y) },
    thickness: 1,
    color: COLORS.gold,
  })
  y += 15

  // ── Certificate Body ────────────────────────────────────────────────────
  const introText = 'This is to certify that'
  const introSize = 12
  const introW = helvetica.widthOfTextAtSize(introText, introSize)
  page.drawText(introText, {
    x: (PAGE_W - introW) / 2,
    y: ty(y + introSize),
    font: helvetica,
    size: introSize,
    color: COLORS.darkGray,
  })
  y += introSize + 15

  // Member Name (English)
  const memberName = reg.name_english
  const nameSize = 26
  const nameW = helveticaBold.widthOfTextAtSize(memberName, nameSize)
  page.drawText(memberName, {
    x: (PAGE_W - nameW) / 2,
    y: ty(y + nameSize),
    font: helveticaBold,
    size: nameSize,
    color: COLORS.black,
  })
  y += nameSize + 8

  // Member Name (Bangla) - if available
  if (reg.name_bangla && banglaFont) {
    const banglaSize = 18
    const banglaW = banglaFont.widthOfTextAtSize(reg.name_bangla, banglaSize)
    page.drawText(reg.name_bangla, {
      x: (PAGE_W - banglaW) / 2,
      y: ty(y + banglaSize),
      font: banglaFont,
      size: banglaSize,
      color: COLORS.navy,
    })
    y += banglaSize + 15
  } else {
    y += 15
  }

  // Has become a member text
  const memberText = 'has been accepted as a Member of'
  const memberTextSize = 12
  const memberTextW = helvetica.widthOfTextAtSize(memberText, memberTextSize)
  page.drawText(memberText, {
    x: (PAGE_W - memberTextW) / 2,
    y: ty(y + memberTextSize),
    font: helvetica,
    size: memberTextSize,
    color: COLORS.darkGray,
  })
  y += memberTextSize + 10

  // Organization again
  const orgAgain = 'Build Barguna Initiative (BBI)'
  const orgAgainSize = 16
  const orgAgainW = helveticaBold.widthOfTextAtSize(orgAgain, orgAgainSize)
  page.drawText(orgAgain, {
    x: (PAGE_W - orgAgainW) / 2,
    y: ty(y + orgAgainSize),
    font: helveticaBold,
    size: orgAgainSize,
    color: COLORS.navy,
  })
  y += orgAgainSize + 25

  // ── Member Details Section ────────────────────────────────────────────────
  drawMemberDetails(page, reg, banglaFont, helvetica, helveticaBold, y)

  y = PAGE_H - 200

  // ── Footer Section ────────────────────────────────────────────────────────
  // Divider
  page.drawLine({
    start: { x: MARGIN + 50, y: ty(y) },
    end: { x: PAGE_W - MARGIN - 50, y: ty(y) },
    thickness: 0.5,
    color: COLORS.lightGray,
  })
  y += 15

  // Verification status
  if (reg.verified_at) {
    const verifiedText = `Verified on: ${new Date(reg.verified_at).toLocaleDateString('en-GB')}`
    const verifiedSize = 9
    const verifiedW = helvetica.widthOfTextAtSize(verifiedText, verifiedSize)
    page.drawText(verifiedText, {
      x: (PAGE_W - verifiedW) / 2,
      y: ty(y + verifiedSize),
      font: helvetica,
      size: verifiedSize,
      color: COLORS.forest,
    })
    y += verifiedSize + 10
  }

  // Certificate date
  const issueDate = `Issued on: ${new Date(reg.created_at).toLocaleDateString('en-GB')}`
  const dateSize = 9
  const dateW = helvetica.widthOfTextAtSize(issueDate, dateSize)
  page.drawText(issueDate, {
    x: (PAGE_W - dateW) / 2,
    y: ty(y + dateSize),
    font: helvetica,
    size: dateSize,
    color: COLORS.gray,
  })
  y += dateSize + 25

  // ── Signature Section ────────────────────────────────────────────────────
  const sigY = y
  
  // Member signature area
  page.drawLine({
    start: { x: MARGIN + 30, y: ty(sigY) },
    end: { x: MARGIN + 150, y: ty(sigY) },
    thickness: 0.5,
    color: COLORS.lightGray,
  })
  page.drawText('Member Signature', {
    x: MARGIN + 30,
    y: ty(sigY + 5),
    font: helvetica,
    size: 8,
    color: COLORS.gray,
  })

  // Authorized signature area
  page.drawLine({
    start: { x: PAGE_W - MARGIN - 150, y: ty(sigY) },
    end: { x: PAGE_W - MARGIN - 30, y: ty(sigY) },
    thickness: 0.5,
    color: COLORS.lightGray,
  })
  page.drawText('Authorized Signature', {
    x: PAGE_W - MARGIN - 130,
    y: ty(sigY + 5),
    font: helvetica,
    size: 8,
    color: COLORS.gray,
  })

  // Seal placeholder
  const sealX = PAGE_W / 2 - 25
  page.drawCircle({
    x: sealX,
    y: ty(sigY + 15),
    size: 20,
    borderWidth: 1,
    borderColor: COLORS.darkGold,
    color: undefined,
  })
  page.drawText('OFFICIAL', {
    x: sealX - 18,
    y: ty(sigY + 17),
    font: helveticaBold,
    size: 6,
    color: COLORS.darkGold,
  })

  // ── Bottom Border ────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: MARGIN, y: ty(PAGE_H - 20) },
    end: { x: PAGE_W - MARGIN, y: ty(PAGE_H - 20) },
    thickness: 2,
    color: COLORS.gold,
  })

  return await pdfDoc.save()
}

// ─── Helper Functions ──────────────────────────────────────────────────────

function drawDecorativeBorder(page: any) {
  const borderMargin = 15
  const innerMargin = 20
  
  // Outer border (gold)
  page.drawRectangle({
    x: borderMargin,
    y: borderMargin,
    width: PAGE_W - borderMargin * 2,
    height: PAGE_H - borderMargin * 2,
    borderColor: COLORS.gold,
    borderWidth: 2,
  })
  
  // Inner border (thin gold)
  page.drawRectangle({
    x: innerMargin,
    y: innerMargin,
    width: PAGE_W - innerMargin * 2,
    height: PAGE_H - innerMargin * 2,
    borderColor: COLORS.gold,
    borderWidth: 0.5,
  })

  // Corner decorations
  const cornerSize = 20
  
  // Top-left corner
  page.drawLine({
    start: { x: borderMargin + 5, y: ty(borderMargin + 5) },
    end: { x: borderMargin + 5 + cornerSize, y: ty(borderMargin + 5) },
    thickness: 2,
    color: COLORS.gold,
  })
  page.drawLine({
    start: { x: borderMargin + 5, y: ty(borderMargin + 5) },
    end: { x: borderMargin + 5, y: ty(borderMargin + 5 + cornerSize) },
    thickness: 2,
    color: COLORS.gold,
  })

  // Top-right corner
  page.drawLine({
    start: { x: PAGE_W - borderMargin - 5, y: ty(borderMargin + 5) },
    end: { x: PAGE_W - borderMargin - 5 - cornerSize, y: ty(borderMargin + 5) },
    thickness: 2,
    color: COLORS.gold,
  })
  page.drawLine({
    start: { x: PAGE_W - borderMargin - 5, y: ty(borderMargin + 5) },
    end: { x: PAGE_W - borderMargin - 5, y: ty(borderMargin + 5 + cornerSize) },
    thickness: 2,
    color: COLORS.gold,
  })

  // Bottom-left corner
  page.drawLine({
    start: { x: borderMargin + 5, y: ty(PAGE_H - borderMargin - 5) },
    end: { x: borderMargin + 5 + cornerSize, y: ty(PAGE_H - borderMargin - 5) },
    thickness: 2,
    color: COLORS.gold,
  })
  page.drawLine({
    start: { x: borderMargin + 5, y: ty(PAGE_H - borderMargin - 5) },
    end: { x: borderMargin + 5, y: ty(PAGE_H - borderMargin - 5 - cornerSize) },
    thickness: 2,
    color: COLORS.gold,
  })

  // Bottom-right corner
  page.drawLine({
    start: { x: PAGE_W - borderMargin - 5, y: ty(PAGE_H - borderMargin - 5) },
    end: { x: PAGE_W - borderMargin - 5 - cornerSize, y: ty(PAGE_H - borderMargin - 5) },
    thickness: 2,
    color: COLORS.gold,
  })
  page.drawLine({
    start: { x: PAGE_W - borderMargin - 5, y: ty(PAGE_H - borderMargin - 5) },
    end: { x: PAGE_W - borderMargin - 5, y: ty(PAGE_H - borderMargin - 5 - cornerSize) },
    thickness: 2,
    color: COLORS.gold,
  })
}

function drawMemberDetails(
  page: any, 
  reg: MemberRegistration, 
  banglaFont: PDFFont | null,
  helvetica: PDFFont,
  helveticaBold: PDFFont,
  startY: number
) {
  let y = startY
  const labelCol = MARGIN + 30
  const valueCol = MARGIN + 130
  
  // Helper to detect Bangla
  function hasBangla(s: string): boolean {
    return /[\u0980-\u09FF]/.test(s)
  }
  
  // Helper to draw a field
  function drawField(label: string, value: string | undefined | null, forceBangla = false) {
    if (!value) return
    
    // Check if value contains Bangla or forceBangla is set
    const useBangla = forceBangla || (banglaFont && hasBangla(value))
    const font = useBangla ? banglaFont! : helvetica
    const size = useBangla ? 11 : 10
    
    page.drawText(label, {
      x: labelCol,
      y: ty(y + size),
      font: helveticaBold,
      size: size,
      color: COLORS.navy,
    })
    
    const valSize = useBangla ? 11 : 10
    page.drawText(value, {
      x: valueCol,
      y: ty(y + valSize),
      font: font,
      size: valSize,
      color: COLORS.black,
    })
    
    // Underline
    page.drawLine({
      start: { x: valueCol, y: ty(y + valSize + 3) },
      end: { x: valueCol + Math.max(200, font.widthOfTextAtSize(value, valSize)), y: ty(y + valSize + 3) },
      thickness: 0.3,
      color: COLORS.lightGray,
    })
    
    y += 18
  }

  // Parents - these may contain Bangla
  drawField("Father's Name:", reg.father_name)
  drawField("Mother's Name:", reg.mother_name)
  
  // Personal
  drawField("Date of Birth:", reg.date_of_birth)
  drawField("Blood Group:", reg.blood_group)
  
  // Address - auto-detect Bangla
  y += 5
  drawField("Present Address:", reg.present_address)
  drawField("Permanent Address:", reg.permanent_address)
  
  // Contact
  y += 5
  drawField("Mobile/WhatsApp:", reg.mobile_whatsapp)
  if (reg.emergency_contact) {
    drawField("Emergency Contact:", reg.emergency_contact)
  }
  if (reg.email) {
    drawField("Email:", reg.email)
  }
  if (reg.facebook_id) {
    drawField("Facebook ID:", reg.facebook_id)
  }
  
  // Skills - auto-detect Bangla
  if (reg.skills_interests) {
    y += 5
    drawField("Skills & Interests:", reg.skills_interests)
  }
  
  // Declaration - only show if accepted
  if (reg.declaration_accepted) {
    y += 8
    page.drawText('[x] Declaration Accepted', {
      x: MARGIN + 30,
      y: ty(y + 10),
      font: helveticaBold,
      size: 10,
      color: COLORS.forest,
    })
  }
}

// ─── Share Certificate (High Quality Design) ───────────────────────────────────

export async function generateShareCertificate(
  cert: ShareCertificate,
  logoBuffer?: ArrayBuffer,
  requestOrigin?: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Load Noto Sans Bengali font - try bundled first, then fallback to self-fetch
  let banglaFont: PDFFont | null = null
  const origin = requestOrigin ?? 'https://buildbarguna-worker.rahmatullahzisan01.workers.dev'
  
  // Try bundled font first (works in Workers)
  if (notoSansBengaliFontData) {
    try {
      banglaFont = await pdfDoc.embedFont(notoSansBengaliFontData)
    } catch (e) {
      console.warn('[PDF] Failed to embed bundled Bangla font:', e)
    }
  }
  
  // Fallback: try to fetch from self (works in production Workers at runtime)
  if (!banglaFont) {
    try {
      const fontBytes = await fetchAsset(origin, '/fonts/NotoSansBengali.ttf')
      if (fontBytes) {
        banglaFont = await pdfDoc.embedFont(fontBytes)
      }
    } catch (e) {
      console.warn('[PDF] Failed to fetch Bangla font from self:', e)
    }
  }

  // Logo - check multiple paths since dist has "bbi logo.jpg" (with space)
  let logoImage = null
  let logoBuf = logoBuffer
  if (!logoBuf) {
    // Try root path first (dist/bbi logo.jpg)
    logoBuf = await fetchAsset(origin, '/bbi%20logo.jpg') ?? undefined
    // Fallback to fonts path
    if (!logoBuf) {
      logoBuf = await fetchAsset(origin, '/fonts/bbi-logo.jpg') ?? undefined
    }
  }
  if (logoBuf) {
    try {
      logoImage = await pdfDoc.embedJpg(logoBuf)
    } catch { /* ignore */ }
  }

  const page = pdfDoc.addPage([PAGE_W, PAGE_H])
  
  // Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: COLORS.cream,
  })

  // Decorative Border
  drawDecorativeBorder(page)

  // Helper to detect Bangla
  function hasBangla(s: string): boolean {
    return /[\u0980-\u09FF]/.test(s)
  }

  // Helper to choose font - with safety check
  function fontFor(s: string, bold = false): PDFFont {
    const textHasBangla = hasBangla(s)
    if (textHasBangla) {
      if (banglaFont) {
        return banglaFont
      }
      // CRITICAL: Text has Bangla but no Bangla font available
      // This will cause WinAnsi encoding error - log and use fallback
      console.error('[PDF] WARNING: Text contains Bangla but no Bangla font loaded. Text:', s.substring(0, 50))
      // We must still return a font, but this will likely cause an encoding error
      // The real fix is to ensure the font is loaded before reaching here
    }
    return bold ? helveticaBold : helvetica
  }
  
  // Pre-check: if user_name or project_name has Bangla but font failed to load,
  // strip Bangla characters and show a Latin-only fallback rather than crashing with 500.
  function stripBangla(s: string): string {
    // Replace Bengali Unicode block (U+0980–U+09FF) with empty string
    const stripped = s.replace(/[\u0980-\u09FF]+/g, '').replace(/\s+/g, ' ').trim()
    // Return stripped version (may be empty string) — do NOT fall back to original Bengali
    // An empty/placeholder is safer than passing Bengali to WinAnsi Helvetica font
    return stripped || '[Name]'
  }

  let displayUserName = cert.user_name
  let displayProjectName = cert.project_name

  if (!banglaFont) {
    if (hasBangla(cert.user_name))    displayUserName    = stripBangla(cert.user_name)
    if (hasBangla(cert.project_name)) displayProjectName = stripBangla(cert.project_name)
    if (displayUserName !== cert.user_name || displayProjectName !== cert.project_name) {
      console.warn('[PDF] Bangla font unavailable — Bengali stripped from name/project for share cert')
    }
  }

  let y = MARGIN + 25

  // Logo (centered)
  if (logoImage) {
    const logoSize = 65
    page.drawImage(logoImage, {
      x: (PAGE_W - logoSize) / 2,
      y: ty(y + logoSize),
      width: logoSize,
      height: logoSize,
    })
    y += logoSize + 12
  }

  // Organization Name
  const orgName = 'Build Barguna Initiative (BBI)'
  const orgSize = 22
  const orgW = helveticaBold.widthOfTextAtSize(orgName, orgSize)
  page.drawText(orgName, {
    x: (PAGE_W - orgW) / 2,
    y: ty(y + orgSize),
    font: helveticaBold,
    size: orgSize,
    color: COLORS.navy,
  })
  y += orgSize + 5

  // Tagline
  const tagline = 'Barguna Sadar, Barguna, Bangladesh'
  const taglineSize = 10
  const taglineW = helvetica.widthOfTextAtSize(tagline, taglineSize)
  page.drawText(tagline, {
    x: (PAGE_W - taglineW) / 2,
    y: ty(y + taglineSize),
    font: helvetica,
    size: taglineSize,
    color: COLORS.gray,
  })
  y += taglineSize + 20

  // ── Certificate Title ───────────────────────────────────────────────
  const certTitle = 'SHARE CERTIFICATE'
  const certTitleSize = 20
  const certTitleW = helveticaBold.widthOfTextAtSize(certTitle, certTitleSize)
  page.drawText(certTitle, {
    x: (PAGE_W - certTitleW) / 2,
    y: ty(y + certTitleSize),
    font: helveticaBold,
    size: certTitleSize,
    color: COLORS.darkGold,
  })
  y += certTitleSize + 8

  // Certificate ID
  const certNo = `Certificate No: ${cert.certificate_id}`
  const certNoSize = 10
  const certNoW = helvetica.widthOfTextAtSize(certNo, certNoSize)
  page.drawText(certNo, {
    x: (PAGE_W - certNoW) / 2,
    y: ty(y + certNoSize),
    font: helvetica,
    size: certNoSize,
    color: COLORS.gray,
  })
  y += certNoSize + 20

  // ── Divider Line ──────────────────────────────────────────────────
  page.drawLine({
    start: { x: MARGIN + 50, y: ty(y) },
    end: { x: PAGE_W - MARGIN - 50, y: ty(y) },
    thickness: 1,
    color: COLORS.gold,
  })
  y += 15

  // ── Certificate Body ──────────────────────────────────────────────
  const introText = 'This is to certify that'
  const introSize = 11
  const introW = helvetica.widthOfTextAtSize(introText, introSize)
  page.drawText(introText, {
    x: (PAGE_W - introW) / 2,
    y: ty(y + introSize),
    font: helvetica,
    size: introSize,
    color: COLORS.darkGray,
  })
  y += introSize + 12

  // Member Name - check for Bangla
  const memberFont = fontFor(displayUserName, true)
  const memberName = displayUserName
  const nameSize = 22
  const nameW = memberFont.widthOfTextAtSize(memberName, nameSize)
  page.drawText(memberName, {
    x: (PAGE_W - nameW) / 2,
    y: ty(y + nameSize),
    font: memberFont,
    size: nameSize,
    color: COLORS.black,
  })
  y += nameSize + 12

  // has purchased shares
  const shareText = 'has purchased share(s) in'
  const shareTextSize = 11
  const shareTextW = helvetica.widthOfTextAtSize(shareText, shareTextSize)
  page.drawText(shareText, {
    x: (PAGE_W - shareTextW) / 2,
    y: ty(y + shareTextSize),
    font: helvetica,
    size: shareTextSize,
    color: COLORS.darkGray,
  })
  y += shareTextSize + 10

  // Project Name - check for Bangla
  const projectFont = fontFor(displayProjectName, true)
  const projectName = displayProjectName
  const projectSize = 16
  const projectW = projectFont.widthOfTextAtSize(projectName, projectSize)
  page.drawText(projectName, {
    x: (PAGE_W - projectW) / 2,
    y: ty(y + projectSize),
    font: projectFont,
    size: projectSize,
    color: COLORS.navy,
  })
  y += projectSize + 25

  // ── Share Details Section ─────────────────────────────────────────
  drawShareDetails(page, cert, helvetica, helveticaBold, banglaFont, y)

  y = PAGE_H - 180

  // ── Footer Section ────────────────────────────────────────────────
  page.drawLine({
    start: { x: MARGIN + 50, y: ty(y) },
    end: { x: PAGE_W - MARGIN - 50, y: ty(y) },
    thickness: 0.5,
    color: COLORS.lightGray,
  })
  y += 15

  // Purchase Date
  const dateText = `Purchase Date: ${new Date(cert.purchase_date).toLocaleDateString('en-GB')}`
  const dateSize = 9
  const dateW = helvetica.widthOfTextAtSize(dateText, dateSize)
  page.drawText(dateText, {
    x: (PAGE_W - dateW) / 2,
    y: ty(y + dateSize),
    font: helvetica,
    size: dateSize,
    color: COLORS.gray,
  })
  y += dateSize + 20

  // ── Signature Section ───────────────────────────────────────────
  const sigY = y
  
  // Member signature area
  page.drawLine({
    start: { x: MARGIN + 30, y: ty(sigY) },
    end: { x: MARGIN + 150, y: ty(sigY) },
    thickness: 0.5,
    color: COLORS.lightGray,
  })
  page.drawText('Investor Signature', {
    x: MARGIN + 30,
    y: ty(sigY + 5),
    font: helvetica,
    size: 8,
    color: COLORS.gray,
  })

  // Authorized signature area
  page.drawLine({
    start: { x: PAGE_W - MARGIN - 150, y: ty(sigY) },
    end: { x: PAGE_W - MARGIN - 30, y: ty(sigY) },
    thickness: 0.5,
    color: COLORS.lightGray,
  })
  page.drawText('Authorized Signature', {
    x: PAGE_W - MARGIN - 120,
    y: ty(sigY + 5),
    font: helvetica,
    size: 8,
    color: COLORS.gray,
  })

  // Seal placeholder
  const sealX = PAGE_W / 2 - 20
  page.drawCircle({
    x: sealX,
    y: ty(sigY + 12),
    size: 18,
    borderWidth: 1,
    borderColor: COLORS.darkGold,
    color: undefined,
  })
  page.drawText('OFFICIAL', {
    x: sealX - 15,
    y: ty(sigY + 14),
    font: helveticaBold,
    size: 5,
    color: COLORS.darkGold,
  })

  // ── Bottom Border ────────────────────────────────────────────────
  page.drawLine({
    start: { x: MARGIN, y: ty(PAGE_H - 20) },
    end: { x: PAGE_W - MARGIN, y: ty(PAGE_H - 20) },
    thickness: 2,
    color: COLORS.gold,
  })

  return await pdfDoc.save()
}

// ─── Helper: Draw Share Details ───────────────────────────────────

function drawShareDetails(
  page: any, 
  cert: ShareCertificate,
  helvetica: PDFFont,
  helveticaBold: PDFFont,
  banglaFont: PDFFont | null,
  startY: number
) {
  let y = startY
  const labelCol = MARGIN + 50
  const valueCol = MARGIN + 180
  
  // Helper to detect Bangla
  function hasBangla(s: string): boolean {
    return /[\u0980-\u09FF]/.test(s)
  }
  
  // Helper to choose font - only use Bangla font if actually available
  function fontFor(s: string, bold = false): PDFFont {
    // Only use Bangla font if it's actually loaded (not null)
    if (banglaFont && hasBangla(s)) {
      return banglaFont
    }
    // If text has Bangla but no font, use fallback (helvetica) - will show garbled but won't crash
    return bold ? helveticaBold : helvetica
  }
  
  // Helper to draw a field
  function drawField(label: string, value: string) {
    if (!value) return  // Skip null/undefined/empty
    const valueFont = fontFor(value)
    
    page.drawText(label, {
      x: labelCol,
      y: ty(y + 10),
      font: helveticaBold,
      size: 10,
      color: COLORS.navy,
    })
    
    page.drawText(value, {
      x: valueCol,
      y: ty(y + 10),
      font: valueFont,
      size: 10,
      color: COLORS.black,
    })
    
    // Underline
    page.drawLine({
      start: { x: valueCol, y: ty(y + 7) },
      end: { x: valueCol + 250, y: ty(y + 7) },
      thickness: 0.3,
      color: COLORS.lightGray,
    })
    
    y += 18
  }

  // Share Details
  const sharesText = `${cert.share_quantity} Share(s)`
  drawField('Share Quantity:', sharesText)

  const amountTaka = Math.floor(cert.total_amount_paisa / 100)
  // Use BDT instead of ৳ symbol - ASCII safe, works without Bangla font
  const amountText = `BDT ${amountTaka.toLocaleString('en-US')} (${cert.total_amount_paisa} paisa)`
  drawField('Total Investment:', amountText)

  drawField('Payment Method:', (cert.payment_method && cert.payment_method.trim()) || 'N/A')

  if (cert.form_number) {
    drawField('Form Number:', cert.form_number)
  }
}
