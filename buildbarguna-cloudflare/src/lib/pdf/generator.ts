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

import { PDFDocument, PDFFont, rgb, StandardFonts, degrees, rgbColor } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

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
}

export interface ShareCertificate {
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
  
  // Try to load Noto Sans Bengali for Bangla text
  let banglaFont: PDFFont | null = null
  const origin = requestOrigin ?? 'https://buildbarguna-worker.rahmatullahzisan01.workers.dev'
  const fontBytes = await fetchAsset(origin, '/fonts/NotoSansBengali.ttf')
  if (fontBytes) {
    try {
      banglaFont = await pdfDoc.embedFont(fontBytes, { subset: true })
    } catch (e) {
      console.warn('Failed to embed Bangla font:', e)
    }
  }

  // ── Logo ───────────────────────────────────────────────────────────────
  let logoImage = null
  const logoBuf = logoBuffer ?? await fetchAsset(origin, '/bbi%20logo.jpg')
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
}

// ─── Share Certificate (Legacy support) ───────────────────────────────────

export async function generateShareCertificate(
  cert: ShareCertificate,
  logoBuffer?: ArrayBuffer,
  requestOrigin?: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let logoImage = null
  const origin = requestOrigin ?? 'https://buildbarguna-worker.rahmatullahzisan01.workers.dev'
  const logoBuf = logoBuffer ?? await fetchAsset(origin, '/bbi%20logo.jpg')
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

  let y = MARGIN + 20

  // Logo
  if (logoImage) {
    const logoSize = 60
    page.drawImage(logoImage, {
      x: (PAGE_W - logoSize) / 2,
      y: ty(y + logoSize),
      width: logoSize,
      height: logoSize,
    })
    y += logoSize + 15
  }

  // Title
  const title = 'SHARE CERTIFICATE'
  const titleSize = 20
  const titleW = helveticaBold.widthOfTextAtSize(title, titleSize)
  page.drawText(title, {
    x: (PAGE_W - titleW) / 2,
    y: ty(y + titleSize),
    font: helveticaBold,
    size: titleSize,
    color: COLORS.navy,
  })
  y += titleSize + 30

  // Certificate ID
  page.drawText(`Certificate ID: ${cert.certificate_id}`, {
    x: MARGIN + 30,
    y: ty(y + 10),
    font: helvetica,
    size: 10,
    color: COLORS.gray,
  })
  y += 25

  // Project
  page.drawText('Project:', { x: MARGIN + 30, y: ty(y + 10), font: helveticaBold, size: 11, color: COLORS.navy })
  page.drawText(cert.project_name, { x: MARGIN + 100, y: ty(y + 10), font: helvetica, size: 11, color: COLORS.black })
  y += 18

  // Member
  page.drawText('Member:', { x: MARGIN + 30, y: ty(y + 10), font: helveticaBold, size: 11, color: COLORS.navy })
  page.drawText(cert.user_name, { x: MARGIN + 100, y: ty(y + 10), font: helvetica, size: 11, color: COLORS.black })
  y += 18

  // Shares
  const sharesText = `Share Quantity: ${cert.share_quantity} shares`
  page.drawText(sharesText, { x: MARGIN + 30, y: ty(y + 10), font: helveticaBold, size: 11, color: COLORS.navy })
  y += 18

  // Amount
  const amountTaka = Math.floor(cert.total_amount_paisa / 100)
  const amountText = `Total Amount: ৳${amountTaka.toLocaleString('en-US')}`
  page.drawText(amountText, { x: MARGIN + 30, y: ty(y + 10), font: helvetica, size: 11, color: COLORS.black })
  y += 18

  // Date
  const dateText = `Purchase Date: ${new Date(cert.purchase_date).toLocaleDateString('en-GB')}`
  page.drawText(dateText, { x: MARGIN + 30, y: ty(y + 10), font: helvetica, size: 10, color: COLORS.gray })
  y += 18

  // Payment
  page.drawText(`Payment Method: ${cert.payment_method}`, { x: MARGIN + 30, y: ty(y + 10), font: helvetica, size: 10, color: COLORS.gray })

  return await pdfDoc.save()
}
