import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { ok, err } from '../lib/response'
import type { Bindings, Variables } from '../types'

export const projectUpdatesRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ─── PUBLIC: List updates for a project ──────────────────────────────────────

projectUpdatesRoutes.get('/:projectId/updates', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1'))
  const limit = Math.min(50, parseInt(c.req.query('limit') ?? '20'))
  const offset = (page - 1) * limit

  const rows = await c.env.DB.prepare(
    `SELECT pu.id, pu.title, pu.content, pu.image_url, pu.created_at, u.name as author_name
     FROM project_updates pu
     JOIN users u ON u.id = pu.created_by
     WHERE pu.project_id = ?
     ORDER BY pu.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(projectId, limit, offset).all()

  return ok(c, rows.results)
})

// ─── ADMIN: Full CRUD for project updates ────────────────────────────────────

const updateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal(''))
})

// GET /api/admin/project-updates/:projectId — list all updates for a project
projectUpdatesRoutes.get('/admin/:projectId', authMiddleware, adminMiddleware, async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const rows = await c.env.DB.prepare(
    `SELECT pu.id, pu.title, pu.content, pu.image_url, pu.created_at, pu.updated_at, u.name as author_name
     FROM project_updates pu
     JOIN users u ON u.id = pu.created_by
     WHERE pu.project_id = ?
     ORDER BY pu.created_at DESC`
  ).bind(projectId).all()

  return ok(c, rows.results)
})

// POST /api/admin/project-updates/:projectId — create update
projectUpdatesRoutes.post('/admin/:projectId', authMiddleware, adminMiddleware, zValidator('json', updateSchema), async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const body = c.req.valid('json')
  const adminId = c.get('userId')

  // Verify project exists
  const project = await c.env.DB.prepare('SELECT id FROM projects WHERE id = ?').bind(projectId).first<{ id: number }>()
  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  const result = await c.env.DB.prepare(
    `INSERT INTO project_updates (project_id, title, content, image_url, created_by)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(projectId, body.title, body.content ?? null, body.image_url || null, adminId).run()

  return ok(c, { message: 'আপডেট পোস্ট করা হয়েছে', id: result.meta.last_row_id }, 201)
})

// PUT /api/admin/project-updates/entry/:id — edit an update
projectUpdatesRoutes.put('/admin/entry/:id', authMiddleware, adminMiddleware, zValidator('json', updateSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  const body = c.req.valid('json')
  const fields: string[] = []
  const values: unknown[] = []

  if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title) }
  if (body.content !== undefined) { fields.push('content = ?'); values.push(body.content) }
  if (body.image_url !== undefined) { fields.push('image_url = ?'); values.push(body.image_url || null) }

  if (fields.length === 0) return err(c, 'কোনো পরিবর্তন নেই')

  await c.env.DB.prepare(
    `UPDATE project_updates SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`
  ).bind(...values, id).run()

  return ok(c, { message: 'আপডেট সম্পাদনা হয়েছে' })
})

// DELETE /api/admin/project-updates/entry/:id — delete update
projectUpdatesRoutes.delete('/admin/entry/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  const result = await c.env.DB.prepare('DELETE FROM project_updates WHERE id = ?').bind(id).run()
  if (!result.meta.changes) return err(c, 'আপডেট পাওয়া যায়নি', 404)
  return ok(c, { message: 'আপডেট মুছে ফেলা হয়েছে' })
})

// ─── ADMIN: Project Gallery ────────────────────────────────────────────────────

const gallerySchema = z.object({
  image_url: z.string().url(),
  caption: z.string().max(200).optional(),
  sort_order: z.number().int().min(0).optional()
})

// GET /api/admin/project-updates/gallery/:projectId — list gallery for a project
projectUpdatesRoutes.get('/admin/gallery/:projectId', authMiddleware, adminMiddleware, async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const rows = await c.env.DB.prepare(
    'SELECT * FROM project_gallery WHERE project_id = ? ORDER BY sort_order ASC, created_at DESC'
  ).bind(projectId).all()

  return ok(c, rows.results)
})

// POST /api/project-data/admin/gallery/:projectId — add gallery image
projectUpdatesRoutes.post('/admin/gallery/:projectId', authMiddleware, adminMiddleware, zValidator('json', gallerySchema), async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  // F2: Verify project exists before inserting gallery image
  const project = await c.env.DB.prepare('SELECT id FROM projects WHERE id = ?').bind(projectId).first<{ id: number }>()
  if (!project) return err(c, 'প্রজেক্ট পাওয়া যায়নি', 404)

  const body = c.req.valid('json')
  const result = await c.env.DB.prepare(
    'INSERT INTO project_gallery (project_id, image_url, caption, sort_order) VALUES (?, ?, ?, ?)'
  ).bind(projectId, body.image_url, body.caption ?? null, body.sort_order ?? 0).run()

  return ok(c, { message: 'ছবি যোগ করা হয়েছে', id: result.meta.last_row_id }, 201)
})

// DELETE /api/admin/project-updates/gallery/entry/:id — delete gallery image
projectUpdatesRoutes.delete('/admin/gallery/entry/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return err(c, 'অকার্যকর আইডি')

  const result = await c.env.DB.prepare('DELETE FROM project_gallery WHERE id = ?').bind(id).run()
  if (!result.meta.changes) return err(c, 'ছবি পাওয়া যায়নি', 404)
  return ok(c, { message: 'ছবি মুছে ফেলা হয়েছে' })
})

// Public gallery endpoint
projectUpdatesRoutes.get('/:projectId/gallery', async (c) => {
  const projectId = parseInt(c.req.param('projectId'))
  if (isNaN(projectId)) return err(c, 'অকার্যকর প্রজেক্ট আইডি')

  const rows = await c.env.DB.prepare(
    'SELECT id, image_url, caption, sort_order FROM project_gallery WHERE project_id = ? ORDER BY sort_order ASC'
  ).bind(projectId).all()

  return ok(c, rows.results)
})
