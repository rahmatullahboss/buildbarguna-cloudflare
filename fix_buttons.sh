files=$(find buildbarguna-cloudflare/frontend/src/pages -type f -name "*.tsx" | xargs grep -l ">✕<")
for file in $files; do
  echo "Checking $file"
done
