import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err } from '../lib/response'
import { uploadToR2 } from '../lib/r2'
import type { Bindings, Variables } from '../types'

export const uploadRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

uploadRoutes.use('*', authMiddleware)
uploadRoutes.use('*', adminMiddleware)

const ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif']
const MAX_SIZE = 2 * 1024 * 1024 // 2MB after compression

uploadRoutes.post('/image', async (c) => {
  // Validate R2 config
  const env = c.env as any
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME) {
    return err(c, 'R2 configuration missing — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME secrets', 500)
  }

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null

  if (!file) return err(c, 'ফাইল পাওয়া যায়নি')
  if (!ALLOWED_TYPES.includes(file.type)) {
    return err(c, `শুধুমাত্র ${ALLOWED_TYPES.join(', ')} ফরম্যাট গ্রহণযোগ্য`)
  }
  if (file.size > MAX_SIZE) {
    return err(c, `ফাইলের সাইজ সর্বোচ্চ ${MAX_SIZE / 1024 / 1024}MB হতে পারবে`)
  }

  // Generate unique key: projects/{timestamp}-{random}.webp
  const ext = file.type.split('/')[1]
  const key = `projects/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

  const buffer = await file.arrayBuffer()
  const publicUrl = await uploadToR2(env, key, buffer, file.type)

  return ok(c, { url: publicUrl, key }, 201)
})
