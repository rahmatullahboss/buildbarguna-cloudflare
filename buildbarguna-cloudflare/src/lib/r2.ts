/**
 * R2 upload/delete via native Cloudflare R2 binding (FILES)
 * No S3 API credentials needed — uses Workers runtime binding directly
 * Much simpler, faster, and free of external API calls
 */

/**
 * Upload a file to R2 using the native binding
 * @param bucket  - R2Bucket binding (env.FILES)
 * @param key     - object key e.g. "projects/abc123.webp"
 * @param body    - file content as ArrayBuffer
 * @param contentType - MIME type e.g. "image/webp"
 * @param publicUrl - R2 public bucket URL (env.R2_PUBLIC_URL)
 * @returns public URL of the uploaded file
 */
export async function uploadToR2(
  bucket: R2Bucket,
  key: string,
  body: ArrayBuffer,
  contentType: string,
  publicUrl: string
): Promise<string> {
  await bucket.put(key, body, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000', // 1 year cache
    },
    customMetadata: {
      uploadedAt: new Date().toISOString(),
    },
  })

  return `${publicUrl}/${key}`
}

/**
 * Delete a file from R2
 * @param bucket - R2Bucket binding (env.FILES)
 * @param key    - object key to delete
 */
export async function deleteFromR2(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key)
}

/**
 * Check if a file exists in R2
 * @param bucket - R2Bucket binding (env.FILES)
 * @param key    - object key to check
 */
export async function existsInR2(bucket: R2Bucket, key: string): Promise<boolean> {
  const obj = await bucket.head(key)
  return obj !== null
}

/**
 * Get a file from R2
 * @param bucket - R2Bucket binding (env.FILES)
 * @param key    - object key to retrieve
 */
export async function getFromR2(bucket: R2Bucket, key: string): Promise<R2ObjectBody | null> {
  return bucket.get(key)
}
