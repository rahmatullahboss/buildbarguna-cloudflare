## Context

Build Barguna Initiative (BBI) currently has a share purchase system where members can buy shares and admins approve requests. However, there's no formal certificate generation system. The project already uses:
- **pdf-lib** + **@pdf-lib/fontkit** for PDF generation in Cloudflare Workers
- **Noto Sans Bengali** font for Unicode/Bangla support
- Existing share purchase workflow with admin approval
- Professional certificate design patterns already implemented for membership certificates

## Goals / Non-Goals

**Goals:**
- Generate professional, world-class share certificates on-demand when admin approves
- Certificate includes: Certificate ID, shareholder name (EN+BN), project name, share quantity, amount, purchase date, official signatures
- Download button appears only after admin approval in frontend
- No persistent storage - generate PDF on each download request
- Maintain existing pdf-lib infrastructure and design patterns
- Support Bangla text in certificates

**Non-Goals:**
- Storing generated PDFs in R2 (on-demand generation only)
- Email delivery of certificates (future enhancement)
- QR codes or verification systems (future enhancement)
- Bulk certificate generation (future enhancement)

## Decisions

### 1. Use Existing pdf-lib Infrastructure
**Decision:** Continue using pdf-lib + @pdf-lib/fontkit already in the project
**Rationale:** 
- Already working in Cloudflare Workers environment
- Supports custom fonts (Noto Sans Bengali) for Bangla text
- Full control over design and layout
- No external API dependencies or costs
- **Alternative considered:** Cloud-based PDF APIs (PDFMonkey, DocRaptor) - rejected due to cost, latency, and unnecessary complexity

### 2. On-Demand Generation (No Storage)
**Decision:** Generate PDF on each download request, don't store in R2
**Rationale:**
- User requested: "এটা কোথাও সেভ হবে না" (won't be stored anywhere)
- Reduces storage costs and complexity
- Ensures certificate always reflects current data
- **Trade-off:** Slightly slower download (generation time ~500ms-1s)
- **Alternative:** Store in R2 with signed URLs - rejected per user requirements

### 3. Admin Approval Triggers Certificate Availability
**Decision:** Download button appears only after admin sets status to 'approved'
**Rationale:**
- Matches existing workflow: pending → approved → shares allocated
- Prevents premature certificate access before payment verification
- **Implementation:** Add `certificate_generated_at` timestamp to track approval
- **Alternative:** Generate on payment confirmation - rejected because admin approval is the trust point

### 4. World-Class Certificate Design
**Decision:** Professional design with decorative borders, logo, signatures, bilingual support
**Rationale:**
- Matches major corporate share certificate standards
- Builds trust and credibility
- Uses existing membership certificate design as base
- **Elements:** Cream background (#FFFEF5), gold borders, navy text, official seal area, signature lines
- **Reference:** Existing `generateMemberCertificate` function in `src/lib/pdf/generator.ts`

### 5. Endpoint Design
**Decision:** RESTful endpoints following existing Hono patterns
**Rationale:**
- Consistent with existing codebase architecture
- **Endpoints:**
  - `GET /api/shares/certificate/:purchase_id` - Download PDF (approved only)
  - `POST /api/admin/shares/:id/approve` - Approve request (triggers certificate availability)
- **Alternative:** GraphQL endpoint - rejected, overkill for simple download

## Risks / Trade-offs

**[Risk] Font Loading in Workers** → Mitigation: Use bundled font via wrangler.toml module rules (already working)
**[Risk] Bangla Text Encoding** → Mitigation: Existing `fontFor()` helper with fallback to Latin-only if font fails
**[Risk] Performance on Download** → Mitigation: Generation takes ~500ms-1s, acceptable for one-time download
**[Risk] Certificate Tampering** → Mitigation: Future enhancement - add QR code verification (out of scope)
**[Trade-off] No Storage** → Faster to implement, lower cost, but no audit trail of generated certificates

## Migration Plan

1. **Phase 1: Backend PDF Generation**
   - Complete `generateShareCertificate` function in `src/lib/pdf/generator.ts`
   - Add `GET /api/shares/certificate/:id` endpoint
   - Test with sample data

2. **Phase 2: Admin Approval Integration**
   - Update admin approval endpoint to mark certificate as available
   - Add certificate availability check in backend

3. **Phase 3: Frontend Download UI**
   - Add download button in share request list (visible only for approved)
   - Implement PDF download with loading state

4. **Phase 4: Testing & Polish**
   - Test with Bangla names
   - Verify certificate design quality
   - Error handling for edge cases

**Rollback Strategy:** Simply don't deploy frontend changes; backend endpoint is isolated and doesn't affect existing flows

## Open Questions

1. Should we add a certificate preview modal before download? (nice-to-have)
2. Should certificate include QR code for verification? (future enhancement)
3. Should we log certificate download events for audit? (future enhancement)
