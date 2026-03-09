# PDF Download Error Fix

## Issue Summary
When downloading PDF share certificates from the `/my-investments` page, users were encountering errors.

## Root Causes Identified

### 1. **R2 Binding Disabled but Referenced in Code**
- The `FILES` R2 bucket binding is **commented out** in `wrangler.toml` (lines 36-39)
- However, the certificate generation code in `src/routes/shares.ts` was attempting to fetch the logo from R2 storage
- This caused unnecessary error handling paths and potential failures

### 2. **Insufficient Error Logging**
- The original code had minimal logging, making it difficult to diagnose production issues
- Error stack traces were not being logged

### 3. **Frontend Error Handling**
- The frontend didn't handle non-JSON error responses properly
- Missing check for empty/invalid blob responses
- Link cleanup could be more robust

## Changes Made

### Backend (`src/routes/shares.ts`)

#### Download Endpoint (`/api/shares/certificate/:purchaseId`)
```typescript
// BEFORE:
try {
  let logoBuffer: ArrayBuffer | undefined
  const origin = new URL(c.req.url).origin
  try {
    const logoRes = await fetch(`${origin}/bbi%20logo.jpg`)
    if (logoRes.ok) logoBuffer = await logoRes.arrayBuffer()
  } catch (_) { /* ignore */ }
  if (!logoBuffer) {
    try {
      if (c.env.FILES) {
        const logoObject = await c.env.FILES.get('assets/bbi-logo.jpg')
        if (logoObject) logoBuffer = await logoObject.arrayBuffer()
      }
    } catch (e) {
      console.warn('Logo not found in R2:', e)
    }
  }
  // ... generate PDF
} catch (error: any) {
  console.error('Share certificate generation error:', error)
  return err(c, 'সার্টিফিকেট তৈরি করা যায়নি। আবার চেষ্টা করুন।', 500)
}

// AFTER:
try {
  let logoBuffer: ArrayBuffer | undefined
  const origin = new URL(c.req.url).origin
  try {
    const logoRes = await fetch(`${origin}/bbi%20logo.jpg`)
    if (logoRes.ok) {
      logoBuffer = await logoRes.arrayBuffer()
      console.log('[Certificate] Logo loaded from static assets')
    }
  } catch (e) {
    console.warn('[Certificate] Failed to fetch logo from static assets:', e)
  }
  
  // R2 binding is disabled - skip R2 logo fetch to avoid errors
  // if (!logoBuffer && c.env.FILES) { ... }

  const certId = `BBI-SHARE-${year}-${purchase.id.toString().padStart(4, '0')}`
  console.log('[Certificate] Generating PDF for purchase:', purchaseId, 'certId:', certId)
  
  // ... generate PDF
} catch (error: any) {
  console.error('[Certificate] Generation error:', error)
  console.error('[Certificate] Error stack:', error.stack)
  return err(c, 'সার্টিফিকেট তৈরি করা যায়নি। আবার চেষ্টা করুন।', 500)
}
```

#### Preview Endpoint (`/api/shares/certificate/:purchaseId/preview`)
- Applied the same fixes as the download endpoint

### Frontend (`frontend/src/pages/MyInvestments.tsx`)

```typescript
// BEFORE:
if (!response.ok) {
  const data = await response.json()
  throw new Error(data.error || 'Download failed')
}

const blob = await response.blob()
const url = window.URL.createObjectURL(blob)
const link = document.createElement('a')
link.href = url
link.download = `BBI_Share_Certificate_${purchaseId}.pdf`
link.click()
window.URL.revokeObjectURL(url)

// AFTER:
if (!response.ok) {
  let errorMessage = 'ডাউনলোড ব্যর্থ হয়েছে'
  try {
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const data = await response.json()
      errorMessage = data.error || errorMessage
    } else {
      const text = await response.text()
      errorMessage = text || errorMessage
    }
  } catch {
    // Ignore parsing error
  }
  throw new Error(errorMessage)
}

const blob = await response.blob()

if (!blob || blob.size === 0) {
  throw new Error('খালি PDF ফাইল পাওয়া গেছে')
}

const url = window.URL.createObjectURL(blob)
const link = document.createElement('a')
link.href = url
link.download = `BBI_Share_Certificate_${purchaseId}.pdf`
document.body.appendChild(link)
link.click()
document.body.removeChild(link)
window.URL.revokeObjectURL(url)
```

## Testing Checklist

- [ ] Deploy the updated Worker
- [ ] Test downloading certificate for an approved purchase
- [ ] Verify error messages appear correctly in Bengali
- [ ] Check Worker logs for proper error logging
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices

## Deployment

```bash
cd buildbarguna-cloudflare
npm run deploy
```

## Additional Notes

### Logo Configuration
The logo is now loaded **only** from static assets (`/bbi%20logo.jpg`). The R2 fallback has been disabled since the R2 bucket binding is commented out in `wrangler.toml`.

If you want to re-enable R2 storage in the future:
1. Uncomment the `[[r2_buckets]]` section in `wrangler.toml`
2. Uncomment the R2 fetch code in `src/routes/shares.ts`
3. Deploy the logo to R2 at path `assets/bbi-logo.jpg`

### Font Loading
The PDF generator uses:
- **Helvetica** for English text
- **Noto Sans Bengali** for Bengali text (bundled via wrangler module rules)
- Fallback to self-fetching the font from `/fonts/NotoSansBengali.ttf` if bundled font fails

## Related Files
- `src/routes/shares.ts` - Certificate endpoints
- `src/lib/pdf/generator.ts` - PDF generation logic
- `frontend/src/pages/MyInvestments.tsx` - Frontend download handler
- `wrangler.toml` - Worker configuration (R2 binding)
