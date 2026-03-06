#!/bin/bash

# BuildBarguna R2 App Upload Script
# Uploads APK files to R2 bucket without conflicts

set -e

BUCKET_NAME="${R2_BUCKET_NAME:-buildbarguna}"
APK_PATH="${1:-frontend/dist-app/app-release.apk}"
APK_NAME="${2:-buildbarguna-latest-release.apk}"

echo "📦 R2 App Upload Script"
echo "======================="
echo ""

# Check if APK file exists
if [ ! -f "$APK_PATH" ]; then
  echo "❌ Error: APK file not found at $APK_PATH"
  echo ""
  echo "Available APK files:"
  find frontend -name "*.apk" 2>/dev/null || echo "  (no APK files found)"
  exit 1
fi

# Get file size
FILE_SIZE=$(du -h "$APK_PATH" | cut -f1)
echo "✅ APK file found: $APK_PATH ($FILE_SIZE)"
echo ""

# Upload to R2 using wrangler
echo "📤 Uploading to R2 bucket: $BUCKET_NAME"
echo "   Destination: builds/android/$APK_NAME"
echo ""

# Delete old file first to avoid conflicts
echo "🗑️  Removing old file (if exists)..."
npx wrangler r2 object delete "$BUCKET_NAME/builds/android/$APK_NAME" 2>/dev/null || echo "   (no old file to delete)"

# Also remove 'latest' symlink target
npx wrangler r2 object delete "$BUCKET_NAME/builds/android/buildbarguna-latest-debug.apk" 2>/dev/null || true

# Upload new file
echo "⬆️  Uploading new file..."
npx wrangler r2 object put "$BUCKET_NAME/builds/android/$APK_NAME" --file="$APK_PATH"

echo ""
echo "✅ Upload complete!"
echo ""
echo "📊 File info:"
echo "   Bucket: $BUCKET_NAME"
echo "   Path: builds/android/$APK_NAME"
echo "   Size: $FILE_SIZE"
echo ""
echo "🔗 Download URL:"
echo "   https://$BUCKET_NAME.r2.cloudflarestorage.com/builds/android/$APK_NAME"
echo ""
echo "💡 To download via Worker:"
echo "   GET /api/download/app"
echo ""
