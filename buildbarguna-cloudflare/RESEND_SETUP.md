# Resend Email Setup Guide

## Overview

This guide explains how to set up Resend for sending transactional emails (password reset, welcome emails, etc.) in the BuildBarguna platform.

## Prerequisites

- Resend account (sign up at https://resend.com)
- Verified domain in Resend
- API key from Resend

## Step 1: Create Resend Account

1. Go to https://resend.com
2. Click "Sign Up" or "Get Started"
3. Sign up with your email or GitHub account
4. Verify your email address

## Step 2: Add and Verify Domain

### Add Domain

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `buildbargunainitiative.org`)
4. Choose a region (US or Europe)

### Configure DNS Records

Resend will provide DNS records to verify your domain:

```
Type: MX
Name: @ (or buildbargunainitiative.org)
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10

Type: TXT
Name: @ (or buildbargunainitiative.org)
Value: v=spf1 include:resend.com ~all

Type: TXT
Name: resend._domainkey
Value: (provided by Resend for DKIM)
```

Add these records to your Cloudflare DNS:

1. Go to Cloudflare Dashboard → DNS → Records
2. Add each record as shown above
3. Wait for DNS propagation (usually 5-15 minutes)

### Verify Domain

1. After adding DNS records, click **Verify** in Resend dashboard
2. Once verified, you'll see a green checkmark

## Step 3: Get API Key

1. Go to **API Keys** in Resend dashboard
2. Click **Create API Key**
3. Give it a name (e.g., "BuildBarguna Production")
4. Set permissions to **Full Access**
5. Copy the API key (starts with `re_`)

⚠️ **Important:** Save the API key securely. You won't be able to see it again!

## Step 4: Configure Cloudflare Worker

### Add Secrets to Worker

Run these commands in your terminal:

```bash
cd buildbarguna-cloudflare

# Add Resend API key
wrangler secret put RESEND_API_KEY
# Paste your API key when prompted (e.g., re_xxxxxxxxxxxxx)

# Add sender email (optional, has default)
wrangler secret put EMAIL_FROM
# Enter: BuildBarguna <noreply@buildbargunainitiative.org>
```

### Update wrangler.toml (already done)

The wrangler.toml file has been updated with comments about the new secrets.

## Step 5: Test Email Sending

### Test Locally

```bash
# Start development server
npm run dev

# Trigger a password reset
# Go to http://localhost:5173/forgot-password
# Enter your test email
```

### Check Logs

```bash
# In another terminal
wrangler tail buildbarguna-worker

# Look for:
# "Password reset email sent to user@example.com"
# or
# "Failed to send password reset email"
```

## Step 6: Production Deployment

```bash
# Deploy the worker
npm run deploy

# Test in production
# Go to https://buildbargunainitiative.org/forgot-password
```

## Email Templates

The following email templates are implemented:

1. **Password Reset Email** - Sent when user requests password reset
2. **Password Reset Confirmation** - Sent after successful password reset
3. **Welcome Email** - Sent after new user registration (optional)

All templates are in Bengali and include:
- Responsive HTML design
- Plain text fallback
- Branding (BuildBarguna colors)
- Security tips and warnings

## Customization

### Change Sender Email

Update the `EMAIL_FROM` secret:

```bash
wrangler secret put EMAIL_FROM
# Enter: BuildBarguna <support@buildbargunainitiative.org>
```

### Modify Email Templates

Edit `src/lib/email.ts` to customize:
- Email subject lines
- HTML design
- Content and messaging
- Branding colors

### Add New Email Types

Add new functions to `src/lib/email.ts`:

```typescript
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  const resend = new Resend(process.env.RESEND_API_KEY || '')
  // ... implementation
}
```

## Troubleshooting

### Email Not Sending

1. Check Resend dashboard for delivery logs
2. Verify API key is correct
3. Check domain is verified
4. Look at Worker logs: `wrangler tail buildbarguna-worker`

### DNS Verification Failed

1. Wait 15-30 minutes for DNS propagation
2. Check DNS records in Cloudflare match exactly
3. Clear DNS cache or try from different network
4. Contact Resend support if issue persists

### Emails Going to Spam

1. Ensure SPF, DKIM, and DMARC records are correct
2. Don't use spam trigger words in subject/content
3. Include unsubscribe link (for marketing emails)
4. Monitor sender reputation in Resend dashboard

## Pricing

Resend offers:

- **Free Tier:** 3,000 emails/month, 100 emails/day
- **Pro Tier:** $20/month for 50,000 emails/month
- **Business Tier:** Custom pricing for high volume

For BuildBarguna's use case (password resets, welcome emails), the free tier should be sufficient initially.

## Security Best Practices

1. **Never commit API keys** to git
2. Use environment variables (secrets in Cloudflare Workers)
3. Rotate API keys periodically
4. Monitor email sending patterns for abuse
5. Rate limit password reset requests (already implemented)

## Support

- Resend Documentation: https://resend.com/docs
- Resend Support: support@resend.com
- Internal Docs: See `src/lib/email.ts`

## Migration Notes

**Date:** March 10, 2026  
**Previous System:** None (new feature)  
**Email Service:** Resend  
**Templates:** Bengali (bn-BD)

---

## Quick Reference

```bash
# Add secrets
wrangler secret put RESEND_API_KEY
wrangler secret put EMAIL_FROM

# Test locally
npm run dev

# Deploy
npm run deploy

# Monitor logs
wrangler tail buildbarguna-worker
```
