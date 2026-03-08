/**
 * PDF Certificate Generator — Cloudflare Workers compatible
 *
 * Uses pdf-lib + @pdf-lib/fontkit for full Unicode (Bangla) support.
 * Matches the BBI Member Registration Form design exactly.
 *
 * Font strategy:
 *  - Latin text: Helvetica (built-in, no embedding needed)
 *  - Bangla text: Noto Sans Bengali TTF fetched from static assets
 *  - Logo: JPEG fetched from static assets or passed as buffer
 */

import { PDFDocument, PDFFont, rgb, StandardFonts, degrees } from 'pdf-lib'
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

// ─── Point helpers ─────────────────────────────────────────────────────────────

// pdf-lib uses bottom-left origin. Page height = 841.89 (A4).
// We work top-down and convert at draw time.
const PAGE_H = 841.89
const PAGE_W = 595.28
const MARGIN = 45

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

  // ── Fonts ──────────────────────────────────────────────────────────────────
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

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

  // ── Logo ───────────────────────────────────────────────────────────────────
  let logoImage = null
  const logoBuf = logoBuffer ?? await fetchAsset(origin, '/bbi%20logo.jpg')
  if (logoBuf) {
    try {
      logoImage = await pdfDoc.embedJpg(logoBuf)
    } catch { /* ignore */ }
  }

  // ── Page ───────────────────────────────────────────────────────────────────
  const page = pdfDoc.addPage([PAGE_W, PAGE_H])

  const black = rgb(0, 0, 0)
  const gray = rgb(0.5, 0.5, 0.5)
  const lightGray = rgb(0.8, 0.8, 0.8)

  // ── Logo placement ─────────────────────────────────────────────────────────
  let y = MARGIN

  if (logoImage) {
    // Top-left logo: 55x55 pt
    page.drawImage(logoImage, {
      x: MARGIN,
      y: ty(y + 55),
      width: 55,
      height: 55,
    })

    // Center watermark — faded
    page.drawImage(logoImage, {
      x: (PAGE_W - 200) / 2,
      y: ty((PAGE_H + 200) / 2),
      width: 200,
      height: 200,
      opacity: 0.07,
    })
  }

  // ── Org header ─────────────────────────────────────────────────────────────
  const headerX = MARGIN + 65  // right of logo

  function centeredText(text: string, ty_y: number, font: PDFFont, size: number) {
    const w = font.widthOfTextAtSize(text, size)
    const x = headerX + (PAGE_W - headerX - MARGIN - w) / 2
    page.drawText(text, { x, y: ty(ty_y + size * 0.8), font, size, color: black })
  }

  centeredText('Build Barguna Initiative (BBI)', y + 4, helveticaBold, 15)
  centeredText('Barguna Sadar, Barguna', y + 22, helvetica, 10)
  centeredText('Email:bbi.official2025@gmail.com', y + 34, helvetica, 10)
  centeredText('Mobile:01971951960', y + 46, helvetica, 10)

  y = MARGIN + 62

  // Thick horizontal rule
  page.drawLine({ start: { x: MARGIN, y: ty(y) }, end: { x: PAGE_W - MARGIN, y: ty(y) }, thickness: 1, color: black })
  y += 10

  // Title
  const titleText = 'Member  Registration Form'
  const titleSize = 14
  const titleW = helveticaBold.widthOfTextAtSize(titleText, titleSize)
  const titleX = (PAGE_W - titleW) / 2
  page.drawText(titleText, { x: titleX, y: ty(y + titleSize), font: helveticaBold, size: titleSize, color: black })

  // Underline the title
  page.drawLine({
    start: { x: titleX, y: ty(y + titleSize + 3) },
    end: { x: titleX + titleW, y: ty(y + titleSize + 3) },
    thickness: 0.8,
    color: black,
  })

  y += titleSize + 8
  page.drawLine({ start: { x: MARGIN, y: ty(y) }, end: { x: PAGE_W - MARGIN, y: ty(y) }, thickness: 0.4, color: gray })
  y += 10

  // ── Field layout helpers ───────────────────────────────────────────────────
  const labelSize = 10
  const valueSize = 9.5
  const rowH = 20
  const underlineRight = PAGE_W - MARGIN

  // Detect if a string contains Bangla characters
  function hasBangla(s: string): boolean {
    return /[\u0980-\u09FF]/.test(s)
  }

  // Choose font for a string
  function fontFor(s: string, bold = false): PDFFont {
    if (banglaFont && hasBangla(s)) return banglaFont
    return bold ? helveticaBold : helvetica
  }

  /**
   * Draw a label + value on the same row, with an underline.
   * @param label   Bold label text
   * @param value   Value text (Bangla-aware)
   * @param labelX  X position of label
   * @param valueX  X position where value starts / underline starts
   * @param endX    X position where underline ends
   */
  function drawField(label: string, value: string | undefined | null, labelX: number, valueX: number, endX: number) {
    // Label
    page.drawText(`${label}:`, {
      x: labelX,
      y: ty(y + labelSize),
      font: helveticaBold,
      size: labelSize,
      color: black,
    })

    // Value (if present)
    if (value) {
      const vFont = fontFor(value)
      // Clip value width to available space
      const maxW = endX - valueX - 4
      let displayValue = value
      while (displayValue.length > 0 && vFont.widthOfTextAtSize(displayValue, valueSize) > maxW) {
        displayValue = displayValue.slice(0, -1)
      }
      page.drawText(displayValue, {
        x: valueX,
        y: ty(y + valueSize),
        font: vFont,
        size: valueSize,
        color: black,
      })
    }

    // Underline (dashed line below the field)
    page.drawLine({
      start: { x: valueX, y: ty(y + rowH - 4) },
      end: { x: endX, y: ty(y + rowH - 4) },
      thickness: 0.4,
      color: lightGray,
      dashArray: [2, 2],
    })
  }

  // ── Form fields ─────────────────────────────────────────────────────────────

  // Form No + Date row (no underline, just text)
  const dateStr = new Date(reg.created_at).toLocaleDateString('en-GB')
  page.drawText(`Form NO: [ ${reg.form_number} ]`, {
    x: MARGIN, y: ty(y + labelSize), font: helveticaBold, size: labelSize, color: black,
  })
  const dateLabelW = helveticaBold.widthOfTextAtSize('Date:', labelSize)
  const dateValW = helvetica.widthOfTextAtSize(dateStr, labelSize)
  page.drawText('Date:', {
    x: underlineRight - dateLabelW - dateValW - 4,
    y: ty(y + labelSize), font: helveticaBold, size: labelSize, color: black,
  })
  page.drawText(dateStr, {
    x: underlineRight - dateValW,
    y: ty(y + labelSize), font: helvetica, size: labelSize, color: black,
  })
  y += rowH

  drawField("Name (English)", reg.name_english, MARGIN, MARGIN + 110, underlineRight)
  y += rowH

  drawField("Name (Bangla)", reg.name_bangla, MARGIN, MARGIN + 105, underlineRight)
  y += rowH

  drawField("Father's Name", reg.father_name, MARGIN, MARGIN + 102, underlineRight)
  y += rowH

  drawField("Mother's Name", reg.mother_name, MARGIN, MARGIN + 102, underlineRight)
  y += rowH

  // Date of Birth + Blood Group on same row
  const midX = MARGIN + 290
  drawField("Date of Birth", reg.date_of_birth, MARGIN, MARGIN + 88, midX - 6)
  drawField("Blood Group", reg.blood_group, midX, midX + 85, underlineRight)
  y += rowH

  // Skills & Interests (multiline)
  page.drawText('Skills & Interests:', {
    x: MARGIN, y: ty(y + labelSize), font: helveticaBold, size: labelSize, color: black,
  })
  y += 16

  const skills = reg.skills_interests || ''
  const skillFont = fontFor(skills)
  const maxLineW = underlineRight - MARGIN - 4
  const skillWords = skills.split(' ')
  let skillLine = ''
  const skillLines: string[] = []
  for (const w of skillWords) {
    const test = skillLine ? `${skillLine} ${w}` : w
    if (skillFont.widthOfTextAtSize(test, valueSize) > maxLineW) {
      if (skillLine) skillLines.push(skillLine)
      skillLine = w
    } else {
      skillLine = test
    }
  }
  if (skillLine) skillLines.push(skillLine)
  if (skillLines.length === 0) skillLines.push('')

  for (let i = 0; i < Math.max(skillLines.length, 1); i++) {
    const sl = skillLines[i] || ''
    if (sl) {
      page.drawText(sl, { x: MARGIN, y: ty(y + valueSize), font: skillFont, size: valueSize, color: black })
    }
    page.drawLine({ start: { x: MARGIN, y: ty(y + 15) }, end: { x: underlineRight, y: ty(y + 15) }, thickness: 0.4, color: lightGray, dashArray: [2, 2] })
    y += 16
  }

  y += 4
  page.drawLine({ start: { x: MARGIN, y: ty(y) }, end: { x: PAGE_W - MARGIN, y: ty(y) }, thickness: 0.4, color: gray })
  y += 8

  drawField("Present Address", reg.present_address, MARGIN, MARGIN + 112, underlineRight)
  y += rowH

  drawField("Permanent Address", reg.permanent_address, MARGIN, MARGIN + 120, underlineRight)
  y += rowH

  drawField("Facebook ID Name", reg.facebook_id, MARGIN, MARGIN + 118, underlineRight)
  y += rowH

  // Mobile + Emergency on same row
  const mid2X = MARGIN + 315
  drawField("Mobile No (WhatsApp)", reg.mobile_whatsapp, MARGIN, MARGIN + 138, mid2X - 6)
  drawField("(Guardian/Emergency)", reg.emergency_contact, mid2X, mid2X + 142, underlineRight)
  y += rowH

  drawField("E-mail", reg.email, MARGIN, MARGIN + 52, underlineRight)
  y += rowH + 6

  // ── Declaration ────────────────────────────────────────────────────────────
  // "Undertaking & Declaration:" bold + rest normal
  const uLabel = 'Undertaking & Declaration: '
  const uLabelW = helveticaBold.widthOfTextAtSize(uLabel, 10)
  page.drawText(uLabel, { x: MARGIN, y: ty(y + 10), font: helveticaBold, size: 10, color: black })
  page.drawText('I certify that the information provided is correct. As a member of', {
    x: MARGIN + uLabelW, y: ty(y + 10), font: helvetica, size: 10, color: black,
  })
  y += 13
  page.drawText('Build Barguna Initiative (BBI)', { x: MARGIN, y: ty(y + 10), font: helveticaBold, size: 10, color: black })
  const bbiW = helveticaBold.widthOfTextAtSize('Build Barguna Initiative (BBI)', 10)
  page.drawText(', I pledge to:', { x: MARGIN + bbiW, y: ty(y + 10), font: helvetica, size: 10, color: black })
  y += 13

  const pledges = [
    "Follow the organization's rules, regulations, and decisions.",
    'Maintain the highest ethical standards and discipline.',
    'Grant permission to BBI to use my photographs/videos for promotional purposes.',
    'Accept that the Governing Body has the full authority to terminate my membership for misconduct.',
  ]
  for (const p of pledges) {
    page.drawText(`\u2022  ${p}`, { x: MARGIN + 10, y: ty(y + 9.5), font: helvetica, size: 9.5, color: black })
    y += 13
  }

  // ── Signature lines ────────────────────────────────────────────────────────
  const sigY = Math.max(y + 18, PAGE_H - 80)
  const sigLineLen = 155

  page.drawLine({ start: { x: MARGIN, y: ty(sigY) }, end: { x: MARGIN + sigLineLen, y: ty(sigY) }, thickness: 0.7, color: black })
  page.drawLine({ start: { x: PAGE_W - MARGIN - sigLineLen, y: ty(sigY) }, end: { x: PAGE_W - MARGIN, y: ty(sigY) }, thickness: 0.7, color: black })

  page.drawText("Authority's  Signature", { x: MARGIN, y: ty(sigY + 13), font: helvetica, size: 10, color: black })
  page.drawText("Applicant's Signature", { x: PAGE_W - MARGIN - sigLineLen, y: ty(sigY + 13), font: helvetica, size: 10, color: black })

  return await pdfDoc.save()
}

// ─── Share Certificate ─────────────────────────────────────────────────────────

export async function generateShareCertificate(
  cert: ShareCertificate,
  logoBuffer?: ArrayBuffer,
  requestOrigin?: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

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

  let logoImage = null
  const logoBuf = logoBuffer ?? await fetchAsset(origin, '/bbi%20logo.jpg')
  if (logoBuf) {
    try { logoImage = await pdfDoc.embedJpg(logoBuf) } catch { /* ignore */ }
  }

  const page = pdfDoc.addPage([PAGE_W, PAGE_H])
  const black = rgb(0, 0, 0)
  const gray = rgb(0.5, 0.5, 0.5)
  const darkBlue = rgb(0.12, 0.22, 0.45)

  let y = MARGIN

  if (logoImage) {
    page.drawImage(logoImage, { x: MARGIN, y: ty(y + 55), width: 55, height: 55 })
    page.drawImage(logoImage, { x: (PAGE_W - 200) / 2, y: ty((PAGE_H + 200) / 2), width: 200, height: 200, opacity: 0.07 })
  }

  const headerX = MARGIN + 65
  function centeredText(t: string, yOff: number, font: PDFFont, size: number, color = black) {
    const w = font.widthOfTextAtSize(t, size)
    const x = headerX + (PAGE_W - headerX - MARGIN - w) / 2
    page.drawText(t, { x, y: ty(y + yOff + size * 0.8), font, size, color })
  }

  centeredText('Build Barguna Initiative (BBI)', 4, helveticaBold, 15)
  centeredText('Barguna Sadar, Barguna', 22, helvetica, 10)
  centeredText('Email: bbi.official2025@gmail.com  |  Mobile: 01971951960', 34, helvetica, 10)

  y += 62
  page.drawLine({ start: { x: MARGIN, y: ty(y) }, end: { x: PAGE_W - MARGIN, y: ty(y) }, thickness: 1, color: black })
  y += 12

  const titleText = 'Share Purchase Certificate'
  const titleW = helveticaBold.widthOfTextAtSize(titleText, 16)
  page.drawText(titleText, { x: (PAGE_W - titleW) / 2, y: ty(y + 16), font: helveticaBold, size: 16, color: darkBlue })
  y += 22

  const certIdText = `Certificate No: ${cert.certificate_id}`
  const certIdW = helvetica.widthOfTextAtSize(certIdText, 11)
  page.drawText(certIdText, { x: (PAGE_W - certIdW) / 2, y: ty(y + 11), font: helvetica, size: 11, color: gray })
  y += 18

  page.drawLine({ start: { x: MARGIN, y: ty(y) }, end: { x: PAGE_W - MARGIN, y: ty(y) }, thickness: 0.8, color: darkBlue })
  y += 18

  const col1 = MARGIN + 10
  const col2 = MARGIN + 175
  const rowH = 26

  function row(label: string, value: string) {
    page.drawText(`${label}:`, { x: col1, y: ty(y + 11), font: helveticaBold, size: 11, color: black })
    const vFont = (banglaFont && /[\u0980-\u09FF]/.test(value)) ? banglaFont : helvetica
    page.drawText(value, { x: col2, y: ty(y + 11), font: vFont, size: 11, color: darkBlue })
    y += rowH
  }

  row('Project', cert.project_name)
  row('Shares', cert.share_quantity.toString())
  row('Total Investment', `BDT ${(cert.total_amount_paisa / 100).toFixed(2)}`)
  row('Purchase Date', new Date(cert.purchase_date).toLocaleDateString('en-GB'))
  row('Payment Method', cert.payment_method === 'bkash' ? 'bKash' : 'Manual/Cash')
  row('Member Name', cert.user_name)
  row('Phone', cert.user_phone)
  if (cert.form_number) row('Member Form No', cert.form_number)

  y += 6
  page.drawLine({ start: { x: MARGIN, y: ty(y) }, end: { x: PAGE_W - MARGIN, y: ty(y) }, thickness: 0.5, color: gray })
  y += 14

  page.drawText('Terms & Conditions:', { x: col1, y: ty(y + 10), font: helveticaBold, size: 10, color: black })
  y += 16
  const terms = [
    'This certificate is valid only after payment verification by BBI admin.',
    'Share allocation is subject to project terms and conditions.',
    'Profit distribution will be as per project guidelines.',
    'BBI reserves the right to modify terms with prior notice.',
  ]
  for (const t of terms) {
    page.drawText(`\u2022  ${t}`, { x: col1 + 5, y: ty(y + 9), font: helvetica, size: 9, color: black })
    y += 14
  }

  const sigY = Math.max(y + 20, PAGE_H - 120)
  const sigLen = 160
  page.drawLine({ start: { x: MARGIN + 10, y: ty(sigY) }, end: { x: MARGIN + 10 + sigLen, y: ty(sigY) }, thickness: 0.7, color: black })
  page.drawLine({ start: { x: PAGE_W - MARGIN - 10 - sigLen, y: ty(sigY) }, end: { x: PAGE_W - MARGIN - 10, y: ty(sigY) }, thickness: 0.7, color: black })
  page.drawText('For Build Barguna Initiative (BBI)', { x: MARGIN + 10, y: ty(sigY + 11), font: helvetica, size: 9, color: black })
  page.drawText('Member Signature', { x: PAGE_W - MARGIN - 10 - sigLen, y: ty(sigY + 11), font: helvetica, size: 9, color: black })
  page.drawText('Authorized Signature (With Seal)', { x: MARGIN + 10, y: ty(sigY + 22), font: helvetica, size: 8, color: gray })

  page.drawLine({ start: { x: MARGIN, y: ty(PAGE_H - MARGIN - 5) }, end: { x: PAGE_W - MARGIN, y: ty(PAGE_H - MARGIN - 5) }, thickness: 0.4, color: gray })
  const footerText = `Generated on ${new Date().toLocaleString('en-GB')}`
  const footerW = helvetica.widthOfTextAtSize(footerText, 8)
  page.drawText(footerText, { x: (PAGE_W - footerW) / 2, y: ty(PAGE_H - MARGIN + 5), font: helvetica, size: 8, color: gray })

  return await pdfDoc.save()
}
