/**
 * PDF Generation Service — Uses External API
 * 
 * Instead of generating PDFs in the Worker (CPU-intensive),
 * we generate HTML and send it to an external API for PDF conversion.
 * 
 * Supports: PDFShift, DocRaptor, or any HTML-to-PDF API
 */

import { err } from '../response'

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

export interface Env {
  PDF_API_KEY?: string
  ADOBE_CLIENT_ID?: string
  ADOBE_CLIENT_SECRET?: string
}

// ─── HTML Templates ─────────────────────────────────────────────────────────

function generateMemberCertificateHTML(reg: MemberRegistration, logoUrl?: string): string {
  const verifiedDate = reg.verified_at 
    ? new Date(reg.verified_at).toLocaleDateString('en-GB') 
    : 'N/A'
  const issueDate = new Date(reg.created_at).toLocaleDateString('en-GB')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Membership Certificate - BBI</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&family=Playfair+Display:wght@700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: #FFFEF5;
      min-height: 100vh;
      padding: 40px;
    }
    
    .certificate {
      max-width: 800px;
      margin: 0 auto;
      border: 3px solid #B8860B;
      border-radius: 4px;
      padding: 40px;
      position: relative;
      background: linear-gradient(135deg, #FFFEF5 0%, #FFFEF0 100%);
    }
    
    .certificate::before {
      content: '';
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      bottom: 10px;
      border: 1px solid #B8860B;
      pointer-events: none;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .logo {
      width: 80px;
      height: 80px;
      margin-bottom: 15px;
    }
    
    .org-name {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 700;
      color: #003366;
      margin-bottom: 5px;
    }
    
    .tagline {
      font-size: 12px;
      color: #646464;
      margin-bottom: 3px;
    }
    
    .contact {
      font-size: 10px;
      color: #B4B4B4;
    }
    
    .title {
      text-align: center;
      margin: 25px 0;
    }
    
    .title h1 {
      font-family: 'Playfair Display', serif;
      font-size: 26px;
      font-weight: 700;
      color: #8B5A2B;
      letter-spacing: 3px;
    }
    
    .cert-number {
      text-align: center;
      font-size: 11px;
      color: #646464;
      margin-top: 8px;
    }
    
    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, #B8860B, transparent);
      margin: 20px 0;
    }
    
    .body {
      text-align: center;
      margin: 25px 0;
    }
    
    .body p {
      font-size: 13px;
      color: #333;
      margin-bottom: 12px;
    }
    
    .member-name {
      font-family: 'Playfair Display', serif;
      font-size: 30px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 15px 0;
    }
    
    .member-name-bangla {
      font-family: 'Noto Sans Bengali', sans-serif;
      font-size: 22px;
      color: #003366;
      margin-bottom: 15px;
    }
    
    .org-text {
      font-size: 14px;
      color: #333;
      margin-top: 10px;
    }
    
    .org-name-2 {
      font-family: 'Playfair Display', serif;
      font-size: 18px;
      font-weight: 700;
      color: #003366;
      margin-top: 8px;
    }
    
    .details {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 8px 20px;
      margin: 25px 40px;
      text-align: left;
    }
    
    .details .label {
      font-weight: bold;
      font-size: 10px;
      color: #003366;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .details .value {
      font-size: 10px;
      color: #1a1a1a;
      border-bottom: 0.5px solid #ddd;
      padding-bottom: 2px;
    }
    
    .footer {
      margin-top: 30px;
    }
    
    .footer .divider {
      margin: 15px 0;
    }
    
    .verification {
      text-align: center;
      font-size: 10px;
      color: #228B22;
      margin-bottom: 5px;
    }
    
    .issue-date {
      text-align: center;
      font-size: 10px;
      color: #646464;
    }
    
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding: 0 40px;
    }
    
    .signature-block {
      text-align: center;
    }
    
    .signature-line {
      width: 120px;
      border-bottom: 0.5px solid #B4B4B4;
      margin-bottom: 5px;
    }
    
    .signature-label {
      font-size: 9px;
      color: #646464;
    }
    
    .seal {
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      width: 50px;
      height: 50px;
      border: 2px solid #8B5A2B;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .seal-text {
      font-size: 6px;
      color: #8B5A2B;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .bottom-border {
      position: absolute;
      bottom: 15px;
      left: 40px;
      right: 40px;
      height: 2px;
      background: #B8860B;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="BBI Logo">` : ''}
      <div class="org-name">Build Barguna Initiative (BBI)</div>
      <div class="tagline">Barguna Sadar, Barguna, Bangladesh</div>
      <div class="contact">Email: contact@buildbargunainitiative.org | Mobile: 01971951960</div>
    </div>
    
    <div class="title">
      <h1>MEMBERSHIP CERTIFICATE</h1>
      <div class="cert-number">Certificate No: ${reg.form_number}</div>
    </div>
    
    <div class="divider"></div>
    
    <div class="body">
      <p>This is to certify that</p>
      <div class="member-name">${reg.name_english}</div>
      ${reg.name_bangla ? `<div class="member-name-bangla">${reg.name_bangla}</div>` : ''}
      <p class="org-text">has been accepted as a Member of</p>
      <div class="org-name-2">Build Barguna Initiative (BBI)</div>
    </div>
    
    <div class="details">
      <div class="label">Father's Name:</div>
      <div class="value">${reg.father_name}</div>
      
      <div class="label">Mother's Name:</div>
      <div class="value">${reg.mother_name}</div>
      
      <div class="label">Date of Birth:</div>
      <div class="value">${reg.date_of_birth}</div>
      
      <div class="label">Blood Group:</div>
      <div class="value">${reg.blood_group || 'N/A'}</div>
      
      <div class="label">Present Address:</div>
      <div class="value">${reg.present_address}</div>
      
      <div class="label">Permanent Address:</div>
      <div class="value">${reg.permanent_address}</div>
      
      <div class="label">Mobile/WhatsApp:</div>
      <div class="value">${reg.mobile_whatsapp}</div>
      
      ${reg.email ? `<div class="label">Email:</div><div class="value">${reg.email}</div>` : ''}
      ${reg.facebook_id ? `<div class="label">Facebook ID:</div><div class="value">${reg.facebook_id}</div>` : ''}
    </div>
    
    <div class="footer">
      <div class="divider"></div>
      ${reg.verified_at ? `<div class="verification">Verified on: ${verifiedDate}</div>` : ''}
      <div class="issue-date">Issued on: ${issueDate}</div>
    </div>
    
    <div class="signatures">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Member Signature</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Authorized Signature</div>
      </div>
    </div>
    
    <div class="seal">
      <span class="seal-text">OFFICIAL</span>
    </div>
    
    <div class="bottom-border"></div>
  </div>
</body>
</html>`
}

function generateShareCertificateHTML(cert: ShareCertificate, logoUrl?: string): string {
  const purchaseDate = new Date(cert.purchase_date).toLocaleDateString('en-GB')
  const amountTaka = Math.floor(cert.total_amount_paisa / 100)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Certificate - BBI</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&family=Playfair+Display:wght@700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: #FFFEF5;
      min-height: 100vh;
      padding: 40px;
    }
    
    .certificate {
      max-width: 800px;
      margin: 0 auto;
      border: 3px solid #B8860B;
      border-radius: 4px;
      padding: 40px;
      position: relative;
      background: linear-gradient(135deg, #FFFEF5 0%, #FFFEF0 100%);
    }
    
    .certificate::before {
      content: '';
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      bottom: 10px;
      border: 1px solid #B8860B;
      pointer-events: none;
    }
    
    .header {
      text-align: center;
      margin-bottom: 25px;
    }
    
    .logo {
      width: 70px;
      height: 70px;
      margin-bottom: 12px;
    }
    
    .org-name {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      font-weight: 700;
      color: #003366;
      margin-bottom: 5px;
    }
    
    .tagline {
      font-size: 11px;
      color: #646464;
    }
    
    .title {
      text-align: center;
      margin: 20px 0;
    }
    
    .title h1 {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      font-weight: 700;
      color: #8B5A2B;
      letter-spacing: 2px;
    }
    
    .cert-number {
      text-align: center;
      font-size: 11px;
      color: #646464;
      margin-top: 8px;
    }
    
    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, #B8860B, transparent);
      margin: 15px 0;
    }
    
    .body {
      text-align: center;
      margin: 20px 0;
    }
    
    .body p {
      font-size: 12px;
      color: #333;
      margin-bottom: 10px;
    }
    
    .member-name {
      font-family: 'Playfair Display', serif;
      font-size: 26px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 12px 0;
    }
    
    .project-name {
      font-family: 'Playfair Display', serif;
      font-size: 18px;
      font-weight: 700;
      color: #003366;
      margin-top: 10px;
    }
    
    .share-details {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 10px 30px;
      margin: 25px 50px;
    }
    
    .share-details .label {
      font-weight: bold;
      font-size: 10px;
      color: #003366;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .share-details .value {
      font-size: 11px;
      color: #1a1a1a;
      border-bottom: 0.5px solid #ddd;
      padding-bottom: 2px;
    }
    
    .footer {
      margin-top: 25px;
    }
    
    .footer .divider {
      margin: 12px 0;
    }
    
    .purchase-date {
      text-align: center;
      font-size: 10px;
      color: #646464;
    }
    
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 35px;
      padding: 0 40px;
    }
    
    .signature-block {
      text-align: center;
    }
    
    .signature-line {
      width: 120px;
      border-bottom: 0.5px solid #B4B4B4;
      margin-bottom: 5px;
    }
    
    .signature-label {
      font-size: 9px;
      color: #646464;
    }
    
    .seal {
      position: absolute;
      bottom: 70px;
      left: 50%;
      transform: translateX(-50%);
      width: 45px;
      height: 45px;
      border: 2px solid #8B5A2B;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .seal-text {
      font-size: 5px;
      color: #8B5A2B;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .bottom-border {
      position: absolute;
      bottom: 15px;
      left: 40px;
      right: 40px;
      height: 2px;
      background: #B8860B;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="BBI Logo">` : ''}
      <div class="org-name">Build Barguna Initiative (BBI)</div>
      <div class="tagline">Barguna Sadar, Barguna, Bangladesh</div>
    </div>
    
    <div class="title">
      <h1>SHARE CERTIFICATE</h1>
      <div class="cert-number">Certificate No: ${cert.certificate_id}</div>
    </div>
    
    <div class="divider"></div>
    
    <div class="body">
      <p>This is to certify that</p>
      <div class="member-name">${cert.user_name}</div>
      <p>has purchased share(s) in</p>
      <div class="project-name">${cert.project_name}</div>
    </div>
    
    <div class="share-details">
      <div class="label">Share Quantity:</div>
      <div class="value">${cert.share_quantity} Share(s)</div>
      
      <div class="label">Total Investment:</div>
      <div class="value">BDT ${amountTaka.toLocaleString('en-US')} (${cert.total_amount_paisa} paisa)</div>
      
      <div class="label">Payment Method:</div>
      <div class="value">${cert.payment_method || 'N/A'}</div>
      
      ${cert.form_number ? `<div class="label">Form Number:</div><div class="value">${cert.form_number}</div>` : ''}
    </div>
    
    <div class="footer">
      <div class="divider"></div>
      <div class="purchase-date">Purchase Date: ${purchaseDate}</div>
    </div>
    
    <div class="signatures">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Investor Signature</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Authorized Signature</div>
      </div>
    </div>
    
    <div class="seal">
      <span class="seal-text">OFFICIAL</span>
    </div>
    
    <div class="bottom-border"></div>
  </div>
</body>
</html>`
}

// ─── PDF Generation API Functions ──────────────────────────────────────────

/**
 * Generate PDF using PDFShift API
 * API Docs: https://pdfshift.io/documentation
 */
async function generatePDFWithPDFShift(html: string, apiKey: string): Promise<Uint8Array> {
  const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`api:${apiKey}`)}`
    },
    body: JSON.stringify({
      html: html,
      landscape: false,
      page_size: 'A4',
      margin: '0px',
      compression: 'medium'
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`PDFShift API error: ${response.status} - ${errorText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/**
 * Generate PDF using DocRaptor API
 * API Docs: https://docraptor.com/documentation/
 */
async function generatePDFWithDocRaptor(html: string, apiKey: string): Promise<Uint8Array> {
  const response = await fetch('https://docraptor.com/docs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(apiKey)}`
    },
    body: JSON.stringify({
      doc: {
        document_type: 'pdf',
        html_content: html,
        test: true // Set to false for production
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DocRaptor API error: ${response.status} - ${errorText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/**
 * Generate PDF using Adobe PDF Services API
 * API Docs: https://developer.adobe.com/document-services/apis/pdf-services/
 */
async function generatePDFWithAdobe(
  html: string,
  clientId: string,
  clientSecret: string
): Promise<Uint8Array> {
  // Step 1: Get OAuth token
  const tokenResponse = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'openid,AdobeID,read_organizations'
    })
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    throw new Error(`Adobe token error: ${tokenResponse.status} - ${errorText}`)
  }

  const tokenData = await tokenResponse.json() as { access_token: string }
  const accessToken = tokenData.access_token

  // Step 2: Upload HTML content as an asset
  const htmlBuffer = new TextEncoder().encode(html)
  const uploadResponse = await fetch('https://pdf-services.adobe.io/assets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': clientId,
      'Content-Type': 'text/html',
      'Upload-Asset': 'source'
    },
    body: htmlBuffer
  })

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    throw new Error(`Adobe upload error: ${uploadResponse.status} - ${errorText}`)
  }

  const uploadData = await uploadResponse.json() as { asset: { id: string } }
  const assetId = uploadData.asset.id

  // Step 3: Create HTML to PDF job
  const jobResponse = await fetch('https://pdf-services.adobe.io/operation/htmltopdf', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': clientId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputAsset: assetId
    })
  })

  if (!jobResponse.ok) {
    const errorText = await jobResponse.text()
    throw new Error(`Adobe job error: ${jobResponse.status} - ${errorText}`)
  }

  const jobData = await jobResponse.json() as { pollingURL: string }
  const pollingURL = jobData.pollingURL

  // Step 4: Poll for completion
  let pdfAssetId: string | null = null
  const maxAttempts = 30
  const delayMs = 1000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, delayMs))

    const statusResponse = await fetch(pollingURL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': clientId
      }
    })

    if (!statusResponse.ok) {
      throw new Error(`Adobe status error: ${statusResponse.status}`)
    }

    const statusData = await statusResponse.json() as { status: string; result?: { asset: { id: string } } }

    if (statusData.status === 'done') {
      pdfAssetId = statusData.result?.asset.id ?? null
      break
    } else if (statusData.status === 'failed') {
      throw new Error('Adobe PDF generation failed')
    }
  }

  if (!pdfAssetId) {
    throw new Error('Adobe PDF generation timed out')
  }

  // Step 5: Download the PDF
  const downloadResponse = await fetch(`https://pdf-services.adobe.io/assets/${pdfAssetId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': clientId
    }
  })

  if (!downloadResponse.ok) {
    throw new Error(`Adobe download error: ${downloadResponse.status}`)
  }

  const arrayBuffer = await downloadResponse.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/**
 * Main PDF generation function
 * Uses external API to generate PDF from HTML
 */
export async function generateMemberCertificatePDF(
  reg: MemberRegistration,
  env: Env,
  origin?: string
): Promise<Uint8Array> {
  // Get logo URL for embedding in HTML
  let logoUrl: string | undefined
  if (origin) {
    logoUrl = `${origin}/bbi%20logo.jpg`
  }

  // Generate HTML
  const html = generateMemberCertificateHTML(reg, logoUrl)

  // Try Adobe PDF Services first (if credentials configured)
  if (env.ADOBE_CLIENT_ID && env.ADOBE_CLIENT_SECRET) {
    try {
      console.log('[PDF] Using Adobe PDF Services...')
      return await generatePDFWithAdobe(html, env.ADOBE_CLIENT_ID, env.ADOBE_CLIENT_SECRET)
    } catch (error) {
      console.error('Adobe PDF generation failed:', error)
      // Fall through to try PDFShift
    }
  }

  // Fallback to PDFShift
  if (env.PDF_API_KEY) {
    try {
      console.log('[PDF] Using PDFShift...')
      return await generatePDFWithPDFShift(html, env.PDF_API_KEY)
    } catch (error) {
      console.error('PDFShift failed:', error)
      throw error
    }
  }

  // No API key - return error message
  throw new Error('PDF service not configured. Please contact administrator.')
}

/**
 * Generate share certificate PDF using external API
 */
export async function generateShareCertificatePDF(
  cert: ShareCertificate,
  env: Env,
  origin?: string
): Promise<Uint8Array> {
  // Get logo URL for embedding in HTML
  let logoUrl: string | undefined
  if (origin) {
    logoUrl = `${origin}/bbi%20logo.jpg`
  }

  // Generate HTML
  const html = generateShareCertificateHTML(cert, logoUrl)

  // Try Adobe PDF Services first (if credentials configured)
  if (env.ADOBE_CLIENT_ID && env.ADOBE_CLIENT_SECRET) {
    try {
      console.log('[PDF] Using Adobe PDF Services...')
      return await generatePDFWithAdobe(html, env.ADOBE_CLIENT_ID, env.ADOBE_CLIENT_SECRET)
    } catch (error) {
      console.error('Adobe PDF generation failed:', error)
      // Fall through to try PDFShift
    }
  }

  // Fallback to PDFShift
  if (env.PDF_API_KEY) {
    try {
      console.log('[PDF] Using PDFShift...')
      return await generatePDFWithPDFShift(html, env.PDF_API_KEY)
    } catch (error) {
      console.error('PDFShift failed:', error)
      throw error
    }
  }

  throw new Error('PDF service not configured. Please contact administrator.')
}
