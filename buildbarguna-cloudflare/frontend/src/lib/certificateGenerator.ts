/**
 * Browser-side Certificate Generator
 * 
 * Generates Share and Membership certificates entirely in the browser
 * using html2canvas-pro + jsPDF. Zero server CPU cost.
 * 
 * Replaces server-side pdf-lib/api-generator approaches.
 */

import html2canvas from 'html2canvas-pro'
import { jsPDF } from 'jspdf'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShareCertificateData {
  certificate_id: string
  project_name: string
  share_quantity: number
  total_amount_paisa: number
  purchase_date: string
  user_name: string
  user_phone?: string
  payment_method?: string
  form_number?: string
}

export interface MemberCertificateData {
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

// ─── Shared CSS ──────────────────────────────────────────────────────────────

const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&family=Playfair+Display:wght@700&display=swap');
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  .certificate {
    width: 794px;
    min-height: 1123px;
    margin: 0 auto;
    border: 3px solid #B8860B;
    border-radius: 4px;
    padding: 40px;
    position: relative;
    background: linear-gradient(135deg, #FFFEF5 0%, #FFFEF0 100%);
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }
  
  .certificate::before {
    content: '';
    position: absolute;
    top: 10px; left: 10px; right: 10px; bottom: 10px;
    border: 1px solid #B8860B;
    pointer-events: none;
  }
  
  .header { text-align: center; margin-bottom: 25px; }
  .logo { width: 70px; height: 70px; margin-bottom: 12px; }
  
  .org-name {
    font-family: 'Playfair Display', serif;
    font-size: 24px; font-weight: 700; color: #003366;
    margin-bottom: 5px;
  }
  
  .tagline { font-size: 11px; color: #646464; margin-bottom: 3px; }
  .contact { font-size: 10px; color: #B4B4B4; }
  
  .title { text-align: center; margin: 20px 0; }
  .title h1 {
    font-family: 'Playfair Display', serif;
    font-size: 22px; font-weight: 700; color: #8B5A2B;
    letter-spacing: 2px;
  }
  
  .cert-number { text-align: center; font-size: 11px; color: #646464; margin-top: 8px; }
  
  .divider {
    height: 1px;
    background: linear-gradient(to right, transparent, #B8860B, transparent);
    margin: 15px 0;
  }
  
  .body { text-align: center; margin: 20px 0; }
  .body p { font-size: 12px; color: #333; margin-bottom: 10px; }
  
  .member-name {
    font-family: 'Playfair Display', serif;
    font-size: 26px; font-weight: 700; color: #1a1a1a;
    margin: 12px 0;
  }
  
  .member-name-bangla {
    font-family: 'Noto Sans Bengali', sans-serif;
    font-size: 22px; color: #003366; margin-bottom: 15px;
  }
  
  .project-name {
    font-family: 'Playfair Display', serif;
    font-size: 18px; font-weight: 700; color: #003366;
    margin-top: 10px;
  }
  
  .details, .share-details {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 8px 20px;
    margin: 25px 40px;
    text-align: left;
  }
  
  .details .label, .share-details .label {
    font-weight: bold; font-size: 10px; color: #003366;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  
  .details .value, .share-details .value {
    font-size: 10px; color: #1a1a1a;
    border-bottom: 0.5px solid #ddd; padding-bottom: 2px;
  }
  
  .bangla-value {
    font-family: 'Noto Sans Bengali', sans-serif;
    font-size: 11px;
  }
  
  .footer { margin-top: 25px; }
  .verification { text-align: center; font-size: 10px; color: #228B22; margin-bottom: 5px; }
  .issue-date, .purchase-date { text-align: center; font-size: 10px; color: #646464; }
  
  .signatures {
    display: flex; justify-content: space-between;
    margin-top: 35px; padding: 0 40px;
  }
  
  .signature-block { text-align: center; }
  .signature-line { width: 120px; border-bottom: 0.5px solid #B4B4B4; margin-bottom: 5px; }
  .signature-label { font-size: 9px; color: #646464; }
  
  .seal {
    position: absolute; bottom: 70px; left: 50%;
    transform: translateX(-50%);
    width: 45px; height: 45px;
    border: 2px solid #8B5A2B; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
  
  .seal-text { font-size: 5px; color: #8B5A2B; font-weight: bold; text-transform: uppercase; }
  
  .bottom-border {
    position: absolute; bottom: 15px; left: 40px; right: 40px;
    height: 2px; background: #B8860B;
  }
`

// ─── Logo URL ────────────────────────────────────────────────────────────────

const LOGO_URL = '/bbi%20logo.jpg'

// ─── HTML Generators ─────────────────────────────────────────────────────────

function generateShareCertificateHTML(cert: ShareCertificateData): string {
  const purchaseDate = new Date(cert.purchase_date).toLocaleDateString('en-GB')
  const amountTaka = Math.floor(cert.total_amount_paisa / 100)

  return `
  <div class="certificate">
    <div class="header">
      <img class="logo" src="${LOGO_URL}" alt="BBI Logo" crossorigin="anonymous">
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
      <div class="value">BDT ${amountTaka.toLocaleString('en-US')}</div>
      
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
    
    <div class="seal"><span class="seal-text">OFFICIAL</span></div>
    <div class="bottom-border"></div>
  </div>`
}

function generateMemberCertificateHTML(reg: MemberCertificateData): string {
  const issueDate = new Date(reg.created_at).toLocaleDateString('en-GB')
  const verifiedDate = reg.verified_at
    ? new Date(reg.verified_at).toLocaleDateString('en-GB')
    : null

  return `
  <div class="certificate">
    <div class="header">
      <img class="logo" src="${LOGO_URL}" alt="BBI Logo" crossorigin="anonymous">
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
      <p>has been accepted as a Member of</p>
      <div class="project-name">Build Barguna Initiative (BBI)</div>
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
      ${verifiedDate ? `<div class="verification">Verified on: ${verifiedDate}</div>` : ''}
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
    
    <div class="seal"><span class="seal-text">OFFICIAL</span></div>
    <div class="bottom-border"></div>
  </div>`
}

// ─── Core: HTML → Canvas → PDF ───────────────────────────────────────────────

async function htmlToPDF(html: string, filename: string): Promise<void> {
  // Create a hidden container
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;background:#FFFEF5;'
  
  // Add styles
  const style = document.createElement('style')
  style.textContent = SHARED_CSS
  container.appendChild(style)

  // Add content
  const content = document.createElement('div')
  content.innerHTML = html
  container.appendChild(content)
  document.body.appendChild(container)

  // Wait for fonts to load
  await document.fonts.ready
  // Small delay for images and rendering
  await new Promise(r => setTimeout(r, 300))

  try {
    const certEl = container.querySelector('.certificate') as HTMLElement
    if (!certEl) throw new Error('Certificate element not found')

    const canvas = await html2canvas(certEl, {
      scale: 2,               // High DPI for crisp text
      useCORS: true,          // Allow logo image
      backgroundColor: '#FFFEF5',
      logging: false,
    })

    // A4 dimensions in mm
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = 210  // A4 width mm
    const pageH = 297  // A4 height mm

    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH)
    pdf.save(filename)
  } finally {
    document.body.removeChild(container)
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function downloadShareCertificate(data: ShareCertificateData): Promise<void> {
  const html = generateShareCertificateHTML(data)
  const filename = `BBI_Share_Certificate_${data.certificate_id}.pdf`
  await htmlToPDF(html, filename)
}

export async function downloadMemberCertificate(data: MemberCertificateData): Promise<void> {
  const html = generateMemberCertificateHTML(data)
  const filename = `BBI_Member_Certificate_${data.form_number}.pdf`
  await htmlToPDF(html, filename)
}
