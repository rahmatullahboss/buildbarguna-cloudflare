# PWA Deployment Guide

This guide explains how to deploy the PWA-enabled বিল্ড বরগুনা app to Cloudflare Pages.

## Prerequisites

- Cloudflare account with API token
- Node.js 20+ installed
- Wrangler CLI installed (`npm install -g wrangler`)

## Quick Deploy

### Option 1: GitHub Actions (Recommended)

The PWA will be automatically deployed when you push to the `main` branch:

```bash
# Build and commit PWA changes
cd buildbarguna-cloudflare/frontend
npm run build:pwa

# Commit and push
git add .
git commit -m "feat: add PWA support for iOS"
git push origin main
```

GitHub Actions will:
1. Build the frontend with PWA configuration
2. Deploy to Cloudflare Workers with assets
3. Run database migrations
4. Verify deployment

### Option 2: Manual Deploy with Wrangler

```bash
# Navigate to project root
cd buildbarguna-cloudflare

# Build frontend (includes PWA)
cd frontend
npm run build

# Deploy from project root
cd ..
npx wrangler deploy
```

## Verify PWA Deployment

After deployment, verify the PWA is working:

### 1. Check Service Worker

Visit your app URL and open DevTools Console:
```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});

// Check registration status
if ('serviceWorker' in navigator) {
  console.log('Service Worker supported');
} else {
  console.log('Service Worker NOT supported');
}
```

### 2. Check Manifest

Visit `https://your-domain.com/manifest.json` - should return valid JSON with:
- `name`: "বিল্ড বরগুনা"
- `display`: "standalone"
- `start_url`: "/"
- `background_color`: "#15803d"

### 3. Check Lighthouse PWA Score

1. Open Chrome DevTools
2. Go to "Lighthouse" tab
3. Select "Progressive Web App" category
4. Click "Analyze page load"
5. Should score 100 for PWA

### 4. Test Offline Mode

1. Open app in browser
2. Open DevTools → Network tab
3. Select "Offline"
4. Refresh page
5. App should load from cache

## Staging Deployment

To deploy to staging first:

```bash
# Set up staging environment in wrangler.toml
[env.staging]
name = "buildbarguna-worker-staging"
route = { pattern = "staging.buildbarguna.com", zone_name = "buildbarguna.com" }

# Deploy to staging
npx wrangler deploy --env staging
```

## Rollback

If PWA causes issues:

### Quick Rollback via Dashboard
1. Go to Cloudflare Dashboard → Workers → buildbarga-worker
2. Click "Versions"
3. Select previous version
4. Click "Deploy"

### Rollback via Wrangler
```bash
# List versions
npx wrangler rollback

# Rollback to specific version
npx wrangler rollback --version <VERSION_ID>
```

## Troubleshooting

### Service Worker Not Registering

**Check browser console for errors:**
```
Service Worker registration failed: <error>
```

**Common issues:**
- HTTPS not enabled (required for service workers)
- Service worker script not found at `/sw.js`
- MIME type incorrect

**Fix:**
```bash
# Rebuild frontend
npm run build:pwa

# Verify sw.js exists in dist/
ls dist/sw.js

# Redeploy
npx wrangler deploy
```

### Manifest Not Loading

**Check:**
1. Manifest linked in HTML: `<link rel="manifest" href="/manifest.json">`
2. Manifest accessible: `curl https://your-domain.com/manifest.json`
3. Correct MIME type: `application/manifest+json`

**Fix:**
```bash
# Check manifest in build output
cat dist/manifest.json

# Verify Content-Type header
curl -I https://your-domain.com/manifest.json
```

### Icons Not Displaying

**Check:**
1. Icon files exist in `public/` directory
2. Paths in manifest.json are correct
3. Icons are accessible sizes (192x192, 512x512)

**Fix:**
```bash
# List icon files
ls public/*icon* public/logo.png

# Rebuild to include assets
npm run build:pwa
```

### Cache Issues After Update

**Force cache clear:**
1. Open DevTools
2. Application tab → Service Workers
3. Click "Unregister"
4. Clear storage
5. Reload page

**Or use cache-busting:**
```bash
# Update version in wrangler.toml
# This forces new cache namespace
```

## iOS-Specific Testing

After deployment, test on iOS:

1. **Open in Safari** on iPhone/iPad
2. **Tap Share** → **Add to Home Screen**
3. **Verify:**
   - App icon displays correctly
   - App launches in fullscreen
   - Splash screen shows on launch
   - Offline mode works

## Monitoring

### Cloudflare Analytics

Monitor PWA performance:
1. Cloudflare Dashboard → Workers → Analytics
2. Check cache hit ratio
3. Monitor response times

### Service Worker Logs

```javascript
// Add to service worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    console.log('SW Message:', event.data);
  });
}
```

## Next Steps After Deployment

1. ✅ Update documentation with deployment URL
2. ✅ Test on actual iOS devices
3. ✅ Monitor error logs for first 24 hours
4. ✅ Gather user feedback on installation experience
5. ✅ Consider push notifications (requires native app)
