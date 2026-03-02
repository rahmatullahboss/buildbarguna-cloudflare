/**
 * R2 upload via S3-compatible API using AWS Signature V4
 * Uses only Web Crypto API + fetch — no npm packages needed
 * Works natively in Cloudflare Workers runtime
 */

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
}

function getConfig(env: { R2_ACCOUNT_ID: string; R2_ACCESS_KEY_ID: string; R2_SECRET_ACCESS_KEY: string; R2_BUCKET_NAME: string }): R2Config {
  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME
  }
}

async function hmacSHA256(key: ArrayBuffer | Uint8Array | string, data: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder()
  const keyBuf: ArrayBuffer = typeof key === 'string'
    ? enc.encode(key).buffer as ArrayBuffer
    : key instanceof Uint8Array
      ? key.buffer as ArrayBuffer
      : key
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  return crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data))
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(data: ArrayBuffer | string): Promise<string> {
  const enc = new TextEncoder()
  const buf = typeof data === 'string' ? enc.encode(data) : data
  return bufToHex(await crypto.subtle.digest('SHA-256', buf))
}

async function getSigningKey(secretKey: string, date: string, region: string, service: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder()
  const kDate = await hmacSHA256(enc.encode(`AWS4${secretKey}`), date)
  const kRegion = await hmacSHA256(kDate, region)
  const kService = await hmacSHA256(kRegion, service)
  return hmacSHA256(kService, 'aws4_request')
}

export async function uploadToR2(
  env: { R2_ACCOUNT_ID: string; R2_ACCESS_KEY_ID: string; R2_SECRET_ACCESS_KEY: string; R2_BUCKET_NAME: string; R2_PUBLIC_URL: string },
  key: string,
  body: ArrayBuffer,
  contentType: string
): Promise<string> {
  const cfg = getConfig(env)
  const region = 'auto'
  const service = 's3'
  const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com`
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const dateStamp = amzDate.slice(0, 8)

  const payloadHash = await sha256Hex(body)
  const canonicalUri = `/${cfg.bucketName}/${key}`
  const canonicalQueryString = ''
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = [
    'PUT', canonicalUri, canonicalQueryString,
    canonicalHeaders, signedHeaders, payloadHash
  ].join('\n')

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256', amzDate, credentialScope,
    await sha256Hex(canonicalRequest)
  ].join('\n')

  const signingKey = await getSigningKey(cfg.secretAccessKey, dateStamp, region, service)
  const signature = bufToHex(await hmacSHA256(signingKey, stringToSign))

  const authHeader = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(`${endpoint}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Host': host,
      'X-Amz-Content-Sha256': payloadHash,
      'X-Amz-Date': amzDate,
      'Authorization': authHeader
    },
    body
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`R2 upload failed: ${res.status} ${text}`)
  }

  // Return the public URL
  return `${env.R2_PUBLIC_URL}/${key}`
}
