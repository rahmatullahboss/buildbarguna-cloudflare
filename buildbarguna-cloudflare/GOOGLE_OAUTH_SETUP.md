# Google OAuth Setup Guide

## Overview

This guide explains how to set up Google Sign-In/Sign-Up for the BuildBarguna platform using OAuth 2.0 with PKCE (Proof Key for Code Exchange).

## Prerequisites

- Google Cloud Platform account
- BuildBarguna domain verified (for production)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Enter project name: `BuildBarguna`
4. Click **Create**

## Step 2: Configure OAuth Consent Screen

1. In Google Cloud Console, go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Click **Create**

### App Information

- **App name**: BuildBarguna
- **User support email**: Your email
- **App logo**: Upload BuildBarguna logo (optional)
- **App domain**: 
  - Production: `https://buildbargunainitiative.org`
  - Development: Leave blank
- **Developer contact**: Your email

### Scopes

1. Click **Add or Remove Scopes**
2. Select these scopes:
   - `openid` - OpenID Connect
   - `https://www.googleapis.com/auth/userinfo.email` - Email address
   - `https://www.googleapis.com/auth/userinfo.profile` - Basic profile information
3. Click **Update**

### Test Users (for development)

1. Click **Add Users**
2. Add your Google email as a test user
3. Click **Save and Continue**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**

### Authorized JavaScript Origins

Add these origins:

```
Production:
https://buildbargunainitiative.org

Development:
http://localhost:5173
```

### Authorized Redirect URIs

Add these redirect URIs:

```
Production:
https://buildbargunainitiative.org/api/auth/google/callback

Development:
http://localhost:5173/api/auth/google/callback
```

4. Click **Create**

### Copy Credentials

A popup will show your **Client ID** and **Client Secret**.

⚠️ **Important:** 
- Copy the **Client ID** (you'll need this)
- Copy the **Client Secret** (not needed for PKCE flow but save it for reference)

## Step 4: Configure Cloudflare Worker

### Add Google Client ID Secret

Run this command in your terminal:

```bash
cd buildbarguna-cloudflare

# Add Google OAuth Client ID
wrangler secret put GOOGLE_CLIENT_ID
# Paste your Client ID when prompted (e.g., 123456789-xxxxx.apps.googleusercontent.com)
```

### Update wrangler.toml (already done)

The wrangler.toml file has been updated with comments about the required secrets.

## Step 5: Test Google Sign-In

### Test Locally

```bash
# Start development server
npm run dev

# Go to http://localhost:5173/login
# Click "Google দিয়ে লগইন করুন" button
```

### Flow

1. User clicks Google Sign-In button
2. Redirects to Google OAuth consent screen
3. User grants permission
4. Google redirects back with authorization code
5. Backend exchanges code for tokens
6. Backend fetches user info from Google
7. Backend creates/updates user account
8. Backend generates JWT token
9. Redirects to dashboard with token

### Check Logs

```bash
# In another terminal
wrangler tail buildbarguna-worker

# Look for:
# - Google OAuth initiation
# - Token exchange
# - User creation/update
```

## Step 6: Production Deployment

```bash
# Deploy the worker
npm run deploy

# Test in production
# Go to https://buildbargunainitiative.org/login
```

## Security Features

### PKCE (Proof Key for Code Exchange)

✅ **Implemented** - Protects against authorization code interception attacks

### State Parameter

✅ **Implemented** - Prevents CSRF attacks

### Token Storage

✅ **Memory-only** - JWT tokens stored in memory, not localStorage

### Email Verification

✅ **Auto-verified** - Google-verified emails are marked as verified

## User Flows

### New User (Sign-Up)

1. Clicks "Google দিয়ে রেজিস্ট্রেশন করুন"
2. Grants permission on Google
3. Account created automatically
4. Redirected to dashboard

### Existing User (Sign-In)

1. Clicks "Google দিয়ে লগইন করুন"
2. Grants permission on Google
3. Logged in with existing account
4. Redirected to dashboard

### Link Google to Existing Account

If user signs in with Google using the same email as their existing account:
- Google ID is automatically linked to existing account
- User can now sign in with either password or Google

## Troubleshooting

### Error: "Google লগইন শুরু করা যায়নি"

1. Check `GOOGLE_CLIENT_ID` secret is set correctly
2. Verify redirect URIs match exactly in Google Cloud Console
3. Check Worker logs for detailed error

### Error: "invalid_state"

1. State parameter expired (10 minute TTL)
2. Try again - new state will be generated

### Error: "google_auth_failed"

1. Check Google Cloud Console for API errors
2. Verify OAuth consent screen is published
3. Ensure test user is added (for development)

### Redirect URI Mismatch

Common issues:
- Missing `/api/auth/google/callback` path
- Wrong protocol (http vs https)
- Missing port number for localhost

## Customization

### Change OAuth Scopes

Edit `src/lib/google-oauth.ts`:

```typescript
authorizationUrl.searchParams.set('scope', 'openid email profile')
// Add more scopes as needed
```

### Modify User Creation Logic

Edit `src/routes/auth.ts` - Google OAuth callback handler:

```typescript
// Customize user creation fields
// Add default referral code, welcome email, etc.
```

### Add Welcome Email

After user creation in callback handler:

```typescript
import { sendWelcomeEmail } from '../lib/email'

await sendWelcomeEmail({
  to: googleUser.email,
  name: googleUser.name
})
```

## Pricing

Google OAuth 2.0 is **free** for standard usage.

Limits:
- 100 OAuth tokens per second per project
- Sufficient for BuildBarguna's scale

## Migration Notes

**Date:** March 10, 2026  
**OAuth Library:** oauth4webapi  
**Flow:** Authorization Code with PKCE  
**Scopes:** openid, email, profile

---

## Quick Reference

```bash
# Add Google Client ID secret
wrangler secret put GOOGLE_CLIENT_ID

# Test locally
npm run dev

# Deploy
npm run deploy

# Monitor logs
wrangler tail buildbarguna-worker
```

## Support

- Google OAuth Docs: https://developers.google.com/identity/protocols/oauth2
- oauth4webapi: https://github.com/panva/oauth4webapi
- Internal Docs: See `src/lib/google-oauth.ts`
