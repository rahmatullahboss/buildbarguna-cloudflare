import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err } from '../lib/response'
import { uploadToR2, deleteFromR2 } from '../lib/r2'
import type { Bindings, Variables } from '../types'

export const uploadRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

uploadRoutes.use('*', authMiddleware)
uploadRoutes.use('*', adminMiddleware)

const ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif']
const MAX_SIZE = 2 * 1024 * 1024 // 2MB after compression

uploadRoutes.post('/image', async (c) => {
  // Validate native R2 binding
  if (!c.env.FILES) {
    return err(c, 'R2 bucket not configured — FILES binding missing', 500)
  }
  if (!c.env.R2_PUBLIC_URL) {
    return err(c, 'R2_PUBLIC_URL secret not set', 500)
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

  // Generate unique key: projects/{timestamp}-{random}.ext
  const ext = file.type.split('/')[1]
  const key = `projects/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

  const buffer = await file.arrayBuffer()
  const publicUrl = await uploadToR2(c.env.FILES, key, buffer, file.type, c.env.R2_PUBLIC_URL)

  return ok(c, { url: publicUrl, key }, 201)
})

// DELETE /upload/image?key=projects/abc123.webp
uploadRoutes.delete('/image', async (c) => {
  if (!c.env.FILES) {
    return err(c, 'R2 bucket not configured', 500)
  }

  const key = c.req.query('key')
  if (!key) return err(c, 'key parameter required')
  
  // Security: only allow deleting from projects/ folder
  if (!key.startsWith('projects/')) {
    return err(c, 'Only project images can be deleted', 403)
  }

  await deleteFromR2(c.env.FILES, key)
  return ok(c, { deleted: key })
})
