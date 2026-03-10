# iOS PWA Assets Generation Guide

This guide explains how to generate proper iOS PWA assets (icons and splash screens) for the বিল্ড বরগুনা app.

## Current Status

✅ **Production-ready assets have been generated** using the existing logo (`logo.png`) with the app's brand color (#15803d green) background.

### Generated Assets

**Apple Touch Icons:**
- `apple-touch-icon-180x180.png` - iPhone (iOS 14+)
- `apple-touch-icon-167x167.png` - iPad Pro 10.5"
- `apple-touch-icon-152x152.png` - iPad (iOS 10+)
- `apple-touch-icon-120x120.png` - iPhone (iOS 10-13)

**Splash Screens:**
- `splash-2048x2732.png` - iPad Pro 12.9"
- `splash-1668x2224.png` - iPad Pro 11"
- `splash-1536x2048.png` - iPad 9.7"
- `splash-1242x2688.png` - iPhone 11 Pro Max/XS Max
- `splash-1125x2436.png` - iPhone 11 Pro/XS/X
- `splash-828x1792.png` - iPhone 11/XR
- `splash-750x1334.png` - iPhone 8/7/6s/6
- `splash-640x1136.png` - iPhone SE (1st gen)

### Asset Specifications

- **Logo**: 640x640px PNG (existing `logo.png`)
- **Background**: #15803d (green - matches app branding)
- **Format**: PNG with sRGB color profile
- **Logo Placement**: Centered on all assets

## Regenerating Assets (If Needed)

If you need to regenerate assets with a new logo, use ImageMagick:

```bash
# Install ImageMagick: brew install imagemagick (macOS)

cd frontend/public

# Generate Apple touch icons
magick logo.png -resize 180x180 -background "#15803d" -gravity center -extent 180x180 apple-touch-icon-180x180.png
magick logo.png -resize 167x167 -background "#15803d" -gravity center -extent 167x167 apple-touch-icon-167x167.png
magick logo.png -resize 152x152 -background "#15803d" -gravity center -extent 152x152 apple-touch-icon-152x152.png
magick logo.png -resize 120x120 -background "#15803d" -gravity center -extent 120x120 apple-touch-icon-120x120.png

# Generate splash screens
magick -size 2048x2732 xc:#15803d -gravity center logo.png -resize 300x300 -composite splash-2048x2732.png
magick -size 1668x2224 xc:#15803d -gravity center logo.png -resize 250x250 -composite splash-1668x2224.png
magick -size 1536x2048 xc:#15803d -gravity center logo.png -resize 230x230 -composite splash-1536x2048.png
magick -size 1242x2688 xc:#15803d -gravity center logo.png -resize 200x200 -composite splash-1242x2688.png
magick -size 1125x2436 xc:#15803d -gravity center logo.png -resize 180x180 -composite splash-1125x2436.png
magick -size 828x1792 xc:#15803d -gravity center logo.png -resize 150x150 -composite splash-828x1792.png
magick -size 750x1334 xc:#15803d -gravity center logo.png -resize 140x140 -composite splash-750x1334.png
magick -size 640x1136 xc:#15803d -gravity center logo.png -resize 120x120 -composite splash-640x1136.png
```
