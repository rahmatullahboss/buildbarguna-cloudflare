## Why

Shareholders currently have no formal proof of ownership after purchasing shares. This change introduces a professional, world-class PDF share certificate generation system that automatically generates certificates when admin approves share purchase requests, providing shareholders with official documentation similar to major corporations.

## What Changes

- **New**: PDF share certificate generation using existing pdf-lib infrastructure with world-class design
- **New**: Admin approval workflow triggers certificate generation on-demand (not stored, generated on download)
- **New**: Professional certificate design with BBI logo, decorative borders, bilingual support (English & Bangla)
- **New**: Download button appears only after admin approval in frontend
- **Enhanced**: Share certificate includes all critical information (certificate ID, shareholder details, share quantity, project name, purchase date, official signatures)
- **Enhanced**: Uses existing Cloudflare Workers pdf-lib setup with Noto Sans Bengali font for Unicode support

## Capabilities

### New Capabilities
- `share-certificate-generation`: Server-side PDF generation endpoint for share certificates with professional design, bilingual support, and on-demand download
- `admin-approval-workflow`: Admin approval flow for share purchase requests with certificate generation trigger
- `certificate-download-ui`: Frontend download button and preview UI for approved share certificates

### Modified Capabilities
- `shares-api`: Extending share purchase endpoints to include certificate generation on approval and download endpoint for approved certificates

## Impact

- **Backend**: New PDF generation endpoint in Worker, integration with existing share purchase approval flow
- **Frontend**: New download button in share purchase request list for approved requests
- **Database**: No schema changes required - uses existing share_purchases table
- **Dependencies**: Uses existing pdf-lib, @pdf-lib/fontkit, and Noto Sans Bengali font already in project
- **Design**: World-class certificate design matching professional standards (decorative borders, official seals, signatures)
